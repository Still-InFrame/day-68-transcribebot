"use client";

import { useEffect, useRef } from "react";
import type { SessionStatus } from "./useTranslatorSession";

// The "is it hearing me?" answer, rendered: live frequency bars driven by the
// input analyser, tinted by connection state.
export default function Waveform({
  analyser,
  status,
  height = 56,
}: {
  analyser: AnalyserNode | null;
  status: SessionStatus;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = (canvas.width = canvas.offsetWidth * devicePixelRatio);
      const h = (canvas.height = height * devicePixelRatio);
      ctx.clearRect(0, 0, w, h);

      const bars = 48;
      const gap = w / bars;
      const s = statusRef.current;
      const active = s === "live" && analyser && data;

      if (analyser && data) analyser.getByteFrequencyData(data);

      for (let i = 0; i < bars; i++) {
        let v = 0.08; // idle floor
        if (active && data) {
          const idx = Math.floor((i / bars) * data.length * 0.7); // drop dead top bins
          v = Math.max(0.06, data[idx] / 255);
        } else if (s === "reconnecting" || s === "connecting") {
          v = 0.1 + 0.06 * Math.sin(Date.now() / 220 + i * 0.6);
        }
        const bh = v * h * 0.9;
        const x = i * gap + gap * 0.25;
        const grad = ctx.createLinearGradient(0, h, 0, h - bh);
        if (s === "reconnecting") {
          grad.addColorStop(0, "rgba(251,191,36,0.85)");
          grad.addColorStop(1, "rgba(251,191,36,0.25)");
        } else {
          grad.addColorStop(0, "rgba(139,92,246,0.9)");
          grad.addColorStop(0.6, "rgba(34,211,238,0.85)");
          grad.addColorStop(1, "rgba(232,121,249,0.7)");
        }
        ctx.fillStyle = grad;
        const r = gap * 0.22;
        ctx.beginPath();
        ctx.roundRect(x, h - bh, gap * 0.5, bh, r);
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser, height]);

  return <canvas ref={canvasRef} className="w-full" style={{ height }} aria-hidden />;
}
