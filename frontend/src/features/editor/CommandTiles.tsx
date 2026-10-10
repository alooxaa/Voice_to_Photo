import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../../shared/ui/Button';
import { Tile } from '../../shared/ui/Tile';
import {
  COMMANDS,
  TOOL_GROUPS,
  commandsIn,
  groupOf,
  type CommandId,
  type GroupId,
} from './commands';
import styles from './CommandTiles.module.css';

type ToolGroup = (typeof TOOL_GROUPS)[number];

interface CommandTilesProps {
  /** The command the lesson asks for now; its tile (and its group's tab) is highlighted. */
  current: CommandId | null;
  disabled: boolean;
  onCommand: (command: CommandId) => void;
  /** Extra buttons for the control row, e.g. the download link after saving. */
  extra?: ReactNode;
}

function toolGroupOf(command: CommandId | null): ToolGroup | null {
  const group: GroupId | null = command && groupOf(command);
  return group && group !== 'control' ? group : null;
}

/**
 * About two dozen tiles at once would overwhelm the child, so tools come in
 * groups: big group buttons on top, only the chosen group's tiles below, and
 * the control commands (undo, redo, start over, save) always in their own row.
 */
export function CommandTiles({ current, disabled, onCommand, extra }: CommandTilesProps) {
  const { t } = useTranslation();
  const [group, setGroup] = useState<ToolGroup>(toolGroupOf(current) ?? 'light');

  // When the lesson moves on to a tool in another group, open that group for the child.
  const [lessonCommand, setLessonCommand] = useState(current);
  if (current !== lessonCommand) {
    setLessonCommand(current);
    const next = toolGroupOf(current);
    if (next) setGroup(next);
  }
  const currentGroup = toolGroupOf(current);

  return (
    <div className={styles.tools}>
      <div className={styles.tabs} role="group" aria-label={t('editor.groups')}>
        {TOOL_GROUPS.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.tab}
            aria-pressed={id === group}
            onClick={() => setGroup(id)}
          >
            {t(`groups.${id}`)}
            {/* A sun dot tells the child where the current task's tile is. */}
            {id === currentGroup && id !== group && (
              <>
                <span className={styles.hint} aria-hidden="true" />
                <span className="visually-hidden">{t('editor.taskHere')}</span>
              </>
            )}
          </button>
        ))}
      </div>

      <div className={styles.grid} role="group" aria-label={t(`groups.${group}`)}>
        {commandsIn(group).map((id) => {
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

      <div className={styles.controls} role="group" aria-label={t('groups.control')}>
        {commandsIn('control').map((id) => {
          const Icon = COMMANDS[id].icon;
          return (
            <Button
              key={id}
              variant="secondary"
              className={id === current ? styles.currentControl : undefined}
              icon={<Icon aria-hidden="true" />}
              disabled={disabled}
              onClick={() => onCommand(id)}
            >
              {t(`commands.${id}.label`)}
            </Button>
          );
        })}
        {extra}
      </div>
    </div>
  );
}
