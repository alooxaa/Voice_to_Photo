/**
 * Decides when to stop listening, so the child never has to hold a button:
 * after about 1.5 s of quiet following speech, or after 6 s in total.
 */

export const SILENCE_MS = 1500;
export const MAX_MS = 6000;
/** Loudness above this counts as voice. Browsers boost the microphone, so speech is well above it. */
export const VOICE_LEVEL = 0.015;

export class SilenceDetector {
  heardSpeech = false;
  private elapsedMs = 0;
  private quietMs = 0;

  /** Feed the loudness of the next block of audio; returns true when it is time to stop. */
  feed(level: number, blockMs: number): boolean {
    this.elapsedMs += blockMs;
    if (level >= VOICE_LEVEL) {
      this.heardSpeech = true;
      this.quietMs = 0;
    } else {
      this.quietMs += blockMs;
    }
    // Before the child starts talking we wait the full 6 s; nothing is rushed.
    const pausedAfterSpeech = this.heardSpeech && this.quietMs >= SILENCE_MS;
    return pausedAfterSpeech || this.elapsedMs >= MAX_MS;
  }
}
