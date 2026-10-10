import type { CommandId } from '../editor/commands';

/**
 * The guided lesson, in order: one tool from each group, so the child meets
 * every kind of tool once. The backend uses the same order (chats/assistant.py).
 */
export const LESSON_STEPS: readonly CommandId[] = [
  'brighten',
  'grayscale',
  'rotate',
  'blur',
  'undo',
  'auto_enhance',
];
