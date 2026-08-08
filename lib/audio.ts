// Audio source plumbing. The realtime client only needs a MediaStream — it
// doesn't care whether it came from a live mic or a decoded file, which is
// what makes the no-permission demo/test mode possible.

export async function getMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
}

// Plays a static audio file into a MediaStream (used by ?src= test mode and
// the landing page's "watch it work" demo). Resolves `done` when playback ends.
export async function getFileStream(
  ctx: AudioContext,
  url: string,
): Promise<{
  stream: MediaStream;
  node: AudioBufferSourceNode; // connect the analyser here — routing the
  // destination stream back through createMediaStreamSource in the same
  // context yields silence in Chrome
  done: Promise<void>;
  start: () => void;
  stop: () => void;
}> {
  const buf = await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
  const dest = ctx.createMediaStreamDestination();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(dest);
  let resolveDone: () => void;
  const done = new Promise<void>((r) => (resolveDone = r));
  src.onended = () => resolveDone();
  // Caller starts playback once the realtime session is live — audio played
  // during connection setup would translate into the void.
  return {
    stream: dest.stream,
    node: src,
    done,
    start: () => src.start(),
    // stop() before start() throws InvalidStateError (e.g. connect failed
    // before playback began) — teardown must never explode.
    stop: () => {
      try {
        src.stop();
      } catch {}
    },
  };
}

export function makeAnalyser(
  ctx: AudioContext,
  input: MediaStream | AudioNode,
): AnalyserNode {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.75;
  const node = input instanceof AudioNode ? input : ctx.createMediaStreamSource(input);
  node.connect(analyser);
  return analyser;
}

export function playChime(volume = 0.35) {
  try {
    const a = new Audio("/chime.wav");
    a.volume = volume;
    void a.play().catch(() => {});
  } catch {
    // sound is decorative — never let it break the session
  }
}
