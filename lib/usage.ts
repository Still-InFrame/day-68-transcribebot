import { cookies } from "next/headers";
import { supabaseServer } from "./supabase/server";

export const ANON_CAP_SEC = 180;
export const USER_CAP_SEC = 900;
export const ANON_SESSIONS_PER_DAY = 3;
export const USER_MINUTES_PER_DAY = 60;

export type UsageToday = {
  actor_minutes: number;
  actor_sessions: number;
  global_minutes: number;
};

// Identity for rate limiting: signed-in user id, else a long-lived anon
// cookie. Cookie-clearing dodges the anon cap, but the global daily budget
// backstops the worst case — accepted for challenge scale.
export async function resolveActor() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { supabase, user, actor: `u:${user.id}` };

  const store = await cookies();
  let anon = store.get("tb_anon")?.value;
  if (!anon || !/^[0-9a-f-]{36}$/.test(anon)) {
    anon = crypto.randomUUID();
    try {
      store.set("tb_anon", anon, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    } catch {
      // cookies() is read-only outside route handlers; all callers are routes
    }
  }
  return { supabase, user: null, actor: `a:${anon}` };
}

export async function usageToday(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  actor: string,
): Promise<UsageToday> {
  const { data, error } = await supabase
    .rpc("transcribebot_usage_today", { p_actor: actor })
    .single();
  if (error || !data) return { actor_minutes: 0, actor_sessions: 0, global_minutes: 0 };
  const row = data as UsageToday;
  return {
    actor_minutes: Number(row.actor_minutes),
    actor_sessions: Number(row.actor_sessions),
    global_minutes: Number(row.global_minutes),
  };
}
