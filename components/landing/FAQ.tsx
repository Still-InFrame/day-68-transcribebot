const ITEMS: Array<[string, string]> = [
  [
    "What happens to my audio?",
    "It streams to OpenAI's realtime translation API, gets translated on the fly, and is not stored. Captions exist only on your screen — unless you're signed in and a session finishes, in which case the transcript (text only, never audio) is saved to your private history.",
  ],
  [
    "Which languages does it support?",
    "It auto-detects speech in 70+ languages and translates into 13: English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, Hindi, Arabic, Russian, Dutch, and Polish.",
  ],
  [
    "How fast is it, really?",
    "Captions typically run 0.6–1.2 seconds behind the speaker — the meter in the app shows the live number, measured, not marketed.",
  ],
  [
    "Is the translation perfect?",
    "No live translation is. It's very good for talks, meetings, travel, and classrooms — but for medical, legal, or safety-critical conversations, use a professional interpreter.",
  ],
  [
    "Does it work offline?",
    "No — translation runs in the cloud, so you need a connection. If it drops mid-session, your captions stay put and the session reconnects automatically.",
  ],
];

export default function FAQ() {
  return (
    <section id="faq" className="max-w-2xl mx-auto px-4 py-16">
      <h2 className="text-3xl font-semibold tracking-tight pb-8">Questions, answered</h2>
      <div className="space-y-3">
        {ITEMS.map(([q, a]) => (
          <details key={q} className="glass rounded-xl px-5 py-4 group">
            <summary className="cursor-pointer font-medium list-none flex items-center">
              <span className="flex-1">{q}</span>
              <span className="text-muted group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-muted leading-relaxed pt-3">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
