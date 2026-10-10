import type { ReactNode } from 'react';
import { motion } from 'motion/react';

import styles from './Tile.module.css';

interface TileProps {
  icon: ReactNode;
  label: string;
  /** The tile for the current task is highlighted. */
  current?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function Tile({ icon, label, current = false, disabled = false, onPress }: TileProps) {
  return (
    <motion.button
      type="button"
      className={[styles.tile, current && styles.current].filter(Boolean).join(' ')}
      onClick={onPress}
      disabled={disabled}
      // A gentle press response; it does not move the tile away from the finger.
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
    </motion.button>
  );
}
