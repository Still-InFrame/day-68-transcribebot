// Turns the two raw delta streams into finalized bilingual caption lines.
//
// Observed behavior (spike, 2026-08-07):
// - output_transcript deltas stream word-by-word, carry server-audio-clock
//   `elapsed_ms`, and include sentence punctuation.
// - input_transcript deltas arrive in near-instant BURSTS of a whole sentence,
//   slightly AFTER the corresponding translation started streaming; elapsed_ms
//   is null on them.
// - There are no utterance-boundary events, so sentence punctuation + time gaps
//   are the only finalization signals.

export type CaptionLine = {
  id: number;
  source: string; // may attach after the translated line finalizes (input lags)
  translated: string;
  startMs: number;
  endMs: number;
};

export type SegmenterSnapshot = {
  lines: CaptionLine[];
  partialSource: string;
  partialTranslated: string;
};

const SENTENCE_END = /[.!?…。！？؟](["')\]»」』])?\s*$/;
// Natural pauses are measured on the server audio clock (elapsed_ms), which
// is steady; arrival times jitter up to ~1.4s mid-sentence and would shear
// sentences. Spike data: intra-sentence elapsed gaps ≤ ~800ms, sentence
// boundaries ≥ ~1200ms.
const OUTPUT_PAUSE_MS = 1100;
// Wall-clock stall guard: only fires when deltas stop entirely (reconnect,
// speech end without punctuation) — the case where elapsed_ms freezes.
const OUTPUT_STALL_MS = 3500;
const INPUT_GAP_MS = 900;

export class Segmenter {
  private lines: CaptionLine[] = [];
  private nextId = 1;

  private outText = "";
  private outStartMs = -1;
  private outLastMs = 0;
  // Gap detection runs on wall-clock arrival times: the server's elapsed_ms
  // freezes when deltas stop (e.g. during a reconnect), which is exactly when
  // a gap most needs to finalize the open line.
  private outLastWallMs = 0;

  private inText = "";
  private inLastMs = 0;

  // Source sentences waiting for their translated line, and vice versa.
  private pendingSources: string[] = [];

  pushOutput(delta: string, wallMs: number, elapsedMs: number | null) {
    const at = elapsedMs ?? wallMs;
    // A long audio-clock pause before this delta means the open text was a
    // complete (unpunctuated) sentence — close it before starting the next.
    if (this.outText !== "" && elapsedMs !== null && at - this.outLastMs > OUTPUT_PAUSE_MS) {
      this.finalizeOutput(this.outLastMs);
    }
    if (this.outText === "") this.outStartMs = at;
    this.outText += delta;
    this.outLastMs = at;
    this.outLastWallMs = wallMs;
    if (SENTENCE_END.test(this.outText)) this.finalizeOutput(at);
  }

  pushInput(delta: string, wallMs: number) {
    this.inText += delta;
    this.inLastMs = wallMs;
    if (SENTENCE_END.test(this.inText)) this.finalizeInput(wallMs);
  }

  // Call periodically (e.g. 500ms) so gap-based finalization works for
  // languages/styles without terminal punctuation.
  tick(wallMs: number) {
    if (this.outText && wallMs - this.outLastWallMs > OUTPUT_STALL_MS) {
      this.finalizeOutput(this.outLastMs);
    }
    if (this.inText && wallMs - this.inLastMs > INPUT_GAP_MS) {
      this.finalizeInput(this.inLastMs);
    }
  }

  flush() {
    if (this.inText) this.finalizeInput(this.inLastMs);
    if (this.outText) this.finalizeOutput(this.outLastMs);
  }

  private finalizeOutput(endMs: number) {
    const translated = this.outText.trim();
    this.outText = "";
    if (!translated) return;
    this.lines.push({
      id: this.nextId++,
      source: this.pendingSources.shift() ?? "",
      translated,
      startMs: Math.max(0, this.outStartMs),
      endMs: Math.max(endMs, this.outStartMs + 1),
    });
  }

  // Pair by time window, not blind FIFO — sentence counts drift when the
  // model splits or merges sentences across languages. An input burst arrives
  // ~1.2s after its audio; the matching translated line's span should sit
  // near that moment on the shared audio clock.
  private finalizeInput(atMs: number) {
    const source = this.inText.trim();
    this.inText = "";
    if (!source) return;

    const spokenAt = atMs - 1200;
    let best: CaptionLine | null = null;
    let bestDist = Infinity;
    for (const l of this.lines) {
      if (l.source !== "") continue;
      const dist = Math.abs(spokenAt - (l.startMs + l.endMs) / 2);
      if (dist < bestDist) {
        bestDist = dist;
        best = l;
      }
    }
    // If the still-streaming translation is a closer match than any finalized
    // line, hold the source for it instead of mis-attaching backwards.
    const openDist = this.outText
      ? Math.abs(spokenAt - this.outStartMs)
      : Infinity;
    if (best && bestDist <= openDist) best.source = source;
    else this.pendingSources.push(source);
  }

  snapshot(): SegmenterSnapshot {
    return {
      lines: [...this.lines],
      partialSource: this.inText,
      partialTranslated: this.outText,
    };
  }
}
