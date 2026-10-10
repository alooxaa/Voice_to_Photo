import { useEffect, useState } from 'react';
import { ArrowLeft, CircleHelp, Download } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { AiStudio } from '../features/ai/AiStudio';
import { AI_LESSON_STEPS, IDEA_FOR_STEP } from '../features/ai/ideas';
import { ModeSwitch, type EditorMode } from '../features/ai/ModeSwitch';
import { useAiStudio } from '../features/ai/useAiStudio';
import { useAuth } from '../features/auth/store';
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
import { matchCommand, matchIntensity } from '../features/voice/matchCommand';
import { recognizeSpeech } from '../features/voice/recognize';
import { speak } from '../features/voice/speak';
import { useVoice, type ProcessRecording } from '../features/voice/useVoice';
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
  const noticeAccepted = useAuth((state) => state.profile?.ai_notice_accepted ?? false);
  const updateProfile = useAuth((state) => state.updateProfile);

  // `photo` is fetched once per visit (saving does not replace it), so the
  // picture is loaded once and the undo history survives every save.
  const editor = useEditor(photo ? latestImage(photo) : null, photo?.original_url ?? null);

  const [mode, setMode] = useState<EditorMode>('edit');
  const [busy, setBusy] = useState(false);
  // Shown over the photo while a slower change (background removal) is being made.
  const [working, setWorking] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showFinish, setShowFinish] = useState(false);

  const ai = useAiStudio({
    photoId,
    frame: editor.frame,
    messages,
    record: session.record,
    updateResult: session.updateResult,
    onLocalCommand: (request) => void handleRequest(request),
    onKeepEdit: (bitmap) => editor.replace(bitmap, 'ai'),
  });

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

  /** Voice, tiles, the finish view and simple requests in the AI studio all end up here. */
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

  /** The microphone in Edit mode: Vosk with the command grammar. */
  const recogniseCommand: ProcessRecording = async (wav, language) => {
    const result = await recognizeSpeech(wav, language);
    const command = result.command ?? matchCommand(result.text, language);
    const intensity = result.intensity ?? matchIntensity(result.text, language);
    void handleRequest({ text: result.text, command }, intensity);
    return { heard: result.text, understood: command !== null };
  };

  const aiOpen = Boolean(ai.status?.ready) && noticeAccepted;
  const voice = useVoice(mode === 'ai' ? ai.processVoice : recogniseCommand);

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

  const frame = editor.frame;
  const title = photoTitle(photo, t);
  const chatOpen = messages.length > 0;
  const lessonCommand = progress.finished ? null : LESSON_STEPS[progress.current_step];
  const aiStep = progress.ai_finished ? null : AI_LESSON_STEPS[progress.ai_step];
  const micBlocked = busy || ai.waiting || (mode === 'ai' && !aiOpen);

  const voiceControl = (
    <VoiceControl
      status={voice.status}
      heard={voice.heard}
      disabled={micBlocked}
      onToggle={() => void voice.toggle()}
      layout={chatOpen ? 'inline' : 'stacked'}
      idleText={mode === 'ai' ? t('ai.idle') : undefined}
    />
  );
  const photoCard = (note: string | null) => (
    <motion.div layout="position" className={styles.photo} aria-busy={note !== null}>
      <PhotoCanvas frame={frame} label={t('editor.photoAlt', { title })} />
      {note && <WorkingNote text={note} />}
    </motion.div>
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

  const task =
    mode === 'edit'
      ? lessonCommand && (
          <TaskCard
            step={progress.current_step}
            task={t('lesson.task', { label: t(`commands.${lessonCommand}.label`) })}
          />
        )
      : aiOpen && aiStep && <TaskCard step={progress.ai_step} task={t(`ai.lesson.${aiStep}`)} />;

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <ButtonLink to="/" variant="quiet" icon={<ArrowLeft aria-hidden="true" />}>
          {t('nav.backToPhotos')}
        </ButtonLink>
        <h1 className={styles.title}>{title}</h1>
        <ModeSwitch mode={mode} onChange={setMode} />
        {mode === 'edit' ? (
          <StepBar
            labels={LESSON_STEPS.map((command) => t(`commands.${command}.label`))}
            step={progress.current_step}
            finished={progress.finished}
          />
        ) : (
          <StepBar
            labels={AI_LESSON_STEPS.map((step) => t(`ai.lessonSteps.${step}`))}
            step={progress.ai_step}
            finished={progress.ai_finished}
          />
        )}
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
            {mode === 'ai' ? (
              <AiStudio
                status={ai.status}
                noticeAccepted={noticeAccepted}
                photo={photoCard(ai.waiting ? t('ai.working') : null)}
                frame={frame}
                pending={ai.pending}
                problem={ai.problem}
                newPhoto={ai.newPhoto}
                currentIdea={aiStep && IDEA_FOR_STEP[aiStep]}
                disabled={busy || ai.waiting}
                onIdea={(idea) => {
                  voice.reset();
                  void ai.ask({ idea });
                }}
                onDecide={(keep) => void ai.decide(keep)}
                onAcceptNotice={() => void updateProfile({ ai_notice_accepted: true })}
                onSwitchToEdit={() => setMode('edit')}
              />
            ) : showFinish ? (
              <div className={styles.finish}>
                <FinishView
                  originalUrl={photo.original_url}
                  frame={frame}
                  busy={busy}
                  onSave={() => pressTile('save')}
                  onContinue={() => setShowFinish(false)}
                />
              </div>
            ) : (
              photoCard(working ? t('editor.working') : null)
            )}

            {problem && <Notice>{t(`errors.${problem}`)}</Notice>}

            {mode === 'edit' && !showFinish && (
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
                  {task}
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
