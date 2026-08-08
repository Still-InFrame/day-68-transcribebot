import { createHash } from "node:crypto";
import { langByCode } from "./languages";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// No 0/O/1/I — codes get read aloud off projectors.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeRoomCode(): string {
  return Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");
}

// Tier-1 fan-out: finalized lines only, cheap text model. The speaker's own
// realtime session already produced one language; everything else costs
// fractions of a cent per line.
export async function translateText(text: string, targetCode: string): Promise<string | null> {
  const target = langByCode(targetCode)?.name ?? targetCode;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content: `Translate the user's text into ${target}. Output ONLY the translation, nothing else.`,
          },
          { role: "user", content: text },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

// Server-side Supabase Realtime broadcast over REST — no websocket needed in
// a serverless handler.
export async function broadcastToRoom(
  topic: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [{ topic, event: "line", payload, private: false }],
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // best-effort: a dropped caption is better than a stalled relay
  }
}
