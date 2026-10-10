import { api } from '../../shared/api/client';
import type { AiResult } from '../ai/api';
import type { CommandId } from '../editor/commands';

/** Values the assistant's reply templates are filled with (see chats/assistant.py). */
export interface MessageParams {
  step?: number;
  heard?: string;
  expected?: CommandId;
  examples?: CommandId[];
  /** The idea tile the child pressed in the AI studio. */
  idea?: string;
}

export interface ChatMessage {
  id: number;
  role: 'child' | 'assistant';
  kind: 'text' | 'task' | 'praise' | 'retry' | 'result';
  /** Template of an assistant reply; empty for the child's own words. */
  key: string;
  params: MessageParams;
  /** The child's words as heard; empty when speech was caught but not understood. */
  text: string;
  command: CommandId | null;
  /** A picture made in the AI studio, for "result" messages. */
  result: AiResult | null;
  created: string;
}

export interface LessonProgress {
  current_step: number;
  finished: boolean;
  /** The AI studio's own three-step lesson. */
  ai_step: number;
  ai_finished: boolean;
}

export interface ChildRequest {
  /** What was heard; empty for a tile press or speech that was not understood. */
  text: string;
  command: CommandId | null;
  /** "ai": a simple command the child asked for in the AI studio (no lesson task follows). */
  source?: 'voice' | 'tile' | 'ai';
}

export const chatApi = {
  messages: (photoId: number) => api<ChatMessage[]>(`photos/${photoId}/messages/`),

  progress: (photoId: number) => api<LessonProgress>(`photos/${photoId}/progress/`),

  /** Record what the child did; the backend answers with the assistant's reply. */
  send: (photoId: number, request: ChildRequest) =>
    api<{ messages: ChatMessage[]; progress: LessonProgress }>(`photos/${photoId}/messages/`, {
      method: 'POST',
      body: { ...request },
    }),
};
