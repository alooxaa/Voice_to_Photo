import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { currentLanguage } from '../../shared/i18n';
import { Button } from '../../shared/ui/Button';
import type { CommandId } from '../editor/commands';
import { speak } from '../voice/speak';
import styles from './TaskCard.module.css';

/** The task shown before the chat opens: "1-тапсырма: «Жарық қыл» деп айт". */
export function TaskCard({ command, step }: { command: CommandId; step: number }) {
  const { t } = useTranslation();
  const task = t('lesson.task', { label: t(`commands.${command}.label`) });

  return (
    <div className={styles.card}>
      <p className={styles.label}>{t('lesson.taskLabel', { n: step + 1 })}</p>
      <p className={styles.task}>{task}</p>
      <Button
        variant="secondary"
        icon={<Volume2 aria-hidden="true" />}
        onClick={() => speak(task, currentLanguage())}
      >
        {t('lesson.listen')}
      </Button>
    </div>
  );
}
