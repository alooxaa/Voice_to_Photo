import { useEffect, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { ChatPanel } from '../features/chat/ChatPanel';
import type { ChildRequest } from '../features/chat/api';
import { messageText } from '../features/chat/messageText';
import { CommandTiles } from '../features/editor/CommandTiles';
import type { CommandId } from '../features/editor/commands';
import { PhotoCanvas } from '../features/editor/PhotoCanvas';
import { bitmapToBlob, useEditor } from '../features/editor/useEditor';
import { FinishView } from '../features/lesson/FinishView';
import { StepBar } from '../features/lesson/StepBar';
import { LESSON_STEPS } from '../features/lesson/steps';
import { TaskCard } from '../features/lesson/TaskCard';
import { usePhotoSession } from '../features/lesson/usePhotoSession';
import { latestImage, photosApi } from '../features/photos/api';
import { photoTitle } from '../features/photos/title';
import { speak } from '../features/voice/speak';
import { useVoice } from '../features/voice/useVoice';
import { VoiceControl } from '../features/voice/VoiceControl';
import { currentLanguage } from '../shared/i18n';
import { ButtonAnchor, ButtonLink } from '../shared/ui/Button';
import { Notice } from '../shared/ui/Notice';
import styles from './EditorPage.module.css';

const layoutTransition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

export function EditorPage() {
  const { t } = useTranslation();
  const photoId = Number(useParams().id);
  const session = usePhotoSession(photoId);
  const { photo, messages, progress } = session;

  // `photo` is fetched once per visit (saving does not replace it), so the
  // picture is loaded once and the undo history survives every save.
  const editor = useEditor(photo ? latestImage(photo) : null);

  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<'save_failed' | 'chat_failed' | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showFinish, setShowFinish] = useState(false);

  // Free the memory of an old download link when a newer one replaces it.
  useEffect(() => {
    if (!downloadUrl) return;
    return () => URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  /** "save": upload as the photo's new version and offer a download. */
  async function savePhoto() {
    if (!editor.frame) return;
    const blob = await bitmapToBlob(editor.frame.bitmap);
    setDownloadUrl(URL.createObjectURL(blob));
    try {
      await photosApi.saveEdited(photoId, blob);
    } catch {
      setProblem('save_failed');
    }
  }

  /** Voice, tiles and the finish view all end up here. */
  async function handleRequest(request: ChildRequest) {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      if (request.command === 'save') await savePhoto();
      else if (request.command) editor.apply(request.command);

      const wasFinished = progress.finished;
      const reply = await session.send(request);
      if (reply.progress.finished && !wasFinished) setShowFinish(true);
      const answer = reply.messages.filter((message) => message.role === 'assistant');
      speak(answer.map((message) => messageText(message, t)).join(' '), currentLanguage());
    } catch {
      setProblem((current) => current ?? 'chat_failed');
    } finally {
      setBusy(false);
    }
  }

  const voice = useVoice(handleRequest);

  function pressTile(command: CommandId) {
    voice.reset();
    void handleRequest({ text: '', command, source: 'tile' });
  }

  if (
    session.state === 'loading' ||
    (session.state === 'ready' && !editor.frame && !editor.failed)
  ) {
    return <p className={styles.message}>{t('editor.loading')}</p>;
  }
  if (session.state !== 'ready' || !photo || !editor.frame) {
    const key = session.state === 'missing' ? 'photo_missing' : 'network';
    return (
      <div className={styles.message}>
        <Notice>{t(`errors.${key}`)}</Notice>
        <ButtonLink to="/" variant="secondary" icon={<ArrowLeft aria-hidden="true" />}>
          {t('nav.backToPhotos')}
        </ButtonLink>
      </div>
    );
  }

  const title = photoTitle(photo, t);
  const chatOpen = messages.length > 0;
  const lessonCommand = progress.finished ? null : LESSON_STEPS[progress.current_step];
  const voiceControl = (
    <VoiceControl
      status={voice.status}
      heard={voice.heard}
      disabled={busy}
      onToggle={() => void voice.toggle()}
      layout={chatOpen ? 'inline' : 'stacked'}
    />
  );

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <ButtonLink to="/" variant="quiet" icon={<ArrowLeft aria-hidden="true" />}>
          {t('nav.backToPhotos')}
        </ButtonLink>
        <h1 className={styles.title}>{title}</h1>
        <StepBar step={progress.current_step} finished={progress.finished} />
      </header>

      <LayoutGroup>
        <div className={chatOpen ? `${styles.workspace} ${styles.withChat}` : styles.workspace}>
          <motion.section layout transition={layoutTransition} className={styles.stage}>
            {showFinish ? (
              <div className={styles.finish}>
                <FinishView
                  originalUrl={photo.original_url}
                  frame={editor.frame}
                  busy={busy}
                  onSave={() => pressTile('save')}
                  onContinue={() => setShowFinish(false)}
                />
              </div>
            ) : (
              <motion.div layout="position" className={styles.photo}>
                <PhotoCanvas frame={editor.frame} label={t('editor.photoAlt', { title })} />
              </motion.div>
            )}

            {problem && <Notice>{t(`errors.${problem}`)}</Notice>}

            {!showFinish && (
              <motion.div layout="position" className={styles.tools}>
                <CommandTiles current={lessonCommand} disabled={busy} onCommand={pressTile} />
                {downloadUrl && (
                  <ButtonAnchor
                    href={downloadUrl}
                    download={`${title}.png`}
                    variant="secondary"
                    icon={<Download aria-hidden="true" />}
                  >
                    {t('editor.download')}
                  </ButtonAnchor>
                )}
              </motion.div>
            )}
          </motion.section>

          {/* The right column always holds the microphone, so it never moves or scrolls away. */}
          <motion.aside layout transition={layoutTransition} className={styles.side}>
            <AnimatePresence mode="wait" initial={false}>
              {chatOpen ? (
                <motion.div
                  key="chat"
                  className={styles.sideContent}
                  initial={{ opacity: 0, x: 48 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={layoutTransition}
                >
                  <ChatPanel
                    title={title}
                    thumbnailUrl={photo.original_url}
                    messages={messages}
                    composer={voiceControl}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="intro"
                  className={`${styles.sideContent} ${styles.intro}`}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {lessonCommand && (
                    <TaskCard command={lessonCommand} step={progress.current_step} />
                  )}
                  {voiceControl}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </div>
      </LayoutGroup>
    </div>
  );
}
