"use client";

import Link from "next/link";
import { useState } from "react";

export default function Pricing() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  const tiers = [
    {
      name: "Try it",
      price: "Free",
      sub: "no account",
      features: [
        "3-minute live sessions, 3 per day",
        "Speak 70+ languages, translate into all 13",
        "Dual-language captions + translated voice playback",
        "Stage mode for projectors and second screens",
        "TXT + SRT transcript export",
        "Join any listen-along room — free, unlimited",
      ],
      cta: (
        <Link href="/app" className="block text-center glass rounded-xl py-2.5 hover:bg-white/10 transition">
          Start translating
        </Link>
      ),
    },
    {
      name: "Free account",
      price: "$0",
      sub: "one-click Google sign-in",
      features: [
        "Everything in Try it",
        "15-minute sessions, 60 minutes per day",
        "Broadcast rooms: QR + link, unlimited viewers",
        "Viewers pick any of 13 caption languages at once",
        "Word-by-word streaming in your target language",
        "Session history — revisit, re-export, delete anytime",
      ],
      cta: (
        <Link
          href="/app"
          className="block text-center rounded-xl py-2.5 font-semibold bg-gradient-to-r from-aurora-violet to-aurora-cyan text-black hover:opacity-90 transition"
        >
          Sign in & translate
        </Link>
      ),
      highlight: true,
    },
    {
      name: "Pro",
      price: "$12/mo",
      sub: "founding waitlist",
      features: [
        "Everything in Free account",
        "Unlimited translation minutes (planned)",
        "Voice channels in rooms — translated audio per language (planned)",
        "Custom glossary for names & jargon (planned)",
        "Priority capacity on packed days (planned)",
      ],
      cta:
        state === "done" ? (
          <p className="text-center text-sm text-emerald-400 py-2.5">You're on the list ✓</p>
        ) : (
          <form onSubmit={join} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@work.com"
              className="glass rounded-xl px-3 py-2.5 text-sm flex-1 min-w-0 outline-none focus:border-aurora-cyan/60"
            />
            <button
              disabled={state === "busy"}
              className="glass rounded-xl px-4 text-sm hover:bg-white/10 disabled:opacity-50 whitespace-nowrap"
            >
              {state === "busy" ? "…" : "Join"}
            </button>
          </form>
        ),
    },
  ];

  return (
    <section id="pricing" className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="text-3xl font-semibold tracking-tight pb-10">Simple, honest pricing</h2>
      <div className="grid md:grid-cols-3 gap-6 items-start">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`glass rounded-2xl p-6 space-y-4 ${t.highlight ? "border-aurora-cyan/40" : ""}`}
          >
            <div>
              <p className="text-sm text-muted">{t.name}</p>
              <p className="text-3xl font-semibold pt-1">
                {t.price} <span className="text-sm text-muted font-normal">· {t.sub}</span>
              </p>
            </div>
            <ul className="space-y-2 text-sm text-muted">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-aurora-cyan">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {t.cta}
          </div>
        ))}
      </div>
      {state === "error" && (
        <p className="text-sm text-red-300 pt-3">Couldn't save that email — try again in a moment.</p>
      )}
    </section>
  );
}
