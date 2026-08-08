"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { OUTPUT_LANGUAGES } from "@/lib/languages";

type RoomLine = { id: number; text: string; source: string; ts: number };

// Audience view: scan the QR, pick YOUR language, read along. No account,
// no mic — just captions streaming in.
export default function RoomViewer({ code }: { code: string }) {
  const [lang, setLang] = useState<string | null>(null);
  const [lines, setLines] = useState<RoomLine[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lang) return;
    const supabase = supabaseBrowser();
    // Tell the relay to start translating into this language. NOTE: supabase
    // query builders are lazy thenables — without .then() the request is
    // never sent (bit us: rooms had zero requested languages).
    void supabase
      .rpc("transcribebot_room_request_lang", { p_code: code, p_lang: lang })
      .then(
        () => {},
        () => {},
      );

    const channel = supabase
      .channel(`room:${code}:${lang}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "line" }, ({ payload }) => {
        const p = payload as RoomLine;
        setLines((prev) => [...prev.slice(-80), p]);
      })
      .subscribe();
    channelRef.current = channel;
    setLines([]);
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, lang]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  if (!lang) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-6">
        <p className="text-sm text-muted tracking-widest uppercase">Room {code}</p>
        <h1 className="text-2xl font-semibold text-center">Read this talk in your language</h1>
        <div className="flex flex-wrap justify-center gap-2 max-w-md">
          {OUTPUT_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className="glass rounded-full px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              {l.flag} {l.native}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">Captions stream live once the speaker talks.</p>
      </main>
    );
  }

  const rtl = lang === "ar";

  return (
    <main className="h-dvh flex flex-col px-5 py-4 max-w-2xl mx-auto">
      <header className="flex items-center gap-3 pb-3 text-sm">
        <span className="text-muted tracking-widest">ROOM {code}</span>
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <div className="flex-1" />
        <button onClick={() => setLang(null)} className="glass rounded-lg px-3 py-1.5 hover:bg-white/10">
          {OUTPUT_LANGUAGES.find((l) => l.code === lang)?.flag} Change
        </button>
      </header>
      <div ref={boxRef} className="flex-1 overflow-y-auto space-y-5 py-4 scroll-smooth">
        {lines.length === 0 && (
          <p className="text-muted text-center pt-20 text-sm">
            Waiting for the speaker — captions appear here live.
          </p>
        )}
        {lines.map((l) => (
          <p
            key={`${l.id}-${l.ts}`}
            lang={lang}
            dir={rtl ? "rtl" : "ltr"}
            className="text-2xl leading-snug font-medium caption-final"
          >
            {l.text}
          </p>
        ))}
      </div>
      <footer className="pt-3 text-center">
        <Link href="/" className="text-xs text-muted hover:text-foreground transition">
          Live translation by Transcribe<span className="aurora-text">Bot</span> — translate your own voice free →
        </Link>
      </footer>
    </main>
  );
}
