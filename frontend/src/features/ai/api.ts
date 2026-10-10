import { api } from '../../shared/api/client';
import type { Language } from '../../shared/i18n';
import type { ChatMessage, LessonProgress } from '../chat/api';
import type { CommandId } from '../editor/commands';
import type { Photo } from '../photos/api';

/** A picture the AI made; it is only a proposal until the child keeps it. */
export interface AiResult {
  id: number;
  kind: 'edit' | 'generate';
  url: string;
  decision: 'pending' | 'kept' | 'discarded';
}

export interface AiStatus {
  /** Both a text and an image service are connected in the backend's .env. */
  ready: boolean;
  /** AI requests this child may still make today. */
  remaining: number;
}

export interface AiAnswer {
  transcript: string;
  intent: 'edit' | 'generate' | 'local_command' | 'unclear' | 'refused';
  /** For "local_command": the editing command to run instead of the AI. */
  command: CommandId | null;
  messages: ChatMessage[];
  result: AiResult | null;
  remaining: number;
}

export interface AiDecision {
  result: AiResult;
  messages: ChatMessage[];
  progress: LessonProgress;
  /** A kept new picture became this photo. */
  new_photo: Photo | null;
}

/** What the child asks with: their voice, or a pressed idea tile. */
export type AiInput = { audio: Blob } | { idea: string };

export const aiApi = {
  status: () => api<AiStatus>('ai/status/'),

  ask: (photoId: number, input: AiInput, picture: Blob, language: Language) => {
    const form = new FormData();
    form.append('lang', language);
    form.append('image', picture, 'photo.png');
    if ('audio' in input) form.append('audio', input.audio, 'speech.wav');
    else form.append('idea', input.idea);
    return api<AiAnswer>(`photos/${photoId}/ai/`, { method: 'POST', body: form });
  },

  decide: (photoId: number, resultId: number, keep: boolean) =>
    api<AiDecision>(`photos/${photoId}/ai/results/${resultId}/`, {
      method: 'POST',
      body: { keep },
    }),
};
