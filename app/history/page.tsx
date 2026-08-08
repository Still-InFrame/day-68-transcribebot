import Link from "next/link";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import HistoryList, { type HistoryRow } from "@/components/HistoryList";

export const metadata: Metadata = { title: "TranscribeBot — History" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 space-y-4">
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-muted">Sign in on the translator page to save and revisit your sessions.</p>
        <Link href="/app" className="inline-block glass rounded-xl px-4 py-2 hover:bg-white/10">
          ← Back to the translator
        </Link>
      </main>
    );
  }

  const { data } = await supabase
    .from("transcribebot_sessions")
    .select("id, title, target_lang, duration_sec, created_at, lines")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold flex-1">History</h1>
        <Link href="/app" className="glass rounded-xl px-4 py-2 text-sm hover:bg-white/10">
          ← Translator
        </Link>
      </div>
      <HistoryList rows={(data ?? []) as HistoryRow[]} />
    </main>
  );
}
