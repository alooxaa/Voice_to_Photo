/**
 * Audio helpers that turn microphone samples into the WAV file Vosk expects:
 * 16 kHz, mono, 16-bit PCM. Doing this in the browser means the backend can
 * read the audio with Python's built-in `wave` module, without ffmpeg.
 */

export const TARGET_RATE = 16000;

/**
 * Lower the sample rate (usually 48 kHz → 16 kHz). Each output sample is the
 * average of the input samples it covers, which also removes the highest
 * frequencies that would otherwise sound like noise after downsampling.
 */
export function downsample(input: Float32Array, fromRate: number, toRate = TARGET_RATE) {
  if (fromRate === toRate) return input.slice();
  const ratio = fromRate / toRate;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.max(start + 1, Math.min(Math.floor((i + 1) * ratio), input.length));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    output[i] = sum / (end - start);
  }
  return output;
}

/** Wrap float samples (-1…1) in a 44-byte WAV header as 16-bit little-endian PCM. */
export function encodeWav(samples: Float32Array, sampleRate = TARGET_RATE): ArrayBuffer {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true); // size of the format block
  view.setUint16(20, 1, true); // 1 = PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // bytes per second
  view.setUint16(32, bytesPerSample, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return buffer;
}

/** Root-mean-square loudness of a block of samples (0 = silence). */
export function loudness(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return samples.length ? Math.sqrt(sum / samples.length) : 0;
}
