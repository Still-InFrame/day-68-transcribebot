// WebRTC client for OpenAI's dedicated realtime translation endpoint.
// Event names + semantics verified against the live API on 2026-08-07 (spike):
//   session.created, output_audio_buffer.started,
//   session.output_transcript.delta (word cadence, has elapsed_ms),
//   session.input_transcript.delta (sentence bursts, elapsed_ms null),
//   session.closed (after we send session.close).

const CALLS_URL = "https://api.openai.com/v1/realtime/translations/calls";
const MAX_RECONNECTS = 3;

export type ClientStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "finishing"
  | "closed"
  | "error";

export type ClientCallbacks = {
  onStatus: (s: ClientStatus, detail?: string) => void;
  onOutputDelta: (delta: string, elapsedMs: number | null, wallMs: number) => void;
  onInputDelta: (delta: string, wallMs: number) => void;
  onRemoteStream: (stream: MediaStream) => void;
};

export class ClientError extends Error {
  constructor(
    public code: string,
    public status?: number,
  ) {
    super(code);
  }
}

export class RealtimeTranslationClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private userClosed = false;
  private reconnects = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedResolve: (() => void) | null = null;
  private t0 = 0;
  // Server elapsed_ms restarts at 0 for each session; this offset keeps the
  // transcript timeline monotonic across reconnects.
  private elapsedBase = 0;

  lastServerElapsedMs: number | null = null;
  lastLagMs: number | null = null;
  // Server-authoritative session cap, learned from the mint response.
  capSec: number | null = null;

  constructor(
    private stream: MediaStream,
    private targetLang: string,
    private cb: ClientCallbacks,
  ) {}

  wallMs() {
    return this.t0 ? performance.now() - this.t0 : 0;
  }

  async connect(): Promise<void> {
    this.cb.onStatus(this.reconnects ? "reconnecting" : "connecting");

    const res = await fetch("/api/realtime/secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLang: this.targetLang }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ClientError(body.error ?? "mint_failed", res.status);
    }
    const { value: secret, capSec } = await res.json();
    if (typeof capSec === "number") this.capSec = capSec;

    const pc = new RTCPeerConnection();
    this.pc = pc;
    this.stream.getAudioTracks().forEach((t) => pc.addTrack(t, this.stream));

    pc.ontrack = (e) => {
      if (e.streams[0]) this.cb.onRemoteStream(e.streams[0]);
    };
    pc.onconnectionstatechange = () => {
      if (
        (pc.connectionState === "failed" || pc.connectionState === "disconnected") &&
        !this.userClosed
      ) {
        this.scheduleReconnect();
      }
    };

    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    const opened = new Promise<void>((resolve, reject) => {
      dc.onopen = () => resolve();
      dc.onerror = () => reject(new ClientError("data_channel_error"));
    });
    dc.onmessage = (m) => this.handleEvent(String(m.data));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const sdpRes = await fetch(CALLS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/sdp" },
      body: offer.sdp,
    });
    if (!sdpRes.ok) throw new ClientError("sdp_failed", sdpRes.status);
    await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
    await opened;

    if (!this.t0) this.t0 = performance.now();
    this.elapsedBase = this.reconnects > 0 ? this.wallMs() : 0;
    this.reconnects = 0;
    this.cb.onStatus("live");

    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      // Chaos hook for exercising the reconnect path without pulling cables.
      (window as unknown as Record<string, unknown>).__tbDropConnection = () => {
        this.teardownPc();
        this.scheduleReconnect();
      };
    }
  }

  private handleEvent(raw: string) {
    let ev: { type?: string; delta?: unknown; elapsed_ms?: unknown };
    try {
      ev = JSON.parse(raw);
    } catch {
      return;
    }
    const wall = this.wallMs();
    switch (ev.type) {
      case "session.output_transcript.delta": {
        const rawElapsed = typeof ev.elapsed_ms === "number" ? ev.elapsed_ms : null;
        const elapsed = rawElapsed === null ? null : this.elapsedBase + rawElapsed;
        if (elapsed !== null) {
          this.lastServerElapsedMs = elapsed;
          this.lastLagMs = Math.max(0, wall - elapsed);
        }
        this.cb.onOutputDelta(String(ev.delta ?? ""), elapsed, wall);
        break;
      }
      case "session.input_transcript.delta":
        this.cb.onInputDelta(String(ev.delta ?? ""), wall);
        break;
      case "session.closed":
        this.closedResolve?.();
        break;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return; // one attempt in flight at a time
    if (this.reconnects >= MAX_RECONNECTS) {
      this.cb.onStatus("error", "connection_lost");
      return;
    }
    const delay = 1000 * 2 ** this.reconnects;
    this.reconnects += 1;
    this.cb.onStatus("reconnecting");
    this.teardownPc();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => this.scheduleReconnect());
    }, delay);
  }

  // Graceful end: session.close asks the service to flush pending audio, then
  // it acks with session.closed. Trailing transcript deltas arrive during the
  // drain window, so callers should keep consuming until this resolves.
  async close(drainMs = 6000): Promise<void> {
    this.userClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.cb.onStatus("finishing");
    const closed = new Promise<void>((r) => (this.closedResolve = r));
    try {
      this.dc?.send(JSON.stringify({ type: "session.close" }));
    } catch {
      // channel already gone — nothing to flush
    }
    await Promise.race([closed, new Promise((r) => setTimeout(r, drainMs))]);
    this.teardownPc();
    this.cb.onStatus("closed");
  }

  destroy() {
    this.userClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.teardownPc();
  }

  private teardownPc() {
    try {
      this.dc?.close();
    } catch {}
    try {
      this.pc?.close();
    } catch {}
    this.dc = null;
    this.pc = null;
  }
}
