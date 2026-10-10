import { motion, useReducedMotion } from 'motion/react';

import styles from './WorkingNote.module.css';

/** A calm "working on it" note over the photo: it gently pulses and never counts down. */
export function WorkingNote({ text }: { text: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.p
      className={styles.note}
      role="status"
      initial={{ opacity: 0 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: [0.7, 1, 0.7] }}
      transition={reduceMotion ? { duration: 0.2 } : { duration: 1.8, repeat: Infinity }}
    >
      {text}
    </motion.p>
  );
}
