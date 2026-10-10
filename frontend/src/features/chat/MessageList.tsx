import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import type { ChatMessage } from './api';
import { Bubble } from './Bubble';
import styles from './MessageList.module.css';

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const { t } = useTranslation();
  const list = useRef<HTMLOListElement>(null);
  const reduceMotion = useReducedMotion();
  // Messages loaded with the page appear at once; only new ones rise in.
  const [loadedCount] = useState(messages.length);

  useEffect(() => {
    const element = list.current;
    element?.scrollTo({
      top: element.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [messages.length, reduceMotion]);

  return (
    <ol ref={list} className={styles.list} aria-label={t('chat.messages')} aria-live="polite">
      {messages.map((message, index) => (
        <motion.li
          key={message.id}
          className={styles.item}
          initial={index >= loadedCount ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Bubble message={message} />
        </motion.li>
      ))}
    </ol>
  );
}
