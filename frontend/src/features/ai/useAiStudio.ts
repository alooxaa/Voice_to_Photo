import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError, NetworkError } from '../../shared/api/client';
import { currentLanguage, type Language } from '../../shared/i18n';
import type { ChatMessage, ChildRequest, LessonProgress } from '../chat/api';
import { messageText } from '../chat/messageText';
import type { Bitmap } from '../editor/engine';
import { bitmapToBlob, loadBitmap, type Frame } from '../editor/useEditor';
import type { Photo } from '../photos/api';
import { recognizeSpeech } from '../voice/recognize';
import { speak } from '../voice/speak';
import type { VoiceOutcome } from '../voice/useVoice';
import { aiApi, type AiInput, type AiResult, type AiStatus } from './api';

export type AiProblem = 'not_configured' | 'limit' | 'unavailable' | 'network';

interface AiStudioOptions {
  photoId: number;
  frame: Frame | null;
  messages: ChatMessage[];
  record: (messages: ChatMessage[], progress?: LessonProgress) => void;
  updateResult: (result: AiResult) => void;
  /** The child asked for something the editor does itself ("make it brighter"). */
  onLocalCommand: (request: ChildRequest) => void;
  /** The child kept an AI edit: it becomes the photo, as one more undoable step. */
  onKeepEdit: (bitmap: Bitmap) => void;
}

function problemOf(error: unknown): AiProblem {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'limit';
    const code = (error.body as { error?: string } | null)?.error;
    if (code === 'not_configured') return 'not_configured';
    return 'unavailable';
  }
  return error instanceof NetworkError ? 'network' : 'unavailable';
}

/**
 * The AI studio's state: is it connected, is a picture being made, which
 * picture waits for "keep" or "go back", and what went wrong (said kindly).
 */
export function useAiStudio(options: AiStudioOptions) {
  const { photoId, frame, messages, record, updateResult, onLocalCommand, onKeepEdit } = options;
  const { t } = useTranslation();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [problem, setProblem] = useState<AiProblem | null>(null);
  const [newPhoto, setNewPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    aiApi
      .status()
      .then(setStatus)
      .catch(() => setProblem('network'));
  }, []);

  // The picture waiting for a choice is the newest undecided one in the chat,
  // so the choice is still there after a page reload.
  const pending = messages.findLast((message) => message.result?.decision === 'pending')?.result;

  const say = useCallback(
    (added: ChatMessage[]) => {
      const replies = added.filter(
        (message) => message.role === 'assistant' && message.kind !== 'result',
      );
      speak(replies.map((message) => messageText(message, t)).join(' '), currentLanguage());
    },
    [t],
  );

  /** Ask the AI with the child's voice or an idea tile. */
  const ask = useCallback(
    async (
      input: AiInput,
      language: Language = currentLanguage(),
    ): Promise<VoiceOutcome | null> => {
      if (!frame) return null;
      setWaiting(true);
      setProblem(null);
      setNewPhoto(null);
      try {
        const answer = await aiApi.ask(photoId, input, await bitmapToBlob(frame.bitmap), language);
        setStatus((old) => old && { ...old, remaining: answer.remaining });
        if (answer.intent === 'local_command' && answer.command) {
          onLocalCommand({ text: answer.transcript, command: answer.command, source: 'ai' });
          return { heard: answer.transcript, understood: true };
        }
        record(answer.messages);
        say(answer.messages);
        return { heard: answer.transcript, understood: answer.intent !== 'unclear' };
      } catch (error) {
        setProblem(problemOf(error));
        return null;
      } finally {
        setWaiting(false);
      }
    },
    [frame, photoId, onLocalCommand, record, say],
  );

  /** "Keep" or "go back" for the waiting picture. */
  const decide = useCallback(
    async (keep: boolean) => {
      if (!pending) return;
      setProblem(null);
      try {
        const decision = await aiApi.decide(photoId, pending.id, keep);
        if (keep && pending.kind === 'edit') onKeepEdit(await loadBitmap(pending.url));
        updateResult(decision.result);
        record(decision.messages, decision.progress);
        setNewPhoto(decision.new_photo);
        say(decision.messages);
      } catch (error) {
        setProblem(problemOf(error));
      }
    },
    [pending, photoId, onKeepEdit, updateResult, record, say],
  );

  /** The microphone in the AI studio: the keep/go-back choice, or a new request. */
  const processVoice = useCallback(
    async (wav: Blob, language: Language): Promise<VoiceOutcome | null> => {
      if (!pending) return ask({ audio: wav }, language);
      const heard = await recognizeSpeech(wav, language, 'choice');
      const choice: string | null = heard.command;
      if (choice !== 'keep' && choice !== 'discard')
        return { heard: heard.text, understood: false };
      await decide(choice === 'keep');
      return { heard: heard.text, understood: true };
    },
    [pending, ask, decide],
  );

  return {
    status,
    waiting,
    problem,
    newPhoto,
    pending: pending ?? null,
    ask,
    decide,
    processVoice,
  };
}
