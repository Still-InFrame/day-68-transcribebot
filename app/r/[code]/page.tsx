import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import RoomViewer from "@/components/RoomViewer";

export const metadata: Metadata = { title: "TranscribeBot — Live room" };
export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const valid = /^[A-Z2-9]{6}$/.test(code);
  let exists = false;
  if (valid) {
    const supabase = await supabaseServer();
    const { data } = await supabase.rpc("transcribebot_room_exists", { p_code: code });
    exists = data === true;
  }

  if (!exists) {
    return (
      <main className="min-h-dvh grid place-items-center px-4">
        <div className="text-center space-y-4">
          <p className="text-4xl font-semibold aurora-text">Room not found</p>
          <p className="text-muted text-sm">
            This room has ended or the code isn&apos;t right. Ask the speaker for a fresh QR.
          </p>
          <Link href="/" className="inline-block glass rounded-xl px-4 py-2 hover:bg-white/10 transition">
            What is TranscribeBot?
          </Link>
        </div>
      </main>
    );
  }

  return <RoomViewer code={code} />;
}
