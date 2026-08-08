"use client";

import { useState } from "react";
import type { CaptionLine } from "@/lib/realtime/segmenter";
import { toSrt, toTxt, download } from "@/lib/srt";

export default function ExportMenu({ lines }: { lines: CaptionLine[] }) {
  const [copied, setCopied] = useState(false);
  const disabled = lines.length === 0;
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

  async function copy() {
    await navigator.clipboard.writeText(toTxt(lines));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const btn =
    "glass rounded-lg px-3 py-1.5 text-sm hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex gap-2" aria-label="Export transcript">
      <button className={btn} disabled={disabled} onClick={copy}>
        {copied ? "Copied ✓" : "Copy"}
      </button>
      <button
        className={btn}
        disabled={disabled}
        onClick={() => download(`transcribebot-${stamp()}.txt`, toTxt(lines))}
      >
        .txt
      </button>
      <button
        className={btn}
        disabled={disabled}
        onClick={() => download(`transcribebot-${stamp()}.srt`, toSrt(lines))}
      >
        .srt
      </button>
    </div>
  );
}
