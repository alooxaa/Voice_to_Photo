import { useCallback, useEffect, useRef, useState } from 'react';

import { COMMANDS, type CommandId } from './commands';
import type { Bitmap } from './engine';
import { History } from './history';

/** Big uploads are scaled down so each undo step stays a few megabytes. */
const MAX_SIDE = 1600;

export interface Frame {
  bitmap: Bitmap;
  /** Grows with every change; used as the key for the cross-fade animation. */
  version: number;
  /** The change that produced this frame, so the canvas can animate a rotation. */
  change: CommandId | null;
}

function loadBitmap(url: string): Promise<Bitmap> {
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

/** Holds the picture being edited and its undo history. */
export function useEditor(imageUrl: string | null) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [failed, setFailed] = useState(false);
  const history = useRef(new History<Bitmap>());

  useEffect(() => {
    if (!imageUrl) return;
    let active = true;
    loadBitmap(imageUrl)
      .then((bitmap) => active && setFrame({ bitmap, version: 0, change: null }))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [imageUrl]);

  /** Apply an editing command or undo. Returns false when nothing changed. */
  const apply = useCallback(
    (command: CommandId): boolean => {
      if (!frame) return false;

      if (command === 'undo') {
        const previous = history.current.pop();
        if (!previous) return false;
        setFrame({ bitmap: previous, version: frame.version + 1, change: 'undo' });
        return true;
      }

      const transform = COMMANDS[command].transform;
      if (!transform) return false;
      history.current.push(frame.bitmap);
      setFrame({ bitmap: transform(frame.bitmap), version: frame.version + 1, change: command });
      return true;
    },
    [frame],
  );

  return { frame, failed, apply };
}
