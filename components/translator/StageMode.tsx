"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptionLine } from "@/lib/realtime/segmenter";

// Full-screen caption display for rooms: projector, second screen, phone held
// up. Wake lock keeps the display alive; mirror mode supports teleprompter
// glass and rear projection.
export default function StageMode({
  lines,
  partialSource,
  partialTranslated,
  onExit,
}: {
  lines: CaptionLine[];
  partialSource: string;
  partialTranslated: string;
  onExit: () => void;
}) {
  const [fontScale, setFontScale] = useState(1.4);
  const [bilingual, setBilingual] = useState(true);
  const [contrast, setContrast] = useState(false);
  const [mirror, setMirror] = useState(false);
  const wakeRef = useRef<{ release(): Promise<void> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> };
        };
        if (nav.wakeLock && !cancelled) {
          wakeRef.current = await nav.wakeLock.request("screen");
        }
      } catch {
        // wake lock is best-effort (unsupported browsers, low battery)
      }
    }
    acquire();
    const revive = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", revive);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", revive);
      wakeRef.current?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onExit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const recent = lines.slice(-3);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${contrast ? "bg-black" : "bg-background"}`}
    >
      <div className="flex items-center gap-2 p-3 justify-end text-sm">
        <label className="glass rounded-lg px-3 py-1.5 flex items-center gap-2">
          A
          <input
            type="range"
            min={1}
            max={2.6}
            step={0.1}
            value={fontScale}
            onChange={(e) => setFontScale(Number(e.target.value))}
            aria-label="Caption size"
          />
          <span className="text-lg">A</span>
        </label>
        <button
          className={`glass rounded-lg px-3 py-1.5 ${bilingual ? "text-foreground" : "text-muted"}`}
          onClick={() => setBilingual((b) => !b)}
        >
          Bilingual
        </button>
        <button
          className={`glass rounded-lg px-3 py-1.5 ${contrast ? "text-foreground" : "text-muted"}`}
          onClick={() => setContrast((c) => !c)}
        >
          High contrast
        </button>
        <button
          className={`glass rounded-lg px-3 py-1.5 ${mirror ? "text-foreground" : "text-muted"}`}
          onClick={() => setMirror((m) => !m)}
        >
          Mirror
        </button>
        <button className="glass rounded-lg px-3 py-1.5 hover:bg-white/10" onClick={onExit}>
          Exit ✕
        </button>
      </div>

      <div
        className="flex-1 flex flex-col justify-end px-[6vw] pb-[8vh] space-y-6 overflow-hidden"
        style={{ transform: mirror ? "scaleX(-1)" : undefined }}
      >
        {recent.map((l, i) => (
          <div key={l.id} style={{ opacity: 0.45 + (i / recent.length) * 0.55 }}>
            {bilingual && l.source && (
              <p className="text-muted mb-1" style={{ fontSize: `${fontScale * 1.1}rem` }}>
                {l.source}
              </p>
            )}
            <p
              className={`font-semibold leading-tight ${contrast ? "text-white" : ""}`}
              style={{ fontSize: `${fontScale * 2.2}rem` }}
            >
              {l.translated}
            </p>
          </div>
        ))}
        {(partialTranslated || partialSource) && (
          <div className="caption-partial">
            {bilingual && partialSource && (
              <p className="text-muted mb-1" style={{ fontSize: `${fontScale * 1.1}rem` }}>
                {partialSource}
              </p>
            )}
            <p
              className={`font-semibold leading-tight ${contrast ? "text-white" : "text-foreground/80"}`}
              style={{ fontSize: `${fontScale * 2.2}rem` }}
            >
              {partialTranslated}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
