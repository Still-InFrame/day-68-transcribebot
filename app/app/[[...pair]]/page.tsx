import { Suspense } from "react";
import type { Metadata } from "next";
import TranslatorApp from "@/components/translator/TranslatorApp";
import { DEFAULT_TARGET, isOutputLang } from "@/lib/languages";

const OG_LOCALES = new Set(["en", "es", "fr", "ja"]);

function targetFrom(pair?: string[]): string {
  const candidate = pair?.[0]?.split("-").at(-1) ?? "";
  return isOutputLang(candidate) ? candidate : DEFAULT_TARGET;
}

// Shared /app/es links get a Spanish share card, /app/ja a Japanese one, etc.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair?: string[] }>;
}): Promise<Metadata> {
  const target = targetFrom((await params).pair);
  const og = OG_LOCALES.has(target) ? target : "en";
  return {
    title: "TranscribeBot — Live translator",
    openGraph: { images: [`/og/og-${og}.png`] },
    twitter: { images: [`/og/og-${og}.png`] },
  };
}

// /app, /app/es (target), /app/es-en (source hint + target — source is
// auto-detected, so only the trailing code matters).
export default async function Page({ params }: { params: Promise<{ pair?: string[] }> }) {
  const target = targetFrom((await params).pair);
  return (
    <Suspense>
      <TranslatorApp initialTarget={target} />
    </Suspense>
  );
}
