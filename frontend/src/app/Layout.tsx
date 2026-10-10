import { Images, Mic } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router-dom';

import { useAuth } from '../features/auth/store';
import { currentLanguage } from '../shared/i18n';
import { Avatar } from '../shared/ui/Avatar';
import { LanguageSwitch } from '../shared/ui/LanguageSwitch';
import styles from './Layout.module.css';

export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { profile, changeLanguage } = useAuth();
  const language = profile?.language ?? currentLanguage();
  // The editor fits the window exactly on desktop: only its chat scrolls, never the page.
  const fitWindow = useMatch('/photos/:id') !== null;

  return (
    <div className={fitWindow ? `${styles.shell} ${styles.fit}` : styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            <Mic />
          </span>
          {t('app.name')}
        </Link>

        <nav className={styles.nav} aria-label={t('nav.main')}>
          {profile && (
            <>
              <NavLink to="/" end className={styles.link}>
                <Images aria-hidden="true" />
                {t('nav.photos')}
              </NavLink>
              <NavLink
                to="/profile"
                className={styles.link}
                aria-label={`${t('nav.profile')}: ${profile.display_name}`}
              >
                <Avatar name={profile.display_name} color={profile.avatar_color} />
                <span className={styles.profileName}>{profile.display_name}</span>
              </NavLink>
            </>
          )}
          <LanguageSwitch value={language} onChange={changeLanguage} />
        </nav>
      </header>

      <motion.main
        key={location.pathname}
        className={styles.main}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Outlet />
      </motion.main>
    </div>
  );
}
