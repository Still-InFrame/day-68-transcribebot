"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Usage = {
  signedIn: boolean;
  email: string | null;
  minutesToday: number;
  capMinutes: number | null;
  anonSessionsLeft: number | null;
};

// Sign-in + live usage chip. refreshKey bumps re-fetch (e.g. after a session);
// onUsage lets the parent react to auth state (e.g. reveal Broadcast).
export default function AuthButton({
  refreshKey = 0,
  onUsage,
}: {
  refreshKey?: number;
  onUsage?: (u: { signedIn: boolean }) => void;
}) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setUsage(d);
        onUsage?.({ signedIn: Boolean(d?.signedIn) });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function signIn() {
    const supabase = supabaseBrowser();
    void supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}` },
    });
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.reload();
  }

  if (!usage) return <div className="w-24 h-9" aria-hidden />;

  if (!usage.signedIn) {
    return (
      <button
        onClick={signIn}
        className="glass rounded-xl px-3 py-2 text-sm hover:bg-white/10 transition whitespace-nowrap"
        title="15-minute sessions + saved history"
      >
        Sign in
      </button>
    );
  }

  const initial = (usage.email ?? "?")[0]?.toUpperCase();
  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="glass rounded-xl px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10"
      >
        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-aurora-violet to-aurora-cyan text-black grid place-items-center text-xs font-bold">
          {initial}
        </span>
        {usage.capMinutes !== null && (
          <span className="text-muted tabular-nums">
            {Math.round(usage.minutesToday)}/{usage.capMinutes}m
          </span>
        )}
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-11 glass rounded-xl p-2 flex flex-col min-w-40 z-30 bg-surface/95">
          <Link href="/history" className="px-3 py-2 text-sm rounded-lg hover:bg-white/10">
            History
          </Link>
          <button onClick={signOut} className="px-3 py-2 text-sm text-left rounded-lg hover:bg-white/10 text-muted">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
