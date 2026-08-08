import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    company?: string; // honeypot — humans never see this field
  };
  if (body.company) return NextResponse.json({ ok: true }); // silently drop bots

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  // Plain insert: upsert's ON CONFLICT path needs broader RLS than insert-only.
  // A duplicate signup (23505) is success from the user's point of view.
  const { error } = await supabase.from("transcribebot_waitlist").insert({ email });
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
