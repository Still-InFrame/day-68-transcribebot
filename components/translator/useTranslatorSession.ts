"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeTranslationClient, ClientError, type ClientStatus } from "@/lib/realtime/client";
import { Segmenter, type CaptionLine } from "@/lib/realtime/segmenter";
import { getFileStream, getMicStream, makeAnalyser, playChime } from "@/lib/audio";

export type SessionStatus =
  | "idle"
  | "mic"
  | "connecting"
  | "live"
  | "reconnecting"
  | "finishing"
  | "ended"
  | "error";

export type EndReason = "user" | "cap" | null;

// Anonymous cap; P3 raises this for signed-in users and enforces server-side.
export const ANON_CAP_SEC = 180;

export function useTranslatorSession() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [endReason, setEndReason] = useState<EndReason>(null);
  const [lines, setLines] = useState<CaptionLine[]>([]);
  const [partialSource, setPartialSource] = useState("");
  const [partialTranslated, setPartialTranslated] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [capSec, setCapSec] = useState(ANON_CAP_SEC);
  const [voiceOn, setVoiceOnState] = useState(true);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [savedToHistory, setSavedToHistory] = useState(false);
  const targetRef = useRef<string>("en");

  const clientRef = useRef<RealtimeTranslationClient | null>(null);
  const segRef = useRef<Segmenter | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const fileStopRef = useRef<(() => void) | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const stoppingRef = useRef(false);
  const wentLiveRef = useRef(false);
  // Guards against overlapping async starts (React StrictMode double-mount
  // fires effects twice while the first start() is still awaiting).
  const genRef = useRef(0);

  useEffect(() => {
    setVoiceOnState(localStorage.getItem("tb.voiceOn") !== "0");
    return () => {
      // Unmount: hard teardown, no drain. Bumping the generation first makes
      // any in-flight start() abort at its next await — under StrictMode this
      // cleanup fires mid-start, and without the bump the orphaned start
      // would keep running against the closed AudioContext.
      genRef.current++;
      clientRef.current?.destroy();
      cleanupMedia();
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setVoiceOn = useCallback((on: boolean) => {
    setVoiceOnState(on);
    localStorage.setItem("tb.voiceOn", on ? "1" : "0");
    if (audioElRef.current) audioElRef.current.muted = !on;
  }, []);

  const attachAudioEl = useCallback(
    (el: HTMLAudioElement | null) => {
      audioElRef.current = el;
      if (el) el.muted = !voiceOn;
    },
    [voiceOn],
  );

  function cleanupMedia() {
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    fileStopRef.current?.();
    fileStopRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }

  function refreshSnapshot() {
    const snap = segRef.current?.snapshot();
    if (!snap) return;
    setLines(snap.lines);
    setPartialSource(snap.partialSource);
    setPartialTranslated(snap.partialTranslated);
  }

  const stop = useCallback(async (reason: Exclude<EndReason, null> = "user") => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setEndReason(reason);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    const durationSec = Math.floor((clientRef.current?.wallMs() ?? 0) / 1000);
    try {
      await clientRef.current?.close();
    } finally {
      segRef.current?.flush();
      refreshSnapshot();
      cleanupMedia();
      setStatus("ended");
      stoppingRef.current = false;
      // Record minutes + save transcript (server decides both); non-fatal.
      const snap = segRef.current?.snapshot();
      void fetch("/api/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLang: targetRef.current,
          durationSec,
          lines: snap?.lines ?? [],
        }),
      })
        .then((r) => r.json())
        .then((d) => setSavedToHistory(Boolean(d?.saved)))
        .catch(() => {});
    }
  }, []);

  const start = useCallback(
    async (targetLang: string, opts?: { fileUrl?: string }) => {
      setErrorCode(null);
      setEndReason(null);
      setLines([]);
      setPartialSource("");
      setPartialTranslated("");
      setElapsedSec(0);
      setLatencyMs(null);
      setSavedToHistory(false);
      wentLiveRef.current = false;
      targetRef.current = targetLang;

      const gen = ++genRef.current;
      const stale = () => genRef.current !== gen;

      try {
        setStatus("mic");
        clientRef.current?.destroy();
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        await ctx.resume();
        if (stale()) return void ctx.close().catch(() => {});

        let stream: MediaStream;
        let startFile: (() => void) | null = null;
        if (opts?.fileUrl) {
          const f = await getFileStream(ctx, opts.fileUrl);
          if (stale()) { return void ctx.close().catch(() => {}); }
          stream = f.stream;
          fileStopRef.current = f.stop;
          startFile = f.start;
          setAnalyser(makeAnalyser(ctx, f.node));
          // Demo/test sessions end themselves shortly after playback rather
          // than billing silence up to the cap.
          void f.done.then(() => {
            setTimeout(() => {
              if (!stale()) void stop("user");
            }, 4000);
          });
        } else {
          stream = await getMicStream();
          if (stale()) { stream.getTracks().forEach((t) => t.stop()); return; }
          micRef.current = stream;
          setAnalyser(makeAnalyser(ctx, stream));
        }

        const seg = new Segmenter();
        segRef.current = seg;

        const client = new RealtimeTranslationClient(stream, targetLang, {
          onStatus: (s: ClientStatus) => {
            if (s === "live") {
              if (!wentLiveRef.current) {
                wentLiveRef.current = true;
                playChime();
              }
              setStatus("live");
            } else if (s === "reconnecting") setStatus("reconnecting");
            else if (s === "connecting") setStatus("connecting");
            else if (s === "finishing") setStatus("finishing");
            else if (s === "error") {
              setErrorCode("connection_lost");
              setStatus("error");
            }
          },
          onOutputDelta: (delta, elapsed, wall) => {
            seg.pushOutput(delta, wall, elapsed);
            if (clientRef.current?.lastLagMs != null) {
              setLatencyMs(Math.round(clientRef.current.lastLagMs + 600)); // +600ms observed model lead time
            }
            refreshSnapshot();
          },
          onInputDelta: (delta, wall) => {
            seg.pushInput(delta, wall);
            refreshSnapshot();
          },
          onRemoteStream: (remote) => {
            if (audioElRef.current) {
              audioElRef.current.srcObject = remote;
              audioElRef.current.play().catch(() => {});
            }
          },
        });
        clientRef.current = client;

        setStatus("connecting");
        await client.connect();
        if (stale()) return void client.destroy();
        if (client.capSec) setCapSec(client.capSec);
        startFile?.();

        tickRef.current = setInterval(() => {
          const c = clientRef.current;
          if (!c) return;
          segRef.current?.tick(c.wallMs());
          refreshSnapshot();
          const sec = Math.floor(c.wallMs() / 1000);
          setElapsedSec(sec);
          if (sec >= capSec) void stop("cap");
        }, 500);
      } catch (e) {
        cleanupMedia();
        if (e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")) {
          setErrorCode("mic_denied");
        } else if (e instanceof ClientError) {
          setErrorCode(e.code);
        } else {
          setErrorCode("unknown");
        }
        setStatus("error");
      }
    },
    [capSec, stop],
  );

  return {
    status,
    errorCode,
    endReason,
    savedToHistory,
    lines,
    partialSource,
    partialTranslated,
    elapsedSec,
    capSec,
    latencyMs,
    voiceOn,
    analyser,
    start,
    stop,
    setVoiceOn,
    attachAudioEl,
  };
}
