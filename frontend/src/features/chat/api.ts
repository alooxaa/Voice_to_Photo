import { api } from '../../shared/api/client';
import type { Language } from '../../shared/i18n';
import type { CommandId } from '../editor/commands';

export interface ChatMessage {
  id: number;
  role: 'child' | 'assistant';
  kind: 'text' | 'task' | 'praise' | 'retry';
  text: string;
  command: CommandId | null;
  created: string;
}

export interface LessonProgress {
  current_step: number;
  finished: boolean;
}

export interface ChildRequest {
  /** What was heard, or the tile's label when a tile was pressed. */
  text: string;
  command: CommandId | null;
}

export const chatApi = {
  messages: (photoId: number) => api<ChatMessage[]>(`photos/${photoId}/messages/`),

  progress: (photoId: number) => api<LessonProgress>(`photos/${photoId}/progress/`),

  /** Record what the child did; the backend answers with the assistant's reply. */
  send: (photoId: number, request: ChildRequest, lang: Language) =>
    api<{ messages: ChatMessage[]; progress: LessonProgress }>(`photos/${photoId}/messages/`, {
      method: 'POST',
      body: { ...request, lang },
    }),
};
