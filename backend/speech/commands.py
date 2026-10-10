"""Turn recognised text into a command id, and build Vosk grammars."""

import re

from .phrases import PHRASES

LANGUAGES = tuple(PHRASES)
COMMAND_IDS = tuple(PHRASES["en"])
UNKNOWN = "[unk]"


def normalize(text: str) -> str:
    """Lower-case, treat "ё" as "е", and keep only letters separated by single spaces."""
    text = text.lower().replace("ё", "е")
    return " ".join(re.findall(r"[^\W\d_]+", text))


def grammar(lang: str) -> list[str]:
    """Every command phrase for the language plus "[unk]" for everything else.

    Restricting Vosk to this list makes it pick the closest command instead of
    guessing free text, which helps a lot with children's voices.
    """
    phrases = sorted({phrase for group in PHRASES[lang].values() for phrase in group})
    return [*phrases, UNKNOWN]


def match_command(text: str, lang: str) -> str | None:
    """Return the command whose phrase appears in `text`, or None.

    When several phrases appear, the longest one wins, so "make it darker"
    is not mistaken for something shorter inside it.
    """
    words = f" {normalize(text)} "
    best_id, best_length = None, 0
    for command_id, phrases in PHRASES[lang].items():
        for phrase in phrases:
            phrase = normalize(phrase)
            if f" {phrase} " in words and len(phrase) > best_length:
                best_id, best_length = command_id, len(phrase)
    return best_id
