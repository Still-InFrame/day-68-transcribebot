"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptionLine } from "@/lib/realtime/segmenter";

// Live caption feed: sticks to the newest line unless the reader scrolls up,
// then offers a "jump to live" pill (the YouTube-live-chat pattern).
export default function CaptionStream({
  lines,
  partialSource,
  partialTranslated,
  bilingual = true,
}: {
  lines: CaptionLine[];
  partialSource: string;
  partialTranslated: string;
  bilingual?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    const el = boxRef.current;
    if (el && pinned) el.scrollTop = el.scrollHeight;
  }, [lines, partialTranslated, partialSource, pinned]);

  function onScroll() {
    const el = boxRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setPinned(nearBottom);
  }

  const empty = lines.length === 0 && !partialTranslated && !partialSource;

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={boxRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto px-1 py-4 space-y-5 scroll-smooth"
        aria-live="polite"
      >
        {empty && (
          <p className="text-muted text-center pt-16 text-sm">
            Captions appear here the moment you speak.
          </p>
        )}
        {lines.map((l) => (
          <div key={l.id} className="caption-final">
            {bilingual && l.source && (
              <p className="text-sm text-muted mb-1">{l.source}</p>
            )}
            <p className="text-2xl leading-snug font-medium">{l.translated}</p>
          </div>
        ))}
        {(partialTranslated || partialSource) && (
          <div className="caption-partial">
            {bilingual && partialSource && (
              <p className="text-sm text-muted mb-1">{partialSource}</p>
            )}
            {partialTranslated && (
              <p className="text-2xl leading-snug font-medium text-foreground/80">
                {partialTranslated}
                <span className="inline-block w-2 h-6 ml-1 align-middle bg-aurora-cyan/70 rounded-sm" />
              </p>
            )}
          </div>
        )}
      </div>
      {!pinned && (
        <button
          onClick={() => {
            setPinned(true);
            const el = boxRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 glass rounded-full px-4 py-1.5 text-sm hover:bg-white/10 transition"
        >
          ↓ Jump to live
        </button>
      )}
    </div>
  );
}
