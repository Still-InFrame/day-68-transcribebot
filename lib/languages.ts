export type Lang = { code: string; name: string; native: string; flag: string };

// Output languages officially announced for gpt-realtime-translate. The mint
// endpoint accepts arbitrary ISO codes without validation (verified 2026-08-07),
// so this curated list is the product's honest allowlist.
export const OUTPUT_LANGUAGES: Lang[] = [
  { code: "en", name: "English", native: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", native: "Português", flag: "🇧🇷" },
  { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦" },
  { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polish", native: "Polski", flag: "🇵🇱" },
];

export const isOutputLang = (code: string) =>
  OUTPUT_LANGUAGES.some((l) => l.code === code);

export const langByCode = (code: string) =>
  OUTPUT_LANGUAGES.find((l) => l.code === code);

export const DEFAULT_TARGET = "en";
