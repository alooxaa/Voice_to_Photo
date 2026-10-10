import { useEffect, useState } from 'react';
import { ArrowLeft, CircleHelp, Download } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { ChatPanel } from '../features/chat/ChatPanel';
import type { ChildRequest } from '../features/chat/api';
import { messageText } from '../features/chat/messageText';
import { CommandTiles } from '../features/editor/CommandTiles';
import type { CommandId, Intensity } from '../features/editor/commands';
import { HelpDialog } from '../features/editor/HelpDialog';
import { PhotoCanvas } from '../features/editor/PhotoCanvas';
import { bitmapToBlob, useEditor } from '../features/editor/useEditor';
import { WorkingNote } from '../features/editor/WorkingNote';
import { FinishView } from '../features/lesson/FinishView';
import { StepBar } from '../features/lesson/StepBar';
import { LESSON_STEPS } from '../features/lesson/steps';
import { TaskCard } from '../features/lesson/TaskCard';
import { usePhotoSession } from '../features/lesson/usePhotoSession';
import { latestImage, photosApi } from '../features/photos/api';
import { photoTitle } from '../features/photos/title';
import type { Recognition } from '../features/voice/recognize';
import { speak } from '../features/voice/speak';
import { useVoice } from '../features/voice/useVoice';
import { VoiceControl } from '../features/voice/VoiceControl';
import { ApiError } from '../shared/api/client';
import { currentLanguage } from '../shared/i18n';
import { Button, ButtonAnchor, ButtonLink } from '../shared/ui/Button';
import { Notice } from '../shared/ui/Notice';
import styles from './EditorPage.module.css';

const layoutTransition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

type Problem = 'save_failed' | 'chat_failed' | 'background_failed' | 'model_missing';

export function EditorPage() {
  const { t } = useTranslation();
  const photoId = Number(useParams().id);
  const session = usePhotoSession(photoId);
  const { photo, messages, progress } = session;

  // `photo` is fetched once per visit (saving does not replace it), so the
  // picture is loaded once and the undo history survives every save.
  const editor = useEditor(photo ? latestImage(photo) : null, photo?.original_url ?? null);

  const [busy, setBusy] = useState(false);
  // Shown over the photo while a slower change (background removal) is being made.
  const [working, setWorking] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
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

  /** Change the picture. False when it could not be done; the chat then stays quiet. */
  async function changePhoto(command: CommandId, intensity: Intensity | null): Promise<boolean> {
    if (command === 'save') {
      await savePhoto();
      return true;
    }
    setWorking(command === 'remove_background');
    try {
      await editor.apply(command, intensity);
      return true;
    } catch (error) {
      const missing = error instanceof ApiError && error.status === 503;
      setProblem(missing ? 'model_missing' : 'background_failed');
      return false;
    } finally {
      setWorking(false);
    }
  }

  /** Voice, tiles and the finish view all end up here. */
  async function handleRequest(request: ChildRequest, intensity: Intensity | null = null) {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      if (request.command && !(await changePhoto(request.command, intensity))) return;

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

  const voice = useVoice(({ text, command, intensity }: Recognition) =>
    handleRequest({ text, command }, intensity),
  );

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
  const download = downloadUrl && (
    <ButtonAnchor
      href={downloadUrl}
      download={`${title}.png`}
      variant="quiet"
      icon={<Download aria-hidden="true" />}
    >
      {t('editor.download')}
    </ButtonAnchor>
  );

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <ButtonLink to="/" variant="quiet" icon={<ArrowLeft aria-hidden="true" />}>
          {t('nav.backToPhotos')}
        </ButtonLink>
        <h1 className={styles.title}>{title}</h1>
        <StepBar step={progress.current_step} finished={progress.finished} />
        <Button
          variant="secondary"
          className={styles.help}
          icon={<CircleHelp aria-hidden="true" />}
          onClick={() => setHelpOpen(true)}
        >
          {t('editor.help')}
        </Button>
      </header>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

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
              <motion.div layout="position" className={styles.photo} aria-busy={working}>
                <PhotoCanvas frame={editor.frame} label={t('editor.photoAlt', { title })} />
                {working && <WorkingNote text={t('editor.working')} />}
              </motion.div>
            )}

            {problem && <Notice>{t(`errors.${problem}`)}</Notice>}

            {!showFinish && (
              <motion.div layout="position" className={styles.tools}>
                <CommandTiles
                  current={lessonCommand}
                  disabled={busy}
                  onCommand={pressTile}
                  extra={download}
                />
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
