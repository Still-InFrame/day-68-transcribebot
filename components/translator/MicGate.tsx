"use client";

// Pre-permission explainer (shown BEFORE the browser prompt — this measurably
// improves grant rates) and the recovery guidance if access was denied.

function browserHelp(): string {
  const ua = navigator.userAgent;
  if (/firefox/i.test(ua))
    return "Click the microphone icon in the address bar and choose “Allow”, then reload.";
  if (/safari/i.test(ua) && !/chrome|chromium|crios/i.test(ua))
    return "Open Safari → Settings for This Website → Microphone → Allow, then reload.";
  return "Click the camera/mic icon at the right of the address bar, allow the microphone, then reload.";
}

export default function MicGate({
  mode,
  onProceed,
  onCancel,
}: {
  mode: "explain" | "denied";
  onProceed: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="glass rounded-2xl max-w-md w-full p-6 space-y-4">
        {mode === "explain" ? (
          <>
            <h2 className="text-lg font-semibold">One thing before we start</h2>
            <p className="text-sm text-muted leading-relaxed">
              TranscribeBot needs your microphone to translate. Your audio is
              streamed to OpenAI for live translation and{" "}
              <span className="text-foreground">is not stored</span> — captions
              only exist on this screen unless you export them.
            </p>
            <p className="text-sm text-muted">
              Your browser will ask for permission next.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={onProceed}
                className="flex-1 rounded-xl py-2.5 font-medium bg-gradient-to-r from-aurora-violet to-aurora-cyan text-black hover:opacity-90 transition"
              >
                Enable microphone
              </button>
              <button onClick={onCancel} className="glass rounded-xl px-4 text-sm hover:bg-white/10">
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Microphone is blocked</h2>
            <p className="text-sm text-muted leading-relaxed">{browserHelp()}</p>
            <button onClick={onCancel} className="glass rounded-xl px-4 py-2 text-sm hover:bg-white/10">
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
