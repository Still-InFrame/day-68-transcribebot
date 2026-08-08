import Link from "next/link";

// The listen-along rooms pitch, paired with the 30s brand film whose final
// shot IS the feature: a hall full of phones glowing in caption colors.
export default function FilmSection() {
  return (
    <section id="rooms" className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-10 items-center">
      <div className="space-y-5">
        <h2 className="text-3xl font-semibold tracking-tight">
          One voice. <span className="aurora-text">Every phone in the room.</span>
        </h2>
        <p className="text-muted leading-relaxed">
          Tap <span className="text-foreground">Broadcast</span> and your session
          becomes a room: a QR code on your screen, live captions on every phone
          that scans it — each person reading in the language they choose.
          Viewers need no app and no account, and there&apos;s no limit on how
          many can join.
        </p>
        <p className="text-muted leading-relaxed">
          Captions in your target language stream word-by-word — the same feed
          you see on stage. Every other language follows sentence-by-sentence,
          about a second behind. Only caption text ever leaves your device;
          your audio never reaches viewers.
        </p>
        <ul className="space-y-2 text-sm text-muted">
          {[
            "Unlimited viewers per room — talks, services, classrooms",
            "Every viewer picks their own language, all 13 at once if they want",
            "Joining is free forever; broadcasting comes with free sign-in",
          ].map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-aurora-cyan">✓</span>
              {f}
            </li>
          ))}
        </ul>
        <Link
          href="/app"
          className="inline-block rounded-full px-6 py-2.5 font-semibold text-sm bg-gradient-to-r from-aurora-violet via-aurora-cyan to-aurora-magenta text-black hover:opacity-90 transition"
        >
          Open a room →
        </Link>
      </div>
      <figure>
        <video
          controls
          playsInline
          preload="none"
          poster="/film-poster.jpg"
          src="/film.mp4"
          className="w-full rounded-2xl glass"
        />
        <figcaption className="text-xs text-muted pt-2">
          The 30-second film — one shot, from one voice to a room full of phones.
        </figcaption>
      </figure>
    </section>
  );
}
