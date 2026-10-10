import type { Language } from '../../shared/i18n';

/**
 * Spoken feedback with the browser's free speech synthesis.
 * Many computers have no Kazakh voice; then we stay silent and the child
 * relies on the text on screen. We never read Kazakh with a Russian voice,
 * because the pronunciation would teach the wrong sounds.
 */

function voiceFor(language: Language): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith(language));
}

export function speak(text: string, language: Language): void {
  if (!('speechSynthesis' in window) || !text) return;
  const voice = voiceFor(language);
  if (!voice) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.9; // a little slower than default, easier to follow
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
