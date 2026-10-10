import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '../../shared/api/client';
import type { AiResult } from '../ai/api';
import { chatApi, type ChatMessage, type ChildRequest, type LessonProgress } from '../chat/api';
import { photosApi, type Photo } from '../photos/api';

type LoadState = 'loading' | 'ready' | 'missing' | 'failed';

/** Everything the server knows about one photo: the photo, its chat and the lesson progress. */
export function usePhotoSession(photoId: number) {
  const [state, setState] = useState<LoadState>('loading');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<LessonProgress>({
    current_step: 0,
    finished: false,
    ai_step: 0,
    ai_finished: false,
  });

  useEffect(() => {
    let active = true;
    Promise.all([photosApi.get(photoId), chatApi.messages(photoId), chatApi.progress(photoId)])
      .then(([loadedPhoto, loadedMessages, loadedProgress]) => {
        if (!active) return;
        setPhoto(loadedPhoto);
        setMessages(loadedMessages);
        setProgress(loadedProgress);
        setState('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        const missing = error instanceof ApiError && error.status === 404;
        setState(missing ? 'missing' : 'failed');
      });
    return () => {
      active = false;
    };
  }, [photoId]);

  /** Record what the child did and add the assistant's reply to the chat. */
  const send = useCallback(
    async (request: ChildRequest) => {
      const reply = await chatApi.send(photoId, request);
      setMessages((old) => [...old, ...reply.messages]);
      setProgress(reply.progress);
      return reply;
    },
    [photoId],
  );

  /** Add messages the AI studio wrote, and its lesson progress, to what is shown. */
  const record = useCallback((added: ChatMessage[], newProgress?: LessonProgress) => {
    setMessages((old) => [...old, ...added]);
    if (newProgress) setProgress(newProgress);
  }, []);

  /** A picture's decision changed (kept or rejected): update its bubble. */
  const updateResult = useCallback((result: AiResult) => {
    setMessages((old) =>
      old.map((message) => (message.result?.id === result.id ? { ...message, result } : message)),
    );
  }, []);

  return { state, photo, messages, progress, send, record, updateResult };
}
