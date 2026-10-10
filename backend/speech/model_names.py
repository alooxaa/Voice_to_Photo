"""Vosk model folder per language (checked on https://alphacephei.com/vosk/models).

Kept free of Django imports so `scripts/download_models.py` can reuse it.
"""

MODEL_NAMES = {
    "kk": "vosk-model-small-kz-0.42",
    "ru": "vosk-model-small-ru-0.22",
    "en": "vosk-model-small-en-us-0.15",
}
