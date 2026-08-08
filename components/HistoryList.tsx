"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { langByCode } from "@/lib/languages";
import { toTxt, download } from "@/lib/srt";
import type { CaptionLine } from "@/lib/realtime/segmenter";

export type HistoryRow = {
  id: string;
  title: string;
  target_lang: string;
  duration_sec: number;
  created_at: string;
  lines: CaptionLine[];
};

export default function HistoryList({ rows: initial }: { rows: HistoryRow[] }) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);

  async function remove(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
    await supabaseBrowser().from("transcribebot_sessions").delete().eq("id", id);
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted text-sm">
        No saved sessions yet — finish a translation session and it lands here automatically.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const lang = langByCode(r.target_lang);
        const when = new Date(r.created_at).toLocaleString(undefined, {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        });
        const expanded = open === r.id;
        return (
          <li key={r.id} className="glass rounded-2xl p-4">
            <button className="w-full text-left" onClick={() => setOpen(expanded ? null : r.id)}>
              <div className="flex items-baseline gap-3">
                <span className="font-medium flex-1 truncate">{r.title || "Untitled session"}</span>
                <span className="text-xs text-muted whitespace-nowrap">
                  {lang?.flag} {lang?.native} · {Math.round(r.duration_sec / 60)}m · {when}
                </span>
              </div>
            </button>
            {expanded && (
              <div className="mt-4 space-y-3">
                <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                  {r.lines.map((l, i) => (
                    <div key={i}>
                      {l.source && <p className="text-xs text-muted">{l.source}</p>}
                      <p className="text-sm">{l.translated}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    className="glass rounded-lg px-3 py-1.5 text-xs hover:bg-white/10"
                    onClick={() => download(`transcribebot-${r.id.slice(0, 8)}.txt`, toTxt(r.lines))}
                  >
                    Export .txt
                  </button>
                  <button
                    className="glass rounded-lg px-3 py-1.5 text-xs hover:bg-white/10 text-red-300"
                    onClick={() => remove(r.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
