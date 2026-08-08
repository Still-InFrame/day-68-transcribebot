"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import Link from "next/link";
import { DEMO_OUTS, DEMO_LATENCIES, SOURCES_EN, SOURCES_ES } from "./demoScript";

// Scripted replay of REAL session output (see demoScript.ts provenance).
// Follows the headline's active language; word pulses drive the hero orb
// through `envelope`.

type Shown = { src: string; outWords: string[]; shownWords: number };

export default function ReplayDemo({
  lang,
  envelope,
}: {
  lang: string;
  envelope: MutableRefObject<() => number>;
}) {
  const [shown, setShown] = useState<Shown[]>([]);
  const [latency, setLatency] = useState("0.8");
  const pulse = useRef<{ t: number; amp: number }>({ t: 0, amp: 0 });
  const speaking = useRef(false);

  const outs = DEMO_OUTS[lang] ?? DEMO_OUTS.en;
  // The model is silent when target == source, so Español flips direction.
  const srcs = lang === "es" ? SOURCES_EN : SOURCES_ES;
  const rtl = lang === "ar";
  // CJK scripts don't space-separate words; stream by character instead.
  const splitWords = (s: string) =>
    ["ja", "zh"].includes(lang) ? Array.from(s) : s.split(" ");

  useEffect(() => {
    envelope.current = () => {
      const dt = performance.now() - pulse.current.t;
      const p = pulse.current.amp * Math.exp(-dt / 260);
      return (speaking.current ? 0.14 : 0.02) + p;
    };
  }, [envelope]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(
        outs.slice(0, 2).map((out, i) => ({
          src: srcs[i],
          outWords: splitWords(out),
          shownWords: splitWords(out).length,
        })),
      );
      return;
    }

    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    async function run() {
      while (!cancelled) {
        setShown([]);
        await sleep(700);
        for (let i = 0; i < outs.length; i++) {
          if (cancelled) return;
          const words = splitWords(outs[i]);
          const perWord = ["ja", "zh"].includes(lang) ? 70 : 130;
          setLatency(DEMO_LATENCIES[i]);
          speaking.current = true;
          setShown((prev) => [...prev.slice(-1), { src: srcs[i], outWords: words, shownWords: 0 }]);
          await sleep(450);
          for (let w = 1; w <= words.length; w++) {
            if (cancelled) return;
            pulse.current = { t: performance.now(), amp: 0.45 + Math.random() * 0.4 };
            setShown((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last) next[next.length - 1] = { ...last, shownWords: w };
              return next;
            });
            await sleep(perWord + Math.random() * perWord);
          }
          speaking.current = false;
          await sleep(650);
        }
        await sleep(1800);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const joiner = ["ja", "zh"].includes(lang) ? "" : " ";

  return (
    <div className="glass rounded-2xl p-5 w-full max-w-xl">
      <div className="flex items-center gap-2 text-xs text-muted pb-3">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Demo replay — real session output
        <span className="flex-1" />
        <span className="tabular-nums">≈{latency}s behind speaker</span>
      </div>
      <div className="space-y-4 min-h-36">
        {shown.map((l, i) => (
          <div key={`${lang}-${l.src}-${i}`}>
            <p className="text-xs text-muted mb-1">{l.src}</p>
            <p
              className="text-lg font-medium leading-snug"
              lang={lang}
              dir={rtl ? "rtl" : "ltr"}
            >
              {l.outWords.slice(0, l.shownWords).join(joiner)}
              {l.shownWords < l.outWords.length && (
                <span className="inline-block w-1.5 h-4 mx-1 align-middle bg-aurora-cyan/70 rounded-sm" />
              )}
            </p>
          </div>
        ))}
      </div>
      <div className="pt-4">
        <Link
          href="/app"
          className="inline-block rounded-full px-6 py-2.5 font-semibold text-sm bg-gradient-to-r from-aurora-violet via-aurora-cyan to-aurora-magenta text-black hover:opacity-90 transition"
        >
          Try it with your voice — free
        </Link>
      </div>
    </div>
  );
}
