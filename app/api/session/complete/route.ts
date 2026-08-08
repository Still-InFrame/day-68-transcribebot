import { NextResponse } from "next/server";
import { isOutputLang } from "@/lib/languages";
import { ANON_CAP_SEC, USER_CAP_SEC, resolveActor } from "@/lib/usage";

type IncomingLine = {
  source?: unknown;
  translated?: unknown;
  startMs?: unknown;
  endMs?: unknown;
};

// Records real minutes against the daily budget and, for signed-in users,
// saves the transcript. Duration is client-reported but clamped to the cap —
// good enough for challenge scale (documented limitation).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    targetLang?: string;
    durationSec?: number;
    lines?: IncomingLine[];
  };

  const { supabase, user, actor } = await resolveActor();
  const capSec = user ? USER_CAP_SEC : ANON_CAP_SEC;
  const durationSec = Math.min(Math.max(Number(body.durationSec) || 0, 0), capSec + 15);

  if (durationSec >= 3) {
    const minutes = Math.round((durationSec / 60) * 100) / 100;
    await supabase.rpc("transcribebot_record_usage", { p_actor: actor, p_minutes: minutes });
  }

  let saved = false;
  const rawLines = Array.isArray(body.lines) ? body.lines.slice(0, 500) : [];
  if (user && rawLines.length > 0 && typeof body.targetLang === "string" && isOutputLang(body.targetLang)) {
    const lines = rawLines
      .map((l) => ({
        source: String(l.source ?? "").slice(0, 600),
        translated: String(l.translated ?? "").slice(0, 600),
        startMs: Math.max(0, Number(l.startMs) || 0),
        endMs: Math.max(0, Number(l.endMs) || 0),
      }))
      .filter((l) => l.translated.length > 0);
    if (lines.length > 0) {
      const title = lines[0].translated.slice(0, 60);
      const { error } = await supabase.from("transcribebot_sessions").insert({
        user_id: user.id,
        title,
        source_lang: "auto",
        target_lang: body.targetLang,
        duration_sec: Math.round(durationSec),
        lines,
      });
      saved = !error;
    }
  }

  return NextResponse.json({ saved });
}
