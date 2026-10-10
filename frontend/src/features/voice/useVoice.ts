import { useCallback, useEffect, useRef, useState } from 'react';

import { currentLanguage, type Language } from '../../shared/i18n';
import { MicBlockedError, MicUnsupportedError, startRecording, type Recording } from './recorder';
import { stopSpeaking } from './speak';

export type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'heard'
  | 'unclear'
  | 'noSpeech'
  | 'micBlocked'
  | 'offline'
  | 'unsupported';

/** What became of a recording: the words heard and whether they were understood. */
export interface VoiceOutcome {
  heard: string;
  understood: boolean;
}

/**
 * What to do with a recording. The editor sends it to Vosk for a command; the
 * AI studio sends it to the AI. Null means the caller already showed what
 * happened (for example a calm notice), so the status goes back to idle.
 */
export type ProcessRecording = (wav: Blob, language: Language) => Promise<VoiceOutcome | null>;

/**
 * Microphone state machine: idle → listening → processing → heard/unclear.
 * `toggle` is the only action: the first press starts, a second press stops.
 */
export function useVoice(process: ProcessRecording) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [heard, setHeard] = useState('');
  const recording = useRef<Recording | null>(null);
  const processor = useRef(process);

  useEffect(() => {
    processor.current = process;
  }, [process]);

  // Release the microphone when the page closes mid-recording.
  useEffect(() => () => recording.current?.stop(), []);

  const toggle = useCallback(async () => {
    if (recording.current) {
      recording.current.stop();
      return;
    }
    stopSpeaking(); // the assistant's voice must not be recorded

    try {
      recording.current = await startRecording();
      setStatus('listening');
      const wav = await recording.current.finished;
      recording.current = null;
      if (!wav) return setStatus('noSpeech');

      setStatus('processing');
      const outcome = await processor.current(wav, currentLanguage());
      if (!outcome) return setStatus('idle');
      setHeard(outcome.heard);
      setStatus(outcome.understood ? 'heard' : 'unclear');
    } catch (error) {
      recording.current = null;
      if (error instanceof MicBlockedError) setStatus('micBlocked');
      else if (error instanceof MicUnsupportedError) setStatus('unsupported');
      else setStatus('offline');
    }
  }, []);

  /** Forget the last result (e.g. after a tile press), unless the microphone is busy. */
  const reset = useCallback(() => {
    setStatus((old) => (old === 'listening' || old === 'processing' ? old : 'idle'));
  }, []);

  return { status, heard, toggle, reset, listening: status === 'listening' };
}
