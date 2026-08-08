import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { broadcastToRoom, sha256, translateText } from "@/lib/rooms";
import { isOutputLang } from "@/lib/languages";

// Speaker posts each finalized caption line; we fan it out to every language
// viewers have requested. The speaker's realtime session already produced
// `translated` in `targetLang` — that one is free; the rest go through the
// cheap text model.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    token?: string;
    line?: { id?: number; source?: string; translated?: string; targetLang?: string };
  };
  const code = String(body.code ?? "").toUpperCase();
  const token = String(body.token ?? "");
  const line = body.line ?? {};
  const source = String(line.source ?? "").slice(0, 600);
  const translated = String(line.translated ?? "").slice(0, 600);
  const targetLang = String(line.targetLang ?? "");

  if (!/^[A-Z2-9]{6}$/.test(code) || !token || (!source && !translated)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data: ok } = await supabase.rpc("transcribebot_room_verify", {
    p_code: code,
    p_token_hash: sha256(token),
  });
  if (ok !== true) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: langsData } = await supabase.rpc("transcribebot_room_langs", { p_code: code });
  const langs = ((langsData ?? []) as string[]).filter(isOutputLang);
  const ts = Date.now();
  // The text we pivot from: the original speech when we have it.
  const pivot = source || translated;

  await Promise.all(
    langs.map(async (lang) => {
      let text: string | null;
      if (lang === targetLang && translated) text = translated;
      else text = await translateText(pivot, lang);
      if (!text) return;
      await broadcastToRoom(`room:${code}:${lang}`, {
        id: line.id ?? ts,
        text,
        source,
        ts,
      });
    }),
  );

  return NextResponse.json({ ok: true, langs: langs.length });
}
