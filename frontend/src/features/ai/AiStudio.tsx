import type { ReactNode } from 'react';
import { Check, Images, Pencil, ShieldCheck, Undo2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button, ButtonLink } from '../../shared/ui/Button';
import { Notice } from '../../shared/ui/Notice';
import { Tile } from '../../shared/ui/Tile';
import { PhotoCanvas } from '../editor/PhotoCanvas';
import type { Frame } from '../editor/useEditor';
import type { Photo } from '../photos/api';
import type { AiResult, AiStatus } from './api';
import styles from './AiStudio.module.css';
import { IDEAS } from './ideas';
import type { AiProblem } from './useAiStudio';

interface AiStudioProps {
  status: AiStatus | null;
  noticeAccepted: boolean;
  /** The photo card from the editor, with the "drawing…" note while waiting. */
  photo: ReactNode;
  frame: Frame;
  pending: AiResult | null;
  problem: AiProblem | null;
  newPhoto: Photo | null;
  /** The idea that fits the current lesson step; its tile is highlighted. */
  currentIdea: string | null;
  disabled: boolean;
  onIdea: (idea: string) => void;
  onDecide: (keep: boolean) => void;
  onAcceptNotice: () => void;
  onSwitchToEdit: () => void;
}

/** The photo column in "ЖИ шебері" mode. */
export function AiStudio(props: AiStudioProps) {
  const { t } = useTranslation();
  const { status, problem } = props;

  const switchButton = (
    <Button variant="secondary" icon={<Pencil aria-hidden="true" />} onClick={props.onSwitchToEdit}>
      {t('ai.toEdit')}
    </Button>
  );

  if (status === null && problem === null) return <p className={styles.card}>{t('ai.loading')}</p>;

  if (problem === 'not_configured' || (status && !status.ready)) {
    return (
      <section className={styles.card} aria-labelledby="ai-off-title">
        <h2 id="ai-off-title" className={styles.title}>
          {t('ai.off.title')}
        </h2>
        <p>{t('ai.off.text')}</p>
        {switchButton}
      </section>
    );
  }

  if (!props.noticeAccepted) {
    return (
      <section className={styles.card} aria-labelledby="ai-notice-title">
        <ShieldCheck className={styles.badge} aria-hidden="true" />
        <h2 id="ai-notice-title" className={styles.title}>
          {t('ai.notice.title')}
        </h2>
        <p>{t('ai.notice.text')}</p>
        <div className={styles.actions}>
          <Button icon={<Check aria-hidden="true" />} onClick={props.onAcceptNotice}>
            {t('ai.notice.accept')}
          </Button>
          {switchButton}
        </div>
      </section>
    );
  }

  return (
    <>
      {props.pending ? (
        <ChoiceView
          frame={props.frame}
          result={props.pending}
          disabled={props.disabled}
          onDecide={props.onDecide}
        />
      ) : (
        props.photo
      )}

      {problem && (
        <div className={styles.problem}>
          <Notice>{t(`ai.problems.${problem}`)}</Notice>
          {switchButton}
        </div>
      )}
      {props.newPhoto && (
        <div className={styles.problem}>
          <Notice>{t('ai.saved')}</Notice>
          <ButtonLink
            to={`/photos/${props.newPhoto.id}`}
            variant="secondary"
            icon={<Images aria-hidden="true" />}
          >
            {t('ai.openNew')}
          </ButtonLink>
        </div>
      )}

      {!props.pending && (
        <div className={styles.ideas}>
          <div className={styles.grid} role="group" aria-label={t('ai.ideasTitle')}>
            {IDEAS.map(({ id, icon: Icon }) => (
              <Tile
                key={id}
                icon={<Icon />}
                label={t(`ai.ideas.${id}`)}
                current={id === props.currentIdea}
                disabled={props.disabled}
                onPress={() => props.onIdea(id)}
              />
            ))}
          </div>
          {status && (
            <p className={styles.remaining}>{t('ai.remaining', { n: status.remaining })}</p>
          )}
        </div>
      )}
    </>
  );
}

interface ChoiceViewProps {
  frame: Frame;
  result: AiResult;
  disabled: boolean;
  onDecide: (keep: boolean) => void;
}

/** Never applied silently: before and after side by side, and the child chooses. */
function ChoiceView({ frame, result, disabled, onDecide }: ChoiceViewProps) {
  const { t } = useTranslation();
  const edit = result.kind === 'edit';

  return (
    <section className={styles.choice} aria-labelledby="choice-title">
      <h2 id="choice-title" className={styles.title}>
        {t(edit ? 'ai.choice.titleEdit' : 'ai.choice.titleNew')}
      </h2>
      <div className={edit ? styles.pair : styles.single}>
        {edit && (
          <figure className={styles.figure}>
            <div className={styles.frame}>
              <PhotoCanvas frame={frame} label={t('ai.choice.before')} />
            </div>
            <figcaption>{t('ai.choice.before')}</figcaption>
          </figure>
        )}
        <figure className={styles.figure}>
          <motion.div
            className={styles.frame}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <img src={result.url} alt={t('ai.choice.after')} className={styles.image} />
          </motion.div>
          <figcaption>{t(edit ? 'ai.choice.after' : 'ai.choice.newPicture')}</figcaption>
        </figure>
      </div>
      <div className={styles.actions}>
        <Button
          icon={<Check aria-hidden="true" />}
          disabled={disabled}
          onClick={() => onDecide(true)}
        >
          {t('choices.keep.label')}
        </Button>
        <Button
          variant="secondary"
          icon={<Undo2 aria-hidden="true" />}
          disabled={disabled}
          onClick={() => onDecide(false)}
        >
          {t('choices.discard.label')}
        </Button>
        <p className={styles.hint}>{t('ai.choice.sayHint')}</p>
      </div>
    </section>
  );
}
