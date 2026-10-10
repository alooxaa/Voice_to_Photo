import { describe, expect, it } from 'vitest';

import vocabulary from '../../../../shared/commands.json';
import { matchCommand, matchIntensity, normalize } from './matchCommand';
import { MAX_MS, SILENCE_MS, SilenceDetector } from './silence';
import { downsample, encodeWav } from './wav';

describe('matchCommand', () => {
  it('understands each language', () => {
    expect(matchCommand('жарық қыл', 'kk')).toBe('brighten');
    expect(matchCommand('Сделай темнее, пожалуйста', 'ru')).toBe('darken');
    expect(matchCommand('black and white', 'en')).toBe('grayscale');
  });

  it('treats ё like е and ignores punctuation', () => {
    expect(normalize('Чёрно-белое!')).toBe('черно белое');
    expect(matchCommand('Чёрно-белое!', 'ru')).toBe('grayscale');
  });

  it('prefers the longest phrase', () => {
    expect(matchCommand('артқа қайтар', 'kk')).toBe('undo');
    expect(matchCommand('make it darker', 'en')).toBe('darken');
  });

  it('understands every phrase of the shared vocabulary as its own command', () => {
    for (const language of ['kk', 'ru', 'en'] as const) {
      for (const [id, entry] of Object.entries(vocabulary.commands)) {
        for (const phrase of entry[language].say) expect(matchCommand(phrase, language)).toBe(id);
      }
    }
  });

  it('accepts part of a phrase when only one command uses those words', () => {
    // Vosk sometimes drops the last word: "жарқын қыл" arrives as "жарқын".
    expect(matchCommand('жарқын', 'kk')).toBe('brighten');
    expect(matchCommand('сәл жарқын', 'kk')).toBe('brighten');
    // "make it" belongs to many commands, so it alone means nothing.
    expect(matchCommand('make it', 'en')).toBeNull();
  });

  it('hears "a little" and "a lot"', () => {
    expect(matchIntensity('сәл жарық қыл', 'kk')).toBe('little');
    expect(matchIntensity('очень темнее', 'ru')).toBe('lot');
    expect(matchIntensity('much brighter', 'en')).toBe('lot');
    expect(matchIntensity('brighter', 'en')).toBeNull();
  });

  it('matches whole words only', () => {
    expect(matchCommand('backpack', 'en')).toBeNull();
    expect(matchCommand('', 'kk')).toBeNull();
  });
});

describe('SilenceDetector', () => {
  it('stops after a pause that follows speech', () => {
    const detector = new SilenceDetector();
    expect(detector.feed(0.2, 500)).toBe(false);
    expect(detector.feed(0, SILENCE_MS - 100)).toBe(false);
    expect(detector.feed(0, 100)).toBe(true);
    expect(detector.heardSpeech).toBe(true);
  });

  it('waits for a quiet child, but never longer than the maximum', () => {
    const detector = new SilenceDetector();
    expect(detector.feed(0, SILENCE_MS * 2)).toBe(false);
    expect(detector.feed(0, MAX_MS)).toBe(true);
    expect(detector.heardSpeech).toBe(false);
  });
});

describe('wav', () => {
  it('downsamples 48 kHz to 16 kHz by averaging', () => {
    const result = downsample(new Float32Array([0, 0.3, 0.6, 1, 1, 1]), 48000, 16000);
    expect(Array.from(result).map((value) => value.toFixed(2))).toEqual(['0.30', '1.00']);
  });

  it('writes a 16-bit mono PCM header', () => {
    const view = new DataView(encodeWav(new Float32Array([0, 1, -1]), 16000));
    const text = (offset: number) => String.fromCharCode(...new Uint8Array(view.buffer, offset, 4));
    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(6);
    expect(view.getInt16(46, true)).toBe(32767);
    expect(view.getInt16(48, true)).toBe(-32768);
  });
});
