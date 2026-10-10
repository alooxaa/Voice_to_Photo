import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LESSON_STEPS } from './steps';
import styles from './StepBar.module.css';

/** Six segments: done steps are blue, the current one is sun-yellow. */
export function StepBar({ step, finished }: { step: number; finished: boolean }) {
  const { t } = useTranslation();
  const total = LESSON_STEPS.length;
  const shown = finished ? total : step + 1;

  return (
    <div className={styles.wrap}>
      <ol className={styles.bar} aria-label={t('lesson.progress')}>
        {LESSON_STEPS.map((command, index) => {
          const state = finished || index < step ? 'done' : index === step ? 'current' : 'todo';
          return (
            <li key={command} className={`${styles.step} ${styles[state]}`}>
              {state === 'done' ? <Check aria-hidden="true" /> : index + 1}
              <span className="visually-hidden">{t(`commands.${command}.label`)}</span>
            </li>
          );
        })}
      </ol>
      <p className={styles.caption}>{t('lesson.step', { n: shown, total })}</p>
    </div>
  );
}
