import { NextResponse } from "next/server";
import {
  ANON_SESSIONS_PER_DAY,
  USER_MINUTES_PER_DAY,
  resolveActor,
  usageToday,
} from "@/lib/usage";

export async function GET() {
  const { supabase, user, actor } = await resolveActor();
  const usage = await usageToday(supabase, actor);
  return NextResponse.json({
    signedIn: Boolean(user),
    email: user?.email ?? null,
    minutesToday: usage.actor_minutes,
    sessionsToday: usage.actor_sessions,
    capMinutes: user ? USER_MINUTES_PER_DAY : null,
    anonSessionsLeft: user
      ? null
      : Math.max(0, ANON_SESSIONS_PER_DAY - usage.actor_sessions),
  });
}
