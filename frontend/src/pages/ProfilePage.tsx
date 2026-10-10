import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../features/auth/store';
import { Avatar, type AvatarColor } from '../shared/ui/Avatar';
import { Button } from '../shared/ui/Button';
import { Card } from '../shared/ui/Card';
import { LanguageSwitch } from '../shared/ui/LanguageSwitch';
import styles from './ProfilePage.module.css';

const COLORS: AvatarColor[] = ['blue', 'sun', 'ink'];

/**
 * Settings are chosen with big buttons only: after logging in a child never
 * has to type. The display name is set once, when signing up.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const { profile, changeLanguage, updateProfile, logout } = useAuth();
  if (!profile) return null;

  return (
    <div className={styles.page}>
      <Card className={styles.identity}>
        <Avatar name={profile.display_name} color={profile.avatar_color} size="large" />
        <div>
          <h1 className={styles.name}>{profile.display_name}</h1>
          <p className={styles.username}>{t('profile.username', { username: profile.username })}</p>
        </div>
      </Card>

      <Card className={styles.setting}>
        <h2 className={styles.heading}>{t('profile.language')}</h2>
        <LanguageSwitch value={profile.language} onChange={changeLanguage} full />
      </Card>

      <Card className={styles.setting}>
        <h2 className={styles.heading} id="avatar-heading">
          {t('profile.avatar')}
        </h2>
        <div className={styles.colors} role="group" aria-labelledby="avatar-heading">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={styles.color}
              aria-pressed={profile.avatar_color === color}
              onClick={() => void updateProfile({ avatar_color: color }).catch(() => {})}
            >
              <Avatar name={profile.display_name} color={color} />
              {t(`profile.colors.${color}`)}
            </button>
          ))}
        </div>
      </Card>

      <div>
        <Button variant="secondary" icon={<LogOut aria-hidden="true" />} onClick={logout}>
          {t('profile.logout')}
        </Button>
      </div>
    </div>
  );
}
