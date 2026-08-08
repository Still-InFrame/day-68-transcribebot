import Link from "next/link";
import HeroSection from "@/components/landing/HeroSection";
import FilmSection from "@/components/landing/FilmSection";
import FeatureLoops from "@/components/landing/FeatureLoops";
import Comparison from "@/components/landing/Comparison";
import BabelCounter from "@/components/landing/BabelCounter";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";

const STEPS = [
  ["Speak", "Tap the mic and talk naturally, in any of 70+ languages. No setup, no account."],
  ["Watch it translate", "Dual-language captions stream in about a second behind you — original ghosted, translation bold."],
  ["Fill the room", "One tap opens a listen-along room: a QR on your screen, live captions on every phone that scans — each viewer in their own language."],
] as const;

export default function Home() {
  return (
    <main className="overflow-x-clip">
      <nav className="max-w-6xl mx-auto px-4 py-5 flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight text-lg">
          Transcribe<span className="aurora-text">Bot</span>
        </Link>
        <div className="hidden sm:flex items-center gap-5 text-sm text-muted">
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <a href="#rooms" className="hover:text-foreground transition">Rooms</a>
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
        </div>
        <div className="flex-1" />
        <Link
          href="/app"
          className="rounded-full px-5 py-2 text-sm font-semibold bg-gradient-to-r from-aurora-violet via-aurora-cyan to-aurora-magenta text-black hover:opacity-90 transition"
        >
          Launch app
        </Link>
      </nav>

      <HeroSection />

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-semibold tracking-tight pb-10">
          Three steps, <span className="aurora-text">zero learning curve</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map(([title, body], i) => (
            <div key={title} className="glass rounded-2xl p-6 space-y-3">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-aurora-violet to-aurora-cyan text-black grid place-items-center font-bold text-sm">
                {i + 1}
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <FeatureLoops />
      <FilmSection />
      <Comparison />
      <BabelCounter />
      <Pricing />
      <FAQ />

      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row gap-4 items-center text-sm text-muted">
          <p className="font-medium text-foreground">
            Transcribe<span className="aurora-text">Bot</span>
          </p>
          <p>Real-time translation powered by OpenAI gpt-realtime-translate.</p>
          <div className="flex-1" />
          <a
            href="https://www.100dayaichallenge.com/share/savion"
            target="_blank"
            rel="noopener noreferrer"
            className="glass rounded-full px-4 py-1.5 hover:bg-white/10 transition"
          >
            Day 68 of the 100 Day AI Build Challenge →
          </a>
        </div>
      </footer>
    </main>
  );
}
