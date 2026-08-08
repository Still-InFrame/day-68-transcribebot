"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import Link from "next/link";

// Scripted replay of a REAL session (the P1 verification run, verbatim).
// Honestly labeled as a replay; zero API cost, zero mic permission. Word
// pulses drive the hero orb through `envelope`.

const SCRIPT = [
  { es: "Hola a todos, y bienvenidos a la demostración.", en: "Hello everyone, and welcome to the demonstration.", latency: "0.8" },
  { es: "Hoy vamos a hablar del futuro de la traducción en tiempo real.", en: "Today we're going to talk about the future of real-time translation.", latency: "0.7" },
  { es: "Esta aplicación convierte mi voz en subtítulos traducidos al instante.", en: "This app turns my voice into translated subtitles, instantly.", latency: "0.9" },
  { es: "Gracias por acompañarnos.", en: "Thanks for joining us.", latency: "0.6" },
];

type Shown = { es: string; enWords: string[]; shownWords: number };

export default function ReplayDemo({
  envelope,
}: {
  envelope: MutableRefObject<() => number>;
}) {
  const [shown, setShown] = useState<Shown[]>([]);
  const [latency, setLatency] = useState("0.8");
  const pulse = useRef<{ t: number; amp: number }>({ t: 0, amp: 0 });
  const speaking = useRef(false);

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
        SCRIPT.slice(0, 2).map((l) => ({
          es: l.es,
          enWords: l.en.split(" "),
          shownWords: l.en.split(" ").length,
        })),
      );
      return;
    }

    let cancelled = false;
    const sleep = (ms: number) =>
      new Promise<void>((r) => setTimeout(r, ms));

    async function run() {
      while (!cancelled) {
        setShown([]);
        await sleep(700);
        for (const line of SCRIPT) {
          if (cancelled) return;
          const words = line.en.split(" ");
          setLatency(line.latency);
          speaking.current = true;
          setShown((prev) => [...prev.slice(-1), { es: line.es, enWords: words, shownWords: 0 }]);
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
            await sleep(130 + Math.random() * 130);
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
  }, []);

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
          <div key={`${l.es}-${i}`}>
            <p className="text-xs text-muted mb-1">{l.es}</p>
            <p className="text-lg font-medium leading-snug">
              {l.enWords.slice(0, l.shownWords).join(" ")}
              {l.shownWords < l.enWords.length && (
                <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-aurora-cyan/70 rounded-sm" />
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
