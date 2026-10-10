import { translations, type Language } from '../../shared/i18n';
import { COMMAND_IDS, type CommandId } from '../editor/commands';

/** Lower-case, treat "ё" as "е", keep only letters separated by single spaces. */
export function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      .replaceAll('ё', 'е')
      .match(/\p{L}+/gu) ?? []
  ).join(' ');
}

/**
 * Find the command whose spoken phrase appears in the text. The longest
 * matching phrase wins. The backend already does this with the same phrase
 * lists; this copy lets the frontend understand the recogniser's text too.
 */
export function matchCommand(text: string, language: Language): CommandId | null {
  const words = ` ${normalize(text)} `;
  let best: CommandId | null = null;
  let bestLength = 0;

  for (const id of COMMAND_IDS) {
    for (const phrase of translations[language].commands[id].say) {
      const normalized = normalize(phrase);
      if (words.includes(` ${normalized} `) && normalized.length > bestLength) {
        best = id;
        bestLength = normalized.length;
      }
    }
  }
  return best;
}
