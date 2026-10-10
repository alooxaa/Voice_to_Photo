import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import type { Bitmap } from './engine';
import type { Frame } from './useEditor';
import styles from './PhotoCanvas.module.css';

function BitmapCanvas({ bitmap, label }: { bitmap: Bitmap; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    element.width = bitmap.width;
    element.height = bitmap.height;
    element
      .getContext('2d')
      ?.putImageData(new ImageData(bitmap.data, bitmap.width, bitmap.height), 0, 0);
  }, [bitmap]);

  return <canvas ref={canvas} className={styles.canvas} role="img" aria-label={label} />;
}

/** How far a new frame starts turned, so it visibly rotates into place. */
const TURN: Partial<Record<string, number>> = { rotate: -90, rotate_left: 90 };

/**
 * Shows the current frame. On every change the new picture cross-fades over
 * the old one; after a rotation it also turns into place.
 */
export function PhotoCanvas({ frame, label }: { frame: Frame; label: string }) {
  const turn = (frame.change && TURN[frame.change]) ?? 0;
  const turning = turn !== 0;

  return (
    <div className={styles.stage}>
      <AnimatePresence initial={false}>
        <motion.div
          key={frame.version}
          className={styles.layer}
          initial={{ opacity: 0, rotate: turn }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: turning ? 0.4 : 0.3, ease: 'easeOut' }}
        >
          <BitmapCanvas bitmap={frame.bitmap} label={label} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
