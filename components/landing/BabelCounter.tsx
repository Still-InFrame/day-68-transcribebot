"use client";

import { useEffect, useRef, useState } from "react";

type Stats = { totalMinutes: number; totalSessions: number; languagesUsed: number };

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const t0 = performance.now();
    const dur = 1200;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular-nums">{display.toLocaleString()}</span>;
}

// Honest live numbers from day one — no fake logos, no invented testimonials.
export default function BabelCounter() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return <div className="h-28" aria-hidden />;

  const items = [
    { n: stats.totalMinutes, label: "minutes translated" },
    { n: stats.totalSessions, label: "live sessions" },
    { n: stats.languagesUsed, label: "languages bridged" },
  ];

  return (
    <section className="max-w-4xl mx-auto px-4 py-14">
      <div className="glass rounded-2xl px-6 py-8 grid grid-cols-3 gap-4 text-center">
        {items.map((i) => (
          <div key={i.label}>
            <p className="text-3xl sm:text-4xl font-semibold aurora-text">
              <CountUp value={i.n} />
            </p>
            <p className="text-xs sm:text-sm text-muted pt-1">{i.label}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted pt-3">
        Live counters since launch — day 68 of a 100-day build challenge.
      </p>
    </section>
  );
}
