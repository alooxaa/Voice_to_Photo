import { CircleCheck, Mic, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { currentLanguage } from '../../shared/i18n';
import { taskNumber } from '../lesson/steps';
import { speak } from '../voice/speak';
import type { ChatMessage } from './api';
import styles from './Bubble.module.css';

/** One chat bubble. Its look depends on who wrote it and what kind of message it is. */
export function Bubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();

  if (message.role === 'child') {
    return (
      <div className={`${styles.bubble} ${styles.child}`}>
        <span className="visually-hidden">{t('chat.you')}: </span>
        <Mic className={styles.icon} aria-hidden="true" />
        {/* Speech that matched no command arrives as empty text. */}
        <span>{message.text || '…'}</span>
      </div>
    );
  }

  const author = <span className="visually-hidden">{t('chat.assistant')}: </span>;

  if (message.kind === 'task' && message.command) {
    return (
      <div className={`${styles.bubble} ${styles.task}`}>
        {author}
        <span className={styles.taskLabel}>
          {t('lesson.taskLabel', { n: taskNumber(message.command) })}
        </span>
        <p className={styles.taskText}>{message.text}</p>
        <button
          type="button"
          className={styles.listen}
          onClick={() => speak(message.text, currentLanguage())}
        >
          <Volume2 aria-hidden="true" />
          {t('lesson.listen')}
        </button>
      </div>
    );
  }

  if (message.kind === 'praise') {
    return (
      <div className={`${styles.bubble} ${styles.praise}`}>
        {author}
        <CircleCheck className={styles.icon} aria-hidden="true" />
        <span>{message.text}</span>
      </div>
    );
  }

  // Plain replies and "not understood" replies look the same: calm, never alarming.
  return (
    <div className={`${styles.bubble} ${styles.assistant}`}>
      {author}
      <span>{message.text}</span>
    </div>
  );
}
