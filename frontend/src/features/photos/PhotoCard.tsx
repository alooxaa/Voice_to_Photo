import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { latestImage, type Photo } from './api';
import styles from './PhotoCard.module.css';
import { photoTitle } from './title';

export function PhotoCard({ photo }: { photo: Photo }) {
  const { t } = useTranslation();
  const title = photoTitle(photo, t);

  return (
    <Link to={`/photos/${photo.id}`} className={styles.card} aria-label={t('home.open', { title })}>
      <img src={latestImage(photo)} alt="" className={styles.thumb} loading="lazy" />
      <span className={styles.footer}>
        <span className={styles.title}>{title}</span>
        {photo.has_chat && (
          <span className={styles.chat}>
            <MessageCircle aria-hidden="true" />
            {t('home.hasChat')}
          </span>
        )}
      </span>
    </Link>
  );
}
