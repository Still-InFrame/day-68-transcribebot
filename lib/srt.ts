import type { CaptionLine } from "./realtime/segmenter";

function srtTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const t = Math.floor(ms % 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(t, 3)}`;
}

export function toSrt(lines: CaptionLine[]): string {
  return lines
    .map(
      (l, i) =>
        `${i + 1}\n${srtTime(l.startMs)} --> ${srtTime(l.endMs)}\n${l.translated}\n`,
    )
    .join("\n");
}

export function toTxt(lines: CaptionLine[], sourceLabel = "source", targetLabel = "translation"): string {
  return lines
    .map((l) =>
      l.source
        ? `[${sourceLabel}] ${l.source}\n[${targetLabel}] ${l.translated}\n`
        : `[${targetLabel}] ${l.translated}\n`,
    )
    .join("\n");
}

export function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
