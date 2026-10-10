"""Spoken command phrases, one module per language.

Every phrase uses only words found in the matching Vosk model's vocabulary;
unknown words would be silently dropped from the grammar. The frontend keeps
the same lists in `frontend/src/shared/i18n/*.json` under `commands.<id>.say`;
`speech/tests.py` fails if the two drift apart.
"""

from . import en, kk, ru

PHRASES: dict[str, dict[str, list[str]]] = {
    "kk": kk.PHRASES,
    "ru": ru.PHRASES,
    "en": en.PHRASES,
}
