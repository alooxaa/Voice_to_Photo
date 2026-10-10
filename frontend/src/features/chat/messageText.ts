import type { TFunction } from 'i18next';

import { AI_LESSON_STEPS } from '../ai/ideas';
import type { CommandId } from '../editor/commands';
import type { ChatMessage } from './api';

/**
 * The words of one chat message in the current interface language.
 *
 * The backend stores assistant replies as a template key plus parameters, so
 * the same reply reads in Kazakh, Russian or English after a language switch.
 * Most templates have several wordings; the message id picks one, so a reply
 * keeps its wording across reloads while neighbouring replies vary.
 */
export function messageText(message: ChatMessage, t: TFunction): string {
  if (message.role === 'child') {
    // A pressed tile shows its label, so it follows the interface language too.
    if (message.key === 'tile' && message.command) return t(`commands.${message.command}.label`);
    if (message.key === 'idea' && message.params.idea) return t(`ai.ideas.${message.params.idea}`);
    return message.text || t('chat.notHeard');
  }
  // Replies saved before templates existed only have their original text.
  if (!message.key) return message.text;

  const { params } = message;
  const label = (command: CommandId | null | undefined) =>
    command ? t(`commands.${command}.label`) : '';
  const effect = label(message.command) && t(`commands.${message.command}.effect`);

  const variant = (key: string, values: Record<string, string> = {}) => {
    const variants: unknown = t(`assistant.${key}`, { returnObjects: true });
    const template = Array.isArray(variants)
      ? String(variants[message.id % variants.length])
      : String(variants);
    return Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, value),
      template,
    );
  };

  switch (message.key) {
    case 'task':
      return t('lesson.task', { label: label(message.command) });
    case 'ai_task':
      return t(`ai.lesson.${AI_LESSON_STEPS[params.step ?? 0]}`);
    case 'praise':
      return `${variant('praise')} ${effect}`;
    case 'effect':
      return effect;
    case 'other_command':
      return variant('other_command', { effect });
    case 'retry_heard':
    case 'retry_unclear':
      return variant(message.key, { heard: params.heard ?? '', label: label(params.expected) });
    case 'free_retry_heard':
    case 'free_retry_unclear':
      return variant(message.key, {
        heard: params.heard ?? '',
        examples: exampleList(
          (params.examples ?? []).map((command) => t('assistant.quote', { label: label(command) })),
          t('assistant.or'),
        ),
      });
    default:
      return variant(message.key);
  }
}

/** “Brighten”, “Darken” or “Rotate” */
function exampleList(quoted: string[], or: string): string {
  if (quoted.length < 2) return quoted.join('');
  return `${quoted.slice(0, -1).join(', ')} ${or} ${quoted[quoted.length - 1]}`;
}
