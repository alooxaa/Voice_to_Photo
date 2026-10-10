import { useCallback, useEffect, useRef, useState } from 'react';

import { currentLanguage } from '../../shared/i18n';
import { matchCommand, matchIntensity } from './matchCommand';
import { recognizeSpeech, type Recognition } from './recognize';
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

/**
 * Microphone state machine: idle → listening → processing → heard/unclear.
 * `toggle` is the only action: the first press starts, a second press stops.
 */
export function useVoice(onResult: (result: Recognition) => void) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [heard, setHeard] = useState('');
  const recording = useRef<Recording | null>(null);
  const resultHandler = useRef(onResult);

  useEffect(() => {
    resultHandler.current = onResult;
  }, [onResult]);

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
      const language = currentLanguage();
      const result = await recognizeSpeech(wav, language);
      const command = result.command ?? matchCommand(result.text, language);
      const intensity = result.intensity ?? matchIntensity(result.text, language);
      setHeard(result.text);
      setStatus(command ? 'heard' : 'unclear');
      resultHandler.current({ text: result.text, command, intensity });
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
