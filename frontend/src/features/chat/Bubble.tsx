import { CircleCheck, Mic, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { currentLanguage } from '../../shared/i18n';
import { speak } from '../voice/speak';
import type { ChatMessage } from './api';
import styles from './Bubble.module.css';
import { messageText } from './messageText';

/** One chat bubble. Its look depends on who wrote it and what kind of message it is. */
export function Bubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const text = messageText(message, t);

  if (message.role === 'child') {
    return (
      <div className={`${styles.bubble} ${styles.child}`}>
        <span className="visually-hidden">{t('chat.you')}: </span>
        <Mic className={styles.icon} aria-hidden="true" />
        <span>{text}</span>
      </div>
    );
  }

  const author = <span className="visually-hidden">{t('chat.assistant')}: </span>;

  if (message.kind === 'task' && message.params.step !== undefined) {
    return (
      <div className={`${styles.bubble} ${styles.task}`}>
        {author}
        <span className={styles.taskLabel}>
          {t('lesson.taskLabel', { n: message.params.step + 1 })}
        </span>
        <p className={styles.taskText}>{text}</p>
        <button
          type="button"
          className={styles.listen}
          onClick={() => speak(text, currentLanguage())}
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
        <span>{text}</span>
      </div>
    );
  }

  // Plain replies and "not understood" replies look the same: calm, never alarming.
  return (
    <div className={`${styles.bubble} ${styles.assistant}`}>
      {author}
      <span>{text}</span>
    </div>
  );
}
