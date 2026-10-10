import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '../../shared/api/client';
import { chatApi, type ChatMessage, type ChildRequest, type LessonProgress } from '../chat/api';
import { photosApi, type Photo } from '../photos/api';

type LoadState = 'loading' | 'ready' | 'missing' | 'failed';

/** Everything the server knows about one photo: the photo, its chat and the lesson progress. */
export function usePhotoSession(photoId: number) {
  const [state, setState] = useState<LoadState>('loading');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<LessonProgress>({ current_step: 0, finished: false });

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

  return { state, photo, messages, progress, send };
}
