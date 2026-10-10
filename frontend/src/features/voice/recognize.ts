import { api } from '../../shared/api/client';
import type { Language } from '../../shared/i18n';
import type { CommandId, Intensity } from '../editor/commands';

export interface Recognition {
  text: string;
  command: CommandId | null;
  intensity: Intensity | null;
}

/**
 * Send the WAV to the backend, where Vosk turns it into text and a command.
 * The "choice" vocabulary listens for keep / discard in the AI studio instead.
 */
export function recognizeSpeech(
  wav: Blob,
  language: Language,
  vocabulary: 'commands' | 'choice' = 'commands',
): Promise<Recognition> {
  const form = new FormData();
  form.append('audio', wav, 'speech.wav');
  form.append('lang', language);
  form.append('vocabulary', vocabulary);
  return api<Recognition>('speech/recognize/', { method: 'POST', body: form });
}
