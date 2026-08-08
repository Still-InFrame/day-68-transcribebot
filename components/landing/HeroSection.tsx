"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import ReplayDemo from "./ReplayDemo";
import LanguageStrip from "./LanguageStrip";

// three.js is the landing page's heaviest dependency — load it after paint,
// with the static orb render holding the layout in the meantime.
const Hero3D = dynamic(() => import("./Hero3D"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full aspect-square max-w-105 mx-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/orb-a.png" alt="" className="w-full h-full object-contain" />
    </div>
  ),
});

export default function HeroSection() {
  // ReplayDemo produces the speech envelope; the orb consumes it.
  const envelope = useRef<() => number>(() => 0);

  return (
    <section className="max-w-6xl mx-auto px-4 pt-10 pb-20 grid lg:grid-cols-2 gap-10 items-center">
      <div className="space-y-8">
        <LanguageStrip />
        <p className="text-muted max-w-md leading-relaxed">
          Speak in any of 70+ languages. TranscribeBot live-translates your
          voice into captions and speech — in under a second. No account
          needed, and your audio is never stored.
        </p>
        <ReplayDemo envelope={envelope} />
      </div>
      <div className="order-first lg:order-none">
        <Hero3D level={() => envelope.current()} />
      </div>
    </section>
  );
}
