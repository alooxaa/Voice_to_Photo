import { useTranslation } from 'react-i18next';

import { MicButton } from '../../shared/ui/MicButton';
import type { VoiceStatus } from './useVoice';
import styles from './VoiceControl.module.css';

interface VoiceControlProps {
  status: VoiceStatus;
  heard: string;
  disabled: boolean;
  onToggle: () => void;
  layout: 'stacked' | 'inline';
}

/** The microphone with a plain-language status line next to it. */
export function VoiceControl({ status, heard, disabled, onToggle, layout }: VoiceControlProps) {
  const { t } = useTranslation();
  const listening = status === 'listening';
  const unavailable = status === 'unsupported';

  return (
    <div className={`${styles.control} ${styles[layout]}`}>
      <MicButton
        listening={listening}
        disabled={(disabled && !listening) || unavailable}
        label={listening ? t('voice.stop') : t('voice.start')}
        onPress={onToggle}
      />
      <p className={styles.status} role="status" aria-live="polite">
        {t(`voice.${status}`, { text: heard })}
      </p>
    </div>
  );
}
