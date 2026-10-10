import vocabulary from '../../../../shared/commands.json';
import type { Language } from '../../shared/i18n';
import { COMMAND_IDS, type CommandId, type Intensity } from '../editor/commands';

/** Lower-case, treat "ё" as "е", keep only letters separated by single spaces. */
export function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      .replaceAll('ё', 'е')
      .match(/\p{L}+/gu) ?? []
  ).join(' ');
}

const wordsOf = (phrase: string) => normalize(phrase).split(' ');

/**
 * Find the command the text asks for. The backend already does this with the
 * same rules (speech/commands.py); this copy lets the frontend understand the
 * recogniser's text too.
 *
 * A whole phrase wins first, the longest one if several appear. Vosk sometimes
 * returns only part of a phrase ("жарқын" for "жарқын қыл"); then a command is
 * chosen only when every word heard belongs to its phrases and at least one
 * of them belongs to no other command.
 */
export function matchCommand(text: string, language: Language): CommandId | null {
  const words = ` ${normalize(text)} `;
  const phrases = (id: CommandId) => vocabulary.commands[id][language].say;
  let best: CommandId | null = null;
  let bestLength = 0;

  for (const id of COMMAND_IDS) {
    for (const phrase of phrases(id)) {
      const normalized = normalize(phrase);
      if (words.includes(` ${normalized} `) && normalized.length > bestLength) {
        best = id;
        bestLength = normalized.length;
      }
    }
  }
  if (best) return best;

  const modifiers = new Set(Object.values(vocabulary.intensity[language]).flat().flatMap(wordsOf));
  const heard = normalize(text)
    .split(' ')
    .filter((word) => word && !modifiers.has(word));
  if (heard.length === 0) return null;

  const own = new Map(COMMAND_IDS.map((id) => [id, new Set(phrases(id).flatMap(wordsOf))]));
  const candidates = COMMAND_IDS.filter((id) => {
    const mine = own.get(id) ?? new Set<string>();
    const onlyMine = (word: string) =>
      COMMAND_IDS.every((other) => other === id || !own.get(other)?.has(word));
    return heard.every((word) => mine.has(word)) && heard.some(onlyMine);
  });
  return candidates.length === 1 ? candidates[0] : null;
}

/** "little" for "сәл", "чуть", "a bit"…; "lot" for "өте", "очень", "much"…; otherwise null. */
export function matchIntensity(text: string, language: Language): Intensity | null {
  const words = ` ${normalize(text)} `;
  const levels: Intensity[] = ['little', 'lot'];
  return (
    levels.find((level) =>
      vocabulary.intensity[language][level].some((word) => words.includes(` ${normalize(word)} `)),
    ) ?? null
  );
}
