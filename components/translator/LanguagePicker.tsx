"use client";

import { OUTPUT_LANGUAGES } from "@/lib/languages";

export default function LanguagePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-sm cursor-pointer">
      <span className="text-muted whitespace-nowrap">Translate to</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none font-medium cursor-pointer disabled:opacity-50 [&>option]:bg-surface"
        aria-label="Target language"
      >
        {OUTPUT_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
