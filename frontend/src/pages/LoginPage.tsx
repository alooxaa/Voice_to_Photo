import { useTranslation } from 'react-i18next';

import { LoginForm } from '../features/auth/LoginForm';
import { ButtonLink } from '../shared/ui/Button';
import { Card } from '../shared/ui/Card';
import styles from './AuthPage.module.css';

export function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.intro}>
          <h1 className={styles.title}>{t('auth.loginTitle')}</h1>
          <p className={styles.lead}>{t('auth.loginLead')}</p>
        </div>
        <LoginForm />
        <ButtonLink to="/register" variant="quiet" wide>
          {t('auth.toRegister')}
        </ButtonLink>
      </Card>
    </div>
  );
}
