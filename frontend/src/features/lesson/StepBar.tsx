import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import styles from './StepBar.module.css';

interface StepBarProps {
  /** One name per step, read by screen readers. */
  labels: string[];
  step: number;
  finished: boolean;
}

/** One segment per step: done steps are blue, the current one is sun-yellow. */
export function StepBar({ labels, step, finished }: StepBarProps) {
  const { t } = useTranslation();
  const total = labels.length;
  const shown = finished ? total : step + 1;

  return (
    <div className={styles.wrap}>
      <ol className={styles.bar} aria-label={t('lesson.progress')}>
        {labels.map((label, index) => {
          const state = finished || index < step ? 'done' : index === step ? 'current' : 'todo';
          return (
            <li key={label} className={`${styles.step} ${styles[state]}`}>
              {state === 'done' ? <Check aria-hidden="true" /> : index + 1}
              <span className="visually-hidden">{label}</span>
            </li>
          );
        })}
      </ol>
      <p className={styles.caption}>{t('lesson.step', { n: shown, total })}</p>
    </div>
  );
}
