import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import vocabulary from '../../../../shared/commands.json';
import en from './en.json';
import kk from './kk.json';
import ru from './ru.json';

export const LANGUAGES = ['kk', 'ru', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Each language's name written in that language, for the language switch. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  kk: 'Қазақша',
  ru: 'Русский',
  en: 'English',
};

const interfaceTexts = { kk, ru, en } satisfies Record<Language, typeof kk>;

/**
 * Command labels, effect sentences and phrases come from the vocabulary file
 * shared with the backend; they are reachable as `commands.<id>.label` etc.
 */
function vocabularyTexts(language: Language) {
  const pick = <T extends Record<Language, unknown>>(entries: Record<string, T>) =>
    Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, entry[language]]));
  return { commands: pick(vocabulary.commands), choices: pick(vocabulary.choices) };
}

const STORAGE_KEY = 'dauys-foto.language';

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

function storedLanguage(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : 'kk';
  } catch {
    return 'kk';
  }
}

/** Switch the interface language and remember it on this device. */
export function setLanguage(language: Language): void {
  void i18n.changeLanguage(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage can be blocked (private mode); the language still switches.
  }
}

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'kk';
}

void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    LANGUAGES.map((language) => [
      language,
      { translation: { ...interfaceTexts[language], ...vocabularyTexts(language) } },
    ]),
  ),
  lng: storedLanguage(),
  fallbackLng: 'kk',
  interpolation: { escapeValue: false },
});

// <html lang> follows the chosen language, so screen readers pronounce it correctly.
document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

export default i18n;
