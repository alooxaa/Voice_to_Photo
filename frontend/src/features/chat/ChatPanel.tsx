import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { StepBar } from '../lesson/StepBar';
import type { ChatMessage, LessonProgress } from './api';
import styles from './ChatPanel.module.css';
import { MessageList } from './MessageList';

interface ChatPanelProps {
  title: string;
  thumbnailUrl: string;
  messages: ChatMessage[];
  progress: LessonProgress;
  /** The composer: microphone and its status. There is no text input. */
  composer: ReactNode;
}

export function ChatPanel({ title, thumbnailUrl, messages, progress, composer }: ChatPanelProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.panel} aria-labelledby="chat-title">
      <header className={styles.header}>
        <div className={styles.identity}>
          <img src={thumbnailUrl} alt="" className={styles.thumb} />
          <div>
            <h2 id="chat-title" className={styles.title}>
              {title}
            </h2>
            <p className={styles.subtitle}>{t('chat.title')}</p>
          </div>
        </div>
        <StepBar step={progress.current_step} finished={progress.finished} />
        {progress.finished && <p className={styles.free}>{t('editor.freeMode')}</p>}
      </header>
      <MessageList messages={messages} />
      <footer className={styles.composer}>{composer}</footer>
    </section>
  );
}
