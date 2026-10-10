import { useEffect, useRef } from 'react';
import { Volume2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { currentLanguage } from '../../shared/i18n';
import { Button } from '../../shared/ui/Button';
import { normalize } from '../voice/matchCommand';
import { speak } from '../voice/speak';
import { COMMANDS, TOOL_GROUPS, commandsIn, phrasesOf } from './commands';
import styles from './HelpDialog.module.css';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "What can I say?": every command by group, with other ways to say it and a
 * speaker button that pronounces it. A native <dialog> keeps keyboard focus
 * inside while it is open and closes with Escape as well as the big button.
 */
export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="help-title" onClose={onClose}>
      <header className={styles.header}>
        <h2 id="help-title" className={styles.title}>
          {t('help.title')}
        </h2>
        <Button variant="secondary" icon={<X aria-hidden="true" />} onClick={onClose}>
          {t('help.close')}
        </Button>
      </header>
      <p className={styles.lead}>{t('help.lead')}</p>

      <div className={styles.groups}>
        {[...TOOL_GROUPS, 'control' as const].map((group) => (
          <section key={group} aria-labelledby={`help-${group}`}>
            <h3 id={`help-${group}`} className={styles.group}>
              {t(`groups.${group}`)}
            </h3>
            <ul className={styles.list}>
              {commandsIn(group).map((id) => {
                const Icon = COMMANDS[id].icon;
                const label = t(`commands.${id}.label`);
                const others = phrasesOf(id, currentLanguage())
                  .filter((phrase) => normalize(phrase) !== normalize(label))
                  .slice(0, 2);
                return (
                  <li key={id} className={styles.item}>
                    <Icon className={styles.icon} aria-hidden="true" />
                    <div className={styles.words}>
                      <span className={styles.label}>«{label}»</span>
                      <span className={styles.others}>
                        {t('help.alsoSay', { phrases: others.join(', ') })}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.speak}
                      aria-label={t('help.listen', { label })}
                      onClick={() => speak(label, currentLanguage())}
                    >
                      <Volume2 aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </dialog>
  );
}
