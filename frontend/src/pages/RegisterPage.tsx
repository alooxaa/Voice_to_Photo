import { useTranslation } from 'react-i18next';

import { RegisterForm } from '../features/auth/RegisterForm';
import { ButtonLink } from '../shared/ui/Button';
import { Card } from '../shared/ui/Card';
import styles from './AuthPage.module.css';

export function RegisterPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.intro}>
          <h1 className={styles.title}>{t('auth.registerTitle')}</h1>
          <p className={styles.lead}>{t('auth.registerLead')}</p>
        </div>
        <RegisterForm />
        <ButtonLink to="/login" variant="quiet" wide>
          {t('auth.toLogin')}
        </ButtonLink>
      </Card>
    </div>
  );
}
