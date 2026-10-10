import { useId, type ChangeEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import styles from './UploadCard.module.css';

interface UploadCardProps {
  busy: boolean;
  onFile: (file: File) => void;
}

/** A dashed card that opens the file picker. The whole card is the target. */
export function UploadCard({ busy, onFile }: UploadCardProps) {
  const { t } = useTranslation();
  const id = useId();

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow choosing the same file again later
    if (file) onFile(file);
  }

  return (
    <div className={styles.card}>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className={`visually-hidden ${styles.input}`}
        onChange={choose}
        disabled={busy}
      />
      <label htmlFor={id} className={styles.label}>
        <ImagePlus aria-hidden="true" />
        <span>{busy ? t('home.uploading') : t('home.upload')}</span>
      </label>
    </div>
  );
}
