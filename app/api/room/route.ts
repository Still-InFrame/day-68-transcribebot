import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { makeRoomCode, sha256 } from "@/lib/rooms";

// Create a listen-along room. The bearer token stays with the speaker's
// browser; only its hash is stored.
export async function POST() {
  const supabase = await supabaseServer();
  const token = randomUUID();

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = makeRoomCode();
    const { data, error } = await supabase.rpc("transcribebot_room_create", {
      p_code: code,
      p_token_hash: sha256(token),
    });
    if (!error && data === true) {
      return NextResponse.json({ code, token });
    }
  }
  return NextResponse.json({ error: "room_create_failed" }, { status: 500 });
}
