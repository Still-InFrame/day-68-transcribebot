import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Babel counter: honest aggregate numbers, cached at the edge for a minute.
export async function GET() {
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("transcribebot_stats").single();
  const row = (data ?? { total_minutes: 0, total_sessions: 0, languages_used: 1 }) as {
    total_minutes: number;
    total_sessions: number;
    languages_used: number;
  };
  return NextResponse.json(
    {
      totalMinutes: Math.round(Number(row.total_minutes)),
      totalSessions: Number(row.total_sessions),
      languagesUsed: Number(row.languages_used),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
