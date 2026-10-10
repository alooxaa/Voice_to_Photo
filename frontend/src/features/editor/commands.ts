import {
  Aperture,
  Blend,
  CircleDashed,
  Contrast,
  Crop,
  Droplet,
  Eclipse,
  Eraser,
  Flame,
  FlipHorizontal2,
  FlipVertical2,
  Grid3x3,
  History as HistoryIcon,
  Palette,
  Redo2,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Save,
  Snowflake,
  Sun,
  SunDim,
  SunMedium,
  Undo2,
  Wand2,
  Waves,
  ZoomIn,
  type LucideIcon,
} from 'lucide-react';

import vocabulary from '../../../../shared/commands.json';
import type { Language } from '../../shared/i18n';
import * as engine from './engine';
import type { Bitmap } from './engine';

/**
 * The single command registry. Voice, tiles and chat all refer to commands by
 * these ids. The ids, groups, labels and spoken phrases come from
 * `shared/commands.json`, the file the backend reads too. This module adds
 * what only the browser needs: an icon and the pixel operation.
 */
export type CommandId = keyof typeof vocabulary.commands;
export const COMMAND_IDS = Object.keys(vocabulary.commands) as CommandId[];

/** Groups shown as tabs; "control" commands (undo, redo, start over, save) are always visible. */
export const TOOL_GROUPS = ['light', 'colour', 'shape', 'effects', 'smart'] as const;
export type GroupId = (typeof TOOL_GROUPS)[number] | 'control';

/** "сәл" / "чуть" / "a little" make an effect weaker, "өте" / "очень" / "much" stronger. */
export type Intensity = 'little' | 'lot';
const STRENGTH: Record<Intensity | 'normal', number> = { little: 0.5, normal: 1, lot: 2 };

type Transform = (image: Bitmap, strength: number) => Bitmap;

interface CommandDefinition {
  icon: LucideIcon;
  /** Pixel change done in the browser. Commands without one are handled by the editor. */
  transform?: Transform;
}

/** Longest side of the picture, used to scale effects to the photo's size. */
const side = (image: Bitmap) => Math.max(image.width, image.height);

export const COMMANDS: Record<CommandId, CommandDefinition> = {
  brighten: { icon: Sun, transform: (image, s) => engine.adjustBrightness(image, 1 + 0.15 * s) },
  darken: { icon: SunDim, transform: (image, s) => engine.adjustBrightness(image, 1 - 0.13 * s) },
  contrast_up: {
    icon: Contrast,
    transform: (image, s) => engine.adjustContrast(image, 1 + 0.25 * s),
  },
  contrast_down: {
    icon: CircleDashed,
    transform: (image, s) => engine.adjustContrast(image, 1 - 0.18 * s),
  },
  saturate: {
    icon: Palette,
    transform: (image, s) => engine.adjustSaturation(image, 1 + 0.35 * s),
  },
  desaturate: {
    icon: Droplet,
    transform: (image, s) => engine.adjustSaturation(image, Math.max(0, 1 - 0.3 * s)),
  },
  grayscale: { icon: Eclipse, transform: engine.grayscale },
  sepia: { icon: HistoryIcon, transform: engine.sepia },
  warmer: { icon: Flame, transform: (image, s) => engine.adjustTemperature(image, 18 * s) },
  cooler: { icon: Snowflake, transform: (image, s) => engine.adjustTemperature(image, -18 * s) },
  invert: { icon: Blend, transform: engine.invert },
  rotate: { icon: RotateCw, transform: engine.rotateClockwise },
  rotate_left: { icon: RotateCcw, transform: engine.rotateCounterClockwise },
  flip_horizontal: { icon: FlipVertical2, transform: engine.flipHorizontal },
  flip_vertical: { icon: FlipHorizontal2, transform: engine.flipVertical },
  crop_square: { icon: Crop, transform: engine.cropSquare },
  zoom_in: { icon: ZoomIn, transform: (image) => engine.zoomIn(image, 0.9) },
  blur: { icon: Waves, transform: (image, s) => engine.blur(image, (side(image) / 250) * s) },
  sharpen: { icon: Aperture, transform: (image, s) => engine.sharpen(image, 0.9 * s) },
  vignette: { icon: SunMedium, transform: (image, s) => engine.vignette(image, 0.45 * s) },
  pixelate: {
    icon: Grid3x3,
    transform: (image, s) => engine.pixelate(image, (side(image) / 70) * s),
  },
  // Done by the backend's local model, so the editor sends the picture there.
  remove_background: { icon: Eraser },
  auto_enhance: { icon: Wand2, transform: engine.autoEnhance },
  undo: { icon: Undo2 },
  redo: { icon: Redo2 },
  reset: { icon: RefreshCcw },
  save: { icon: Save },
};

export function isCommandId(value: unknown): value is CommandId {
  return COMMAND_IDS.includes(value as CommandId);
}

export function groupOf(command: CommandId): GroupId {
  return vocabulary.commands[command].group as GroupId;
}

export function commandsIn(group: GroupId): CommandId[] {
  return COMMAND_IDS.filter((command) => groupOf(command) === group);
}

/** Everything a child may say for the command in this language. */
export function phrasesOf(command: CommandId, language: Language): string[] {
  return vocabulary.commands[command][language].say;
}

/** How strongly to apply an adjustable command; other commands ignore the intensity. */
export function strengthOf(command: CommandId, intensity: Intensity | null): number {
  const adjustable = 'adjustable' in vocabulary.commands[command];
  return adjustable && intensity ? STRENGTH[intensity] : STRENGTH.normal;
}
