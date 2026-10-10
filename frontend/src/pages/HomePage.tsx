import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../features/auth/store';
import { photosApi, type Photo } from '../features/photos/api';
import { PhotoCard } from '../features/photos/PhotoCard';
import { UploadCard } from '../features/photos/UploadCard';
import { Notice } from '../shared/ui/Notice';
import styles from './HomePage.module.css';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const name = useAuth((state) => state.profile?.display_name ?? '');
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [problem, setProblem] = useState<'network' | 'upload_failed' | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    photosApi
      .list()
      .then(setPhotos)
      .catch(() => setProblem('network'));
  }, []);

  async function upload(file: File) {
    setUploading(true);
    setProblem(null);
    try {
      const photo = await photosApi.upload(file);
      navigate(`/photos/${photo.id}`);
    } catch {
      setProblem('upload_failed');
      setUploading(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1 className={styles.greeting}>{t('home.greeting', { name })}</h1>
        <p className={styles.lead}>{t('home.lead')}</p>
      </header>

      <section aria-labelledby="photos-title" className={styles.section}>
        <h2 id="photos-title" className={styles.title}>
          {t('home.title')}
        </h2>
        {problem && <Notice>{t(`errors.${problem}`)}</Notice>}
        {photos === null && !problem && <p>{t('home.loading')}</p>}
        <ul className={styles.grid}>
          {photos?.map((photo) => (
            <li key={photo.id}>
              <PhotoCard photo={photo} />
            </li>
          ))}
          <li>
            <UploadCard busy={uploading} onFile={(file) => void upload(file)} />
          </li>
        </ul>
      </section>
    </div>
  );
}
