"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { OUTPUT_LANGUAGES } from "@/lib/languages";

// The hero headline, morphing through all output languages. Tap a chip to
// jump; it auto-cycles otherwise.
const HEADLINES: Record<string, string> = {
  en: "One voice. Every language.",
  es: "Una voz. Todos los idiomas.",
  fr: "Une voix. Toutes les langues.",
  de: "Eine Stimme. Alle Sprachen.",
  it: "Una voce. Ogni lingua.",
  pt: "Uma voz. Todos os idiomas.",
  ja: "ひとつの声、すべての言語。",
  ko: "하나의 목소리, 모든 언어.",
  zh: "一个声音，所有语言。",
  hi: "एक आवाज़। हर भाषा।",
  ar: "صوت واحد. كل اللغات.",
  ru: "Один голос. Все языки.",
  nl: "Eén stem. Alle talen.",
  pl: "Jeden głos. Wszystkie języki.",
};

export default function LanguageStrip({
  active,
  onChange,
}: {
  active: string;
  onChange: (code: string) => void;
}) {
  const lastClick = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (performance.now() - lastClick.current < 8000) return;
      const idx = OUTPUT_LANGUAGES.findIndex((l) => l.code === activeRef.current);
      onChange(OUTPUT_LANGUAGES[(idx + 1) % OUTPUT_LANGUAGES.length].code);
    }, 5200); // slow enough for the demo to show a line or two per language
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lang = OUTPUT_LANGUAGES.find((l) => l.code === active) ?? OUTPUT_LANGUAGES[0];

  return (
    <div className="space-y-6">
      <div className="min-h-28 sm:min-h-36 flex items-center">
        <AnimatePresence mode="wait">
          <motion.h1
            key={lang.code}
            lang={lang.code}
            dir={lang.code === "ar" ? "rtl" : "ltr"}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.35 }}
            className="text-4xl sm:text-6xl font-semibold tracking-tight leading-tight"
          >
            {HEADLINES[lang.code] ?? HEADLINES.en}
          </motion.h1>
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OUTPUT_LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => {
              lastClick.current = performance.now();
              onChange(l.code);
            }}
            className={`rounded-full px-3 py-1 text-xs transition border ${
              l.code === active
                ? "border-aurora-cyan/70 text-foreground bg-white/5"
                : "border-white/10 text-muted hover:text-foreground hover:bg-white/5"
            }`}
            aria-label={`Show headline in ${l.name}`}
          >
            {l.flag} {l.native}
          </button>
        ))}
      </div>
    </div>
  );
}
