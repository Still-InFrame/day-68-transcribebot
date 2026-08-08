"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { langByCode } from "@/lib/languages";
import AuthButton from "@/components/AuthButton";
import { useTranslatorSession } from "./useTranslatorSession";
import Waveform from "./Waveform";
import CaptionStream from "./CaptionStream";
import LanguagePicker from "./LanguagePicker";
import ExportMenu from "./ExportMenu";
import MicGate from "./MicGate";
import StageMode from "./StageMode";

type Preset = { name: string; to: string };

export default function TranslatorApp({ initialTarget }: { initialTarget: string }) {
  const search = useSearchParams();
  const fileUrl = search.get("src") ?? undefined; // no-mic test/demo mode
  const autostart = search.get("autostart") === "1";

  const s = useTranslatorSession();
  const [targetLang, setTargetLang] = useState(initialTarget);
  const [gate, setGate] = useState<"none" | "explain" | "denied">("none");
  const [stage, setStage] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  // Listen-along rooms: visible to signed-in users (speaker accountability +
  // a sign-in incentive); ?rooms=1 remains as an anonymous override for demos.
  const [signedIn, setSignedIn] = useState(false);
  const roomsEnabled = signedIn || search.get("rooms") === "1";
  const [room, setRoom] = useState<{ code: string; token: string; qr: string } | null>(null);
  const lastRelayedRef = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tb.target");
    // Deep link wins over memory; memory wins over default.
    if (initialTarget === "en" && saved) setTargetLang(saved);
    try {
      setPresets(JSON.parse(localStorage.getItem("tb.presets") ?? "[]"));
    } catch {
      setPresets([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("tb.target", targetLang);
  }, [targetLang]);

  useEffect(() => {
    // Safe to fire on every setup: the hook aborts an in-flight start when its
    // cleanup runs, so StrictMode's double-invoke nets exactly one session.
    if (autostart && fileUrl) void s.start(targetLang, { fileUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart, fileUrl]);

  useEffect(() => {
    if (s.errorCode === "mic_denied") setGate("denied");
  }, [s.errorCode]);

  // Line ids restart at 1 each session; reset the relay cursor with them.
  useEffect(() => {
    if (s.status === "connecting") lastRelayedRef.current = 0;
  }, [s.status]);

  // Fan finalized lines out to the room (fire-and-forget; captions on the
  // speaker's screen never wait on the relay).
  useEffect(() => {
    if (!room) return;
    const fresh = s.lines.filter((l) => l.id > lastRelayedRef.current);
    if (fresh.length === 0) return;
    lastRelayedRef.current = fresh[fresh.length - 1].id;
    for (const l of fresh) {
      void fetch("/api/room/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: room.code,
          token: room.token,
          line: { id: l.id, source: l.source, translated: l.translated, targetLang },
        }),
      }).catch(() => {});
    }
  }, [s.lines, room, targetLang]);

  async function startBroadcast() {
    const r = await fetch("/api/room", { method: "POST" });
    if (!r.ok) return;
    const { code, token } = await r.json();
    const QRCode = (await import("qrcode")).default;
    const qr = await QRCode.toDataURL(`${window.location.origin}/r/${code}`, {
      margin: 1,
      width: 240,
      color: { dark: "#e6e9f2", light: "#00000000" },
    });
    lastRelayedRef.current = 0;
    setRoom({ code, token, qr });
  }

  const busy = ["mic", "connecting", "live", "reconnecting", "finishing"].includes(s.status);
  const lang = langByCode(targetLang);

  function requestStart() {
    if (fileUrl) return void s.start(targetLang, { fileUrl });
    if (localStorage.getItem("tb.micOk") === "1") return void s.start(targetLang);
    setGate("explain");
  }

  function savePreset() {
    const l = langByCode(targetLang);
    if (!l) return;
    const name = `${l.flag} ${l.native}`;
    const next = [...presets.filter((p) => p.to !== targetLang), { name, to: targetLang }].slice(-5);
    setPresets(next);
    localStorage.setItem("tb.presets", JSON.stringify(next));
  }

  const statusLabel = useMemo(() => {
    switch (s.status) {
      case "mic": return "Waiting for microphone…";
      case "connecting": return "Connecting…";
      case "live": return "Live";
      case "reconnecting": return "Reconnecting — captions are safe";
      case "finishing": return "Finishing last sentence…";
      case "ended": return "Session complete";
      case "error":
        switch (s.errorCode) {
          case "anon_limit": return "Today's 3 free sessions are used — sign in for 60 min/day";
          case "daily_limit": return "Daily limit reached (60 min) — resets tomorrow";
          case "budget_exhausted": return "TranscribeBot hit today's global free budget — back tomorrow";
          case "mic_denied": return "Microphone is blocked";
          case "connection_lost": return "Connection lost — transcript is safe, start again when ready";
          default: return "Something went wrong — try again";
        }
      default: return "Ready";
    }
  }, [s.status, s.errorCode]);

  const capPct = Math.min(1, s.elapsedSec / s.capSec);

  return (
    <div className="h-dvh flex flex-col max-w-3xl mx-auto px-4 pb-4">
      <header className="flex items-center gap-3 py-4 flex-wrap">
        <Link href="/" className="font-semibold tracking-tight text-lg">
          Transcribe<span className="aurora-text">Bot</span>
        </Link>
        <div className="flex-1" />
        <LanguagePicker value={targetLang} onChange={setTargetLang} disabled={busy} />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="glass rounded-xl px-3 py-2 text-sm hover:bg-white/10"
            title="Options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} aria-hidden />
              <div className="absolute right-0 top-11 z-30 glass rounded-xl p-2 flex flex-col min-w-52 bg-surface/95">
                <button
                  onClick={() => s.setVoiceOn(!s.voiceOn)}
                  className="px-3 py-2 text-sm text-left rounded-lg hover:bg-white/10 flex items-center gap-2"
                >
                  <span>{s.voiceOn ? "🔊" : "🔇"}</span>
                  Translated voice
                  <span className={`ml-auto text-xs ${s.voiceOn ? "text-emerald-400" : "text-muted"}`}>
                    {s.voiceOn ? "On" : "Off"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setStage(true);
                  }}
                  className="px-3 py-2 text-sm text-left rounded-lg hover:bg-white/10 flex items-center gap-2"
                >
                  <span>⛶</span> Stage mode
                </button>
                {roomsEnabled && !room && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void startBroadcast();
                    }}
                    className="px-3 py-2 text-sm text-left rounded-lg hover:bg-white/10 flex items-center gap-2"
                  >
                    <span>((•))</span> Broadcast room
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <AuthButton
          refreshKey={s.status === "ended" ? 1 : 0}
          onUsage={(u) => setSignedIn(u.signedIn)}
        />
      </header>

      {room && (
        <div className="glass rounded-2xl p-4 mb-3 flex items-center gap-4 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={room.qr} alt={`QR code for room ${room.code}`} className="w-24 h-24" />
          <div className="flex-1 min-w-40">
            <p className="font-semibold tracking-[0.3em] text-xl">{room.code}</p>
            <p className="text-xs text-muted leading-relaxed">
              Audience: scan, or open /r/{room.code} — everyone picks their own
              language. Captions fan out as you speak.
            </p>
            <button
              className="text-xs text-aurora-cyan hover:underline"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/r/${room.code}`)}
            >
              Copy link
            </button>
          </div>
          <button
            onClick={() => setRoom(null)}
            className="glass rounded-lg px-3 py-1.5 text-sm hover:bg-white/10 text-muted"
          >
            End room
          </button>
        </div>
      )}

      <div className="glass rounded-2xl px-4 pt-3 pb-1">
        <div className="flex items-center gap-3 text-sm pb-1">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              s.status === "live"
                ? "bg-emerald-400"
                : s.status === "reconnecting"
                  ? "bg-amber-400"
                  : "bg-white/25"
            }`}
          />
          <span className="text-muted">{statusLabel}</span>
          {s.status === "live" && s.latencyMs !== null && (
            <span className="text-muted/80 tabular-nums">
              ≈{(s.latencyMs / 1000).toFixed(1)}s behind speaker
            </span>
          )}
          <div className="flex-1" />
          {busy && (
            <span className="flex items-center gap-2 tabular-nums text-muted">
              <svg width="18" height="18" viewBox="0 0 20 20" className="-rotate-90">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
                <circle
                  cx="10" cy="10" r="8" fill="none"
                  stroke={capPct > 0.85 ? "#fbbf24" : "#22d3ee"}
                  strokeWidth="2.5"
                  strokeDasharray={`${capPct * 50.27} 50.27`}
                  strokeLinecap="round"
                />
              </svg>
              {Math.floor(s.elapsedSec / 60)}:{String(s.elapsedSec % 60).padStart(2, "0")}
              <span className="text-muted/60">/ {s.capSec / 60}:00</span>
            </span>
          )}
        </div>
        <Waveform analyser={s.analyser} status={s.status} />
      </div>

      <CaptionStream
        lines={s.lines}
        partialSource={s.partialSource}
        partialTranslated={s.partialTranslated}
      />

      {s.status === "ended" && (
        <div className="glass rounded-2xl p-4 mb-3 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-40">
            <p className="font-medium">
              {s.endReason === "cap" ? "Free session limit reached" : "Session complete"}
            </p>
            <p className="text-sm text-muted">
              {s.lines.length} lines · {Math.floor(s.elapsedSec / 60)}m {s.elapsedSec % 60}s
              {s.endReason === "cap" && ` · Sessions are capped at ${Math.round(s.capSec / 60)} minutes`}
              {s.savedToHistory && " · Saved to history ✓"}
            </p>
          </div>
          <ExportMenu lines={s.lines} />
        </div>
      )}

      <footer className="flex items-center gap-3 pt-3">
        <div className="flex gap-2 flex-wrap min-h-9 items-center">
          {presets.map((p) => (
            <button
              key={p.to}
              onClick={() => !busy && setTargetLang(p.to)}
              className={`glass rounded-full px-3 py-1 text-xs hover:bg-white/10 ${
                p.to === targetLang ? "border-aurora-cyan/60" : ""
              }`}
            >
              {p.name}
            </button>
          ))}
          <button onClick={savePreset} className="text-xs text-muted hover:text-foreground transition px-1" title="Save current language as a preset">
            + preset
          </button>
        </div>
        <div className="flex-1" />
        {!busy ? (
          <button
            onClick={requestStart}
            className="pulse-glow rounded-full px-8 py-3 font-semibold bg-gradient-to-r from-aurora-violet via-aurora-cyan to-aurora-magenta text-black hover:opacity-90 transition"
          >
            {s.status === "ended" || s.status === "error" ? (
              "New session"
            ) : (
              <>
                Start translating
                {lang && <span className="hidden sm:inline"> → {lang.native}</span>}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => void s.stop("user")}
            className="rounded-full px-8 py-3 font-semibold glass hover:bg-white/10 transition"
            disabled={s.status === "finishing"}
          >
            {s.status === "finishing" ? "Finishing…" : "Stop"}
          </button>
        )}
        {s.status !== "ended" && <ExportMenu lines={s.lines} />}
      </footer>

      <audio ref={s.attachAudioEl} autoPlay className="hidden" />

      {gate !== "none" && (
        <MicGate
          mode={gate === "denied" ? "denied" : "explain"}
          onProceed={() => {
            localStorage.setItem("tb.micOk", "1");
            setGate("none");
            void s.start(targetLang);
          }}
          onCancel={() => setGate("none")}
        />
      )}

      {stage && (
        <StageMode
          lines={s.lines}
          partialSource={s.partialSource}
          partialTranslated={s.partialTranslated}
          onExit={() => setStage(false)}
        />
      )}
    </div>
  );
}
