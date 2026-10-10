import { Images, Pencil, Save, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button, ButtonLink } from '../../shared/ui/Button';
import { PhotoCanvas } from '../editor/PhotoCanvas';
import type { Frame } from '../editor/useEditor';
import { LESSON_STEPS } from './steps';
import styles from './FinishView.module.css';

interface FinishViewProps {
  originalUrl: string;
  frame: Frame;
  busy: boolean;
  onSave: () => void;
  onContinue: () => void;
}

/** Shown once, right after the sixth task: before/after, the words learned, what next. */
export function FinishView({ originalUrl, frame, busy, onSave, onContinue }: FinishViewProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.finish} aria-labelledby="finish-title">
      <div className={styles.heading}>
        <motion.span
          className={styles.badge}
          aria-hidden="true"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <Sparkles />
        </motion.span>
        <h2 id="finish-title" className={styles.title}>
          {t('finish.title')}
        </h2>
      </div>

      <div className={styles.compare}>
        <figure className={styles.figure}>
          <img src={originalUrl} alt="" className={styles.image} />
          <figcaption>{t('finish.before')}</figcaption>
        </figure>
        <figure className={styles.figure}>
          <PhotoCanvas frame={frame} label={t('finish.after')} />
          <figcaption>{t('finish.after')}</figcaption>
        </figure>
      </div>

      <div>
        <h3 className={styles.wordsTitle}>{t('finish.words')}</h3>
        <ul className={styles.words}>
          {LESSON_STEPS.map((command, index) => (
            <motion.li
              key={command}
              className={styles.word}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * index, ease: 'easeOut' }}
            >
              {t(`commands.${command}.label`)}
            </motion.li>
          ))}
        </ul>
      </div>

      <div className={styles.actions}>
        <Button icon={<Save aria-hidden="true" />} onClick={onSave} disabled={busy}>
          {t('finish.save')}
        </Button>
        <ButtonLink to="/" variant="secondary" icon={<Images aria-hidden="true" />}>
          {t('finish.another')}
        </ButtonLink>
        <Button variant="quiet" icon={<Pencil aria-hidden="true" />} onClick={onContinue}>
          {t('finish.continue')}
        </Button>
      </div>
    </section>
  );
}
