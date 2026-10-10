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

/** Task number shown to the child ("1-тапсырма"), counting from 1. */
export function taskNumber(command: CommandId): number {
  return LESSON_STEPS.indexOf(command) + 1;
}
