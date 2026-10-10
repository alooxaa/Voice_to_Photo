import { Pencil, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import styles from './ModeSwitch.module.css';

export type EditorMode = 'edit' | 'ai';

const MODES = [
  { id: 'edit', icon: Pencil },
  { id: 'ai', icon: Sparkles },
] as const;

/** Two big buttons: "Өңдеу" (local tools) and "ЖИ шебері" (generative AI by voice). */
export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={styles.group} role="group" aria-label={t('mode.label')}>
      {MODES.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={styles.option}
          aria-pressed={mode === id}
          onClick={() => onChange(id)}
        >
          <Icon aria-hidden="true" />
          {t(`mode.${id}`)}
        </button>
      ))}
    </div>
  );
}
