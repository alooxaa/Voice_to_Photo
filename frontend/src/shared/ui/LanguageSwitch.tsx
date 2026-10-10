import { useTranslation } from 'react-i18next';

import { LANGUAGE_NAMES, LANGUAGES, type Language } from '../i18n';
import styles from './LanguageSwitch.module.css';

const SHORT_NAMES: Record<Language, string> = { kk: 'Қаз', ru: 'Рус', en: 'Eng' };

interface LanguageSwitchProps {
  value: Language;
  onChange: (language: Language) => void;
  /** Show full language names instead of short ones (used on the profile page). */
  full?: boolean;
}

export function LanguageSwitch({ value, onChange, full = false }: LanguageSwitchProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.group} role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          lang={language}
          className={styles.option}
          aria-pressed={language === value}
          aria-label={LANGUAGE_NAMES[language]}
          onClick={() => onChange(language)}
        >
          {full ? LANGUAGE_NAMES[language] : SHORT_NAMES[language]}
        </button>
      ))}
    </div>
  );
}
