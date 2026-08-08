import { NextResponse } from "next/server";
import { isOutputLang } from "@/lib/languages";
import {
  ANON_CAP_SEC,
  ANON_SESSIONS_PER_DAY,
  USER_CAP_SEC,
  USER_MINUTES_PER_DAY,
  resolveActor,
  usageToday,
} from "@/lib/usage";

// The single choke point for OpenAI spend: every realtime session starts by
// minting an ephemeral secret here, so every cap lives here too.
export async function POST(req: Request) {
  const { targetLang } = await req.json().catch(() => ({}) as { targetLang?: string });
  if (typeof targetLang !== "string" || !isOutputLang(targetLang)) {
    return NextResponse.json({ error: "unsupported_language" }, { status: 400 });
  }

  const { supabase, user, actor } = await resolveActor();
  const usage = await usageToday(supabase, actor);

  const budget = Number(process.env.DAILY_BUDGET_MINUTES ?? 300);
  if (usage.global_minutes >= budget) {
    return NextResponse.json({ error: "budget_exhausted" }, { status: 503 });
  }
  if (!user && usage.actor_sessions >= ANON_SESSIONS_PER_DAY) {
    return NextResponse.json({ error: "anon_limit" }, { status: 429 });
  }
  if (user && usage.actor_minutes >= USER_MINUTES_PER_DAY) {
    return NextResponse.json({ error: "daily_limit" }, { status: 429 });
  }

  const r = await fetch("https://api.openai.com/v1/realtime/translations/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        model: "gpt-realtime-translate",
        audio: {
          // Source-language captions require explicitly enabling input
          // transcription. Full (non-mini) model: noticeably better on
          // accents/mic noise for ~fractions of a cent per minute more.
          input: { transcription: { model: "gpt-4o-transcribe" } },
          output: { language: targetLang },
        },
      },
    }),
  });
  if (!r.ok) {
    return NextResponse.json({ error: "mint_failed" }, { status: 502 });
  }
  const { value } = await r.json();

  // p_minutes = 0 marks the session start (counts toward the session cap).
  await supabase.rpc("transcribebot_record_usage", { p_actor: actor, p_minutes: 0 });

  return NextResponse.json({
    value,
    capSec: user ? USER_CAP_SEC : ANON_CAP_SEC,
    signedIn: Boolean(user),
  });
}
