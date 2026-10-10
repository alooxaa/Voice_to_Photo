"""Offline speech recognition with Vosk.

Each language model is loaded once, on first use, and then reused by every
request: loading takes a few seconds, recognising a short phrase does not.
"""

import io
import json
import sys
import threading
import wave
from pathlib import Path

from django.conf import settings
from vosk import KaldiRecognizer, Model, SetLogLevel

from .commands import grammar
from .model_names import FREE_SPEECH_MODELS, MODEL_NAMES

SetLogLevel(-1)

_models: dict[str, Model] = {}
_lock = threading.Lock()


class ModelMissingError(RuntimeError):
    """The Vosk model for a language has not been downloaded."""


class BadAudioError(ValueError):
    """The uploaded file is not a 16-bit mono PCM WAV."""


def _vosk_path(path: Path) -> str:
    """Vosk's C++ core cannot open non-ASCII paths on Windows (this project
    lives in a Cyrillic folder), so we pass the short 8.3 form of the path."""
    if sys.platform != "win32":
        return str(path)
    import ctypes

    buffer = ctypes.create_unicode_buffer(1024)
    length = ctypes.windll.kernel32.GetShortPathNameW(str(path), buffer, len(buffer))
    return buffer.value if length else str(path)


def get_model(lang: str, free_speech: bool = False) -> Model:
    """The small model for the language; for free speech a bigger one when it is present."""
    folder = Path(settings.VOSK_MODELS_DIR)
    name = MODEL_NAMES[lang]
    large = FREE_SPEECH_MODELS.get(lang)
    if free_speech and large and (folder / large).is_dir():
        name = large
    with _lock:
        if name not in _models:
            path = folder / name
            if not path.is_dir():
                raise ModelMissingError(f"Model not found: {path}")
            _models[name] = Model(_vosk_path(path))
        return _models[name]


def recognize(audio: bytes, lang: str, vocabulary: str | None = "commands") -> str:
    """Return the text heard in a WAV file.

    With a vocabulary ("commands" or "choice") Vosk only listens for those
    phrases. With None it transcribes free speech, which is far less accurate
    with the small models; the AI studio uses it only when no cloud
    transcription is configured.
    """
    try:
        with wave.open(io.BytesIO(audio)) as wav:
            if wav.getnchannels() != 1 or wav.getsampwidth() != 2:
                raise BadAudioError("Expected 16-bit mono PCM WAV.")
            sample_rate = wav.getframerate()
            frames = wav.readframes(wav.getnframes())
    except (wave.Error, EOFError) as error:
        raise BadAudioError(str(error)) from error

    if vocabulary:
        phrases = json.dumps(grammar(lang, vocabulary), ensure_ascii=False)
        recognizer = KaldiRecognizer(get_model(lang), sample_rate, phrases)
    else:
        recognizer = KaldiRecognizer(get_model(lang, free_speech=True), sample_rate)
    chunk = 8000
    for start in range(0, len(frames), chunk):
        recognizer.AcceptWaveform(frames[start : start + chunk])
    text = json.loads(recognizer.FinalResult()).get("text", "")
    # "[unk]" means "something that is not a command"; hide it from the child.
    return " ".join(word for word in text.split() if word != "[unk]")
