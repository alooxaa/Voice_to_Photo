import { useTranslation } from 'react-i18next';

import { Tile } from '../../shared/ui/Tile';
import { COMMAND_IDS, COMMANDS, type CommandId } from './commands';
import styles from './CommandTiles.module.css';

interface CommandTilesProps {
  /** The command the lesson asks for now; its tile is highlighted. */
  current: CommandId | null;
  disabled: boolean;
  onCommand: (command: CommandId) => void;
}

export function CommandTiles({ current, disabled, onCommand }: CommandTilesProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid} role="group" aria-label={t('editor.tiles')}>
      {COMMAND_IDS.map((id) => {
        const Icon = COMMANDS[id].icon;
        return (
          <Tile
            key={id}
            icon={<Icon />}
            label={t(`commands.${id}.label`)}
            current={id === current}
            disabled={disabled}
            onPress={() => onCommand(id)}
          />
        );
      })}
    </div>
  );
}
