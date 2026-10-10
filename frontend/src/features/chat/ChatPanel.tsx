import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { ChatMessage } from './api';
import styles from './ChatPanel.module.css';
import { MessageList } from './MessageList';

interface ChatPanelProps {
  title: string;
  thumbnailUrl: string;
  messages: ChatMessage[];
  /** The composer: microphone and its status. There is no text input. */
  composer: ReactNode;
}

/** The chat card: a short header, the messages (the only part that scrolls) and the microphone. */
export function ChatPanel({ title, thumbnailUrl, messages, composer }: ChatPanelProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.panel} aria-labelledby="chat-title">
      <header className={styles.header}>
        <img src={thumbnailUrl} alt="" className={styles.thumb} />
        <div>
          <h2 id="chat-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.subtitle}>{t('chat.title')}</p>
        </div>
      </header>
      <MessageList messages={messages} />
      <footer className={styles.composer}>{composer}</footer>
    </section>
  );
}
