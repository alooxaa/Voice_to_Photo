import { Mic, Square } from 'lucide-react';
import { motion } from 'motion/react';

import styles from './MicButton.module.css';

interface MicButtonProps {
  listening: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}

const pulse = (delay: number) => ({
  animate: { scale: [1, 1.08, 1], opacity: [1, 0.7, 1] },
  transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const, delay },
});

/**
 * The big round microphone. One press starts listening, a second press stops.
 * The two rings are its only "shadow"; they pulse while it listens.
 */
export function MicButton({ listening, disabled = false, label, onPress }: MicButtonProps) {
  return (
    <div className={styles.wrap}>
      <motion.span
        className={`${styles.ring} ${styles.outer}`}
        aria-hidden="true"
        {...(listening ? pulse(0.15) : {})}
      />
      <motion.span
        className={`${styles.ring} ${styles.inner}`}
        aria-hidden="true"
        {...(listening ? pulse(0) : {})}
      />
      <button
        type="button"
        className={styles.mic}
        onClick={onPress}
        disabled={disabled}
        aria-label={label}
        aria-pressed={listening}
      >
        {listening ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
      </button>
    </div>
  );
}
