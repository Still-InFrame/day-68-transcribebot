const ROWS: Array<[string, boolean, string]> = [
  ["Live dual-language captions, word by word", true, "Phrase-at-a-time"],
  ["Stage mode for projectors and second screens", true, "—"],
  ["Timestamped transcripts, TXT + SRT export", true, "—"],
  ["Session history you can revisit", true, "—"],
  ["Translated voice playback", true, "Yes"],
  ["Works in the browser, nothing to install", true, "App required"],
];

export default function Comparison() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-16">
      <h2 className="text-3xl font-semibold tracking-tight pb-2">
        Built for rooms, not just phones
      </h2>
      <p className="text-muted pb-8 max-w-xl">
        Phrasebook apps are great for ordering coffee. TranscribeBot is built
        for the moments where everyone needs to follow along — talks, meetings,
        services, classrooms.
      </p>
      <div className="glass rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-130">
          <thead>
            <tr className="text-muted">
              <th className="text-left font-normal p-4"> </th>
              <th className="text-left font-semibold p-4 text-foreground">TranscribeBot</th>
              <th className="text-left font-normal p-4">Typical translate app</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, us, them]) => (
              <tr key={label} className="border-t border-white/5">
                <td className="p-4 text-muted">{label}</td>
                <td className="p-4">{us ? <span className="text-emerald-400">✓</span> : "—"}</td>
                <td className="p-4 text-muted">{them}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
