import { api } from '../../shared/api/client';
import type { Language } from '../../shared/i18n';
import type { CommandId } from '../editor/commands';

export interface Recognition {
  text: string;
  command: CommandId | null;
}

/** Send the WAV to the backend, where Vosk turns it into text and a command. */
export function recognizeSpeech(wav: Blob, language: Language): Promise<Recognition> {
  const form = new FormData();
  form.append('audio', wav, 'speech.wav');
  form.append('lang', language);
  return api<Recognition>('speech/recognize/', { method: 'POST', body: form });
}
