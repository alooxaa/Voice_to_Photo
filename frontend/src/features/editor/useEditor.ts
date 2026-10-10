import { useCallback, useEffect, useRef, useState } from 'react';

import { removeBackground } from './api';
import { COMMANDS, strengthOf, type CommandId, type Intensity } from './commands';
import type { Bitmap } from './engine';
import { History } from './history';

/** Big uploads are scaled down so each undo step stays a few megabytes. */
const MAX_SIDE = 1600;

/** What produced a frame: a command, or a picture made by the AI studio. */
export type Change = CommandId | 'ai';

export interface Frame {
  bitmap: Bitmap;
  /** Grows with every change; used as the key for the cross-fade animation. */
  version: number;
  /** The change that produced this frame, so the canvas can animate a rotation. */
  change: Change | null;
}

/** Load an image (a URL or a blob URL) into a bitmap the editor can change. */
export function loadBitmap(url: string): Promise<Bitmap> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Canvas is not available'));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(context.getImageData(0, 0, canvas.width, canvas.height));
    };
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

export async function loadBitmapFromBlob(blob: Blob): Promise<Bitmap> {
  const url = URL.createObjectURL(blob);
  try {
    return await loadBitmap(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function bitmapToBlob(bitmap: Bitmap): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  context?.putImageData(new ImageData(bitmap.data, bitmap.width, bitmap.height), 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))),
      'image/png',
    ),
  );
}

/**
 * Holds the picture being edited and its undo/redo history.
 * `imageUrl` is where editing starts (the last saved version); `originalUrl`
 * is the untouched upload that "start over" goes back to.
 */
export function useEditor(imageUrl: string | null, originalUrl: string | null) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [failed, setFailed] = useState(false);
  const history = useRef(new History<Bitmap>());
  // The latest frame, for changes that finish after an await.
  const current = useRef<Frame | null>(null);

  const show = useCallback((bitmap: Bitmap, change: Change | null) => {
    const next = { bitmap, version: (current.current?.version ?? -1) + 1, change };
    current.current = next;
    setFrame(next);
  }, []);

  useEffect(() => {
    if (!imageUrl) return;
    let active = true;
    loadBitmap(imageUrl)
      .then((bitmap) => active && show(bitmap, null))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [imageUrl, show]);

  /** Put a new picture on screen and remember the old one for undo. */
  const replace = useCallback(
    (bitmap: Bitmap, change: Change) => {
      if (!current.current) return;
      history.current.push(current.current.bitmap);
      show(bitmap, change);
    },
    [show],
  );

  /**
   * Apply an editing command, undo, redo or start over. Resolves to false
   * when nothing changed (nothing to undo, for example). Background removal
   * waits for the backend, so this is asynchronous.
   */
  const apply = useCallback(
    async (command: CommandId, intensity: Intensity | null = null): Promise<boolean> => {
      const now = current.current;
      if (!now) return false;

      if (command === 'undo' || command === 'redo') {
        const bitmap =
          command === 'undo' ? history.current.undo(now.bitmap) : history.current.redo(now.bitmap);
        if (!bitmap) return false;
        show(bitmap, command);
        return true;
      }
      if (command === 'reset') {
        if (!originalUrl) return false;
        replace(await loadBitmap(originalUrl), command);
        return true;
      }
      if (command === 'remove_background') {
        const result = await removeBackground(await bitmapToBlob(now.bitmap));
        replace(await loadBitmapFromBlob(result), command);
        return true;
      }

      const transform = COMMANDS[command].transform;
      if (!transform) return false;
      replace(transform(now.bitmap, strengthOf(command, intensity)), command);
      return true;
    },
    [originalUrl, replace, show],
  );

  return { frame, failed, apply, replace };
}
