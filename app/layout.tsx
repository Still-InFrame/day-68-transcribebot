import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Speak in any of 70+ languages. TranscribeBot live-translates your voice into captions and speech — in under a second.";

export const metadata: Metadata = {
  metadataBase: new URL("https://transcribebot.100dayaichallenge.com"),
  title: "TranscribeBot — Real-time speech translation",
  description: DESCRIPTION,
  openGraph: {
    title: "TranscribeBot — One voice. Every language.",
    description: DESCRIPTION,
    siteName: "TranscribeBot",
    type: "website",
    images: ["/og/og-en.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TranscribeBot — One voice. Every language.",
    description: DESCRIPTION,
    images: ["/og/og-en.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
