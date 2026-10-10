import { SilenceDetector } from './silence';
import { downsample, encodeWav, loudness } from './wav';

export class MicBlockedError extends Error {}
export class MicUnsupportedError extends Error {}

export interface Recording {
  /** Stop early (the child pressed the microphone again). */
  stop: () => void;
  /** The WAV file, or null when no voice was heard at all. */
  finished: Promise<Blob | null>;
}

/**
 * Start listening to the microphone. Listening stops by itself after a pause
 * in speech or after 6 seconds, or when `stop()` is called.
 */
export async function startRecording(): Promise<Recording> {
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
    throw new MicUnsupportedError();
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
  } catch {
    throw new MicBlockedError();
  }

  const context = new AudioContext();
  await context.audioWorklet.addModule('/capture-worklet.js');
  const source = context.createMediaStreamSource(stream);
  const capture = new AudioWorkletNode(context, 'capture');
  source.connect(capture);
  // The worklet writes no output, so this only keeps it running: nothing is heard.
  capture.connect(context.destination);

  const blocks: Float32Array[] = [];
  const detector = new SilenceDetector();
  let resolve: (wav: Blob | null) => void = () => {};
  const finished = new Promise<Blob | null>((done) => (resolve = done));
  let stopped = false;

  function stop() {
    if (stopped) return;
    stopped = true;
    capture.port.onmessage = null;
    source.disconnect();
    capture.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void context.close();

    if (!detector.heardSpeech) return resolve(null);
    const samples = new Float32Array(blocks.reduce((size, block) => size + block.length, 0));
    let offset = 0;
    for (const block of blocks) {
      samples.set(block, offset);
      offset += block.length;
    }
    const wav = encodeWav(downsample(samples, context.sampleRate));
    resolve(new Blob([wav], { type: 'audio/wav' }));
  }

  capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
    blocks.push(event.data);
    const blockMs = (event.data.length / context.sampleRate) * 1000;
    if (detector.feed(loudness(event.data), blockMs)) stop();
  };

  return { stop, finished };
}
