import { describe, expect, it } from 'vitest';

import vocabulary from '../../../../shared/commands.json';
import en from '../../shared/i18n/en.json';
import kk from '../../shared/i18n/kk.json';
import ru from '../../shared/i18n/ru.json';
import {
  COMMAND_IDS,
  COMMANDS,
  TOOL_GROUPS,
  commandsIn,
  groupOf,
  strengthOf,
  type GroupId,
} from './commands';

describe('command registry', () => {
  it('has an icon for every command of the shared vocabulary', () => {
    expect(COMMAND_IDS.length).toBeGreaterThanOrEqual(24);
    expect(Object.keys(COMMANDS).sort()).toEqual(Object.keys(vocabulary.commands).sort());
  });

  it('puts every command in a group that has a name in every language', () => {
    expect(vocabulary.groups).toEqual([...TOOL_GROUPS, 'control']);
    for (const group of vocabulary.groups as GroupId[]) {
      expect(commandsIn(group).length).toBeGreaterThan(0);
      for (const texts of [kk, ru, en]) expect(texts.groups).toHaveProperty(group);
    }
    expect(groupOf('undo')).toBe('control');
  });

  it('changes the picture in the browser for every editing command', () => {
    const handledByEditor = ['remove_background', 'undo', 'redo', 'reset', 'save'];
    for (const id of COMMAND_IDS) {
      expect(Boolean(COMMANDS[id].transform)).toBe(!handledByEditor.includes(id));
    }
  });

  it('uses intensity only for adjustable commands', () => {
    expect(strengthOf('brighten', 'lot')).toBe(2);
    expect(strengthOf('brighten', 'little')).toBe(0.5);
    expect(strengthOf('brighten', null)).toBe(1);
    expect(strengthOf('rotate', 'lot')).toBe(1);
  });
});
