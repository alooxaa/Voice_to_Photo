import { Contrast, RotateCw, Save, Sun, SunDim, Undo2, type LucideIcon } from 'lucide-react';

import { adjustBrightness, grayscale, rotateClockwise, type Bitmap } from './engine';

/**
 * The single command registry. Voice, tiles and chat all refer to commands
 * by these ids. Labels and spoken phrases live in the translation files under
 * `commands.<id>`, so each language has its own words for the same command.
 */
export const COMMAND_IDS = ['brighten', 'darken', 'grayscale', 'rotate', 'undo', 'save'] as const;
export type CommandId = (typeof COMMAND_IDS)[number];

interface CommandDefinition {
  icon: LucideIcon;
  /** Pixel change for editing commands; undo and save are handled by the editor. */
  transform?: (image: Bitmap) => Bitmap;
}

export const COMMANDS: Record<CommandId, CommandDefinition> = {
  brighten: { icon: Sun, transform: (image) => adjustBrightness(image, 1.15) },
  darken: { icon: SunDim, transform: (image) => adjustBrightness(image, 0.85) },
  grayscale: { icon: Contrast, transform: grayscale },
  rotate: { icon: RotateCw, transform: rotateClockwise },
  undo: { icon: Undo2 },
  save: { icon: Save },
};

export function isCommandId(value: unknown): value is CommandId {
  return COMMAND_IDS.includes(value as CommandId);
}
