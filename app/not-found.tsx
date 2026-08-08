import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <div className="text-center space-y-4">
        <p className="text-6xl font-semibold aurora-text">404</p>
        <p className="text-muted">That page didn&apos;t translate.</p>
        <Link href="/" className="inline-block glass rounded-xl px-4 py-2 hover:bg-white/10 transition">
          ← Back home
        </Link>
      </div>
    </main>
  );
}
