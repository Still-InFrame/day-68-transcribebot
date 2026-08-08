"use client";

import { useEffect, useRef } from "react";

const FEATURES = [
  {
    video: "/loops/conference.mp4",
    poster: "/loops/conference-poster.jpg",
    title: "Stage mode, built for rooms",
    body: "One tap turns any screen into live captions — conferences, services, classrooms. Wake-lock keeps it on; mirror mode handles teleprompter glass.",
  },
  {
    video: "/loops/tokyo.mp4",
    poster: "/loops/tokyo-poster.jpg",
    title: "Understand anywhere",
    body: "Auto-detects what it hears across 70+ languages and translates into the one you choose. Presets relaunch your usual pair in one tap.",
  },
  {
    video: "/loops/meeting.mp4",
    poster: "/loops/meeting-poster.jpg",
    title: "Every meeting, on record",
    body: "Dual-language captions with timestamps, exportable as text or SRT. Sign in and every session lands in your searchable history.",
  },
];

export default function FeatureLoops() {
  const ref = useRef<HTMLDivElement>(null);

  // Play loops only while visible — battery and decode time matter.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const vids = Array.from(root.querySelectorAll("video"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) void v.play().catch(() => {});
          else v.pause();
        }),
      { threshold: 0.25 },
    );
    vids.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  return (
    <section id="features" ref={ref} className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="text-3xl font-semibold tracking-tight pb-10">
        Premium where it <span className="aurora-text">counts</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass rounded-2xl overflow-hidden">
            <video
              src={f.video}
              poster={f.poster}
              muted
              loop
              playsInline
              preload="none"
              className="w-full aspect-video object-cover"
            />
            <div className="p-5 space-y-2">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
