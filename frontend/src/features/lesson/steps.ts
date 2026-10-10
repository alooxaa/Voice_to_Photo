import type { CommandId } from '../editor/commands';

/** The guided lesson, in order. The backend uses the same order (chats/assistant.py). */
export const LESSON_STEPS: readonly CommandId[] = [
  'brighten',
  'darken',
  'grayscale',
  'undo',
  'rotate',
  'save',
];
