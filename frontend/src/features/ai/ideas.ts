import { Brush, Cat, CloudSnow, Rainbow, SunMedium, type LucideIcon } from 'lucide-react';

/**
 * Ready ideas shown as big tiles, so the child is never stuck in front of an
 * empty screen. The ids match the backend (ai/ideas.py); the words are in the
 * translations under `ai.ideas.<id>`.
 */
export const IDEAS: { id: string; icon: LucideIcon }[] = [
  { id: 'rainbow', icon: Rainbow },
  { id: 'snow', icon: CloudSnow },
  { id: 'cartoon', icon: Brush },
  { id: 'no_sun', icon: SunMedium },
  { id: 'space_cat', icon: Cat },
];

/** The AI studio's lesson: add something, change the style, remove something. */
export const AI_LESSON_STEPS = ['add', 'style', 'remove'] as const;

/** The idea tile that fits each lesson step, highlighted like the current task's tile. */
export const IDEA_FOR_STEP: Record<(typeof AI_LESSON_STEPS)[number], string> = {
  add: 'rainbow',
  style: 'cartoon',
  remove: 'no_sun',
};
