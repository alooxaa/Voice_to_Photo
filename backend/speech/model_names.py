"""Vosk model folder per language (checked on https://alphacephei.com/vosk/models).

Kept free of Django imports so `scripts/download_models.py` can reuse it.
"""

MODEL_NAMES = {
    "kk": "vosk-model-small-kz-0.42",
    "ru": "vosk-model-small-ru-0.22",
    "en": "vosk-model-small-en-us-0.15",
}

# Optional bigger models for free speech (the AI studio with AI_TRANSCRIBE_WITH=vosk).
# They cannot use a grammar, so for commands the small models above work better.
FREE_SPEECH_MODELS = {"kk": "vosk-model-kz-0.42"}
