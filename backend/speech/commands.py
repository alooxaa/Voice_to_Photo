"""Turn recognised text into a command id, and build Vosk grammars."""

import re

from .vocabulary import ADJUSTABLE, CHOICE_PHRASES, INTENSITY, PHRASES

UNKNOWN = "[unk]"

# What the recogniser listens for: editing commands, or the keep/discard choice.
VOCABULARIES = {"commands": PHRASES, "choice": CHOICE_PHRASES}


def normalize(text: str) -> str:
    """Lower-case, treat "ё" as "е", and keep only letters separated by single spaces."""
    text = text.lower().replace("ё", "е")
    return " ".join(re.findall(r"[^\W\d_]+", text))


def grammar(lang: str, vocabulary: str = "commands") -> list[str]:
    """Every phrase for the language plus "[unk]" for everything else.

    Restricting Vosk to this list makes it pick the closest command instead of
    guessing free text, which helps a lot with children's voices. Commands with
    a strength also get their "a little" / "a lot" variants ("сәл жарық қыл").
    Phrases keep "ё", because the Russian model spells some words with it.
    """
    phrases = {phrase for group in VOCABULARIES[vocabulary][lang].values() for phrase in group}
    if vocabulary == "commands":
        modifiers = [word for words in INTENSITY[lang].values() for word in words]
        for command in ADJUSTABLE:
            for phrase in PHRASES[lang][command]:
                phrases.update(f"{modifier} {phrase}" for modifier in modifiers)
    return [*sorted(phrases), UNKNOWN]


def match_command(text: str, lang: str, vocabulary: str = "commands") -> str | None:
    """Return the command the text asks for, or None.

    First a whole phrase is looked for; when several appear, the longest one
    wins, so "make it darker" is not mistaken for something shorter inside it.
    Vosk sometimes returns only part of a phrase ("жарқын" for "жарқын қыл").
    Then a command is still chosen, but only when every word heard belongs to
    that command's phrases and at least one of them belongs to no other command.
    """
    phrases = VOCABULARIES[vocabulary][lang]
    words = f" {normalize(text)} "
    best_id, best_length = None, 0
    for command_id, options in phrases.items():
        for phrase in options:
            phrase = normalize(phrase)
            if f" {phrase} " in words and len(phrase) > best_length:
                best_id, best_length = command_id, len(phrase)
    if best_id:
        return best_id

    heard = set(words.split()) - _modifier_words(lang)
    if not heard:
        return None
    command_words = {
        command_id: {word for phrase in options for word in normalize(phrase).split()}
        for command_id, options in phrases.items()
    }
    candidates = [
        command_id
        for command_id, own in command_words.items()
        if heard <= own
        and any(
            all(word not in other for cid, other in command_words.items() if cid != command_id)
            for word in heard
        )
    ]
    return candidates[0] if len(candidates) == 1 else None


def _modifier_words(lang: str) -> set[str]:
    return {
        word for words in INTENSITY[lang].values() for w in words for word in normalize(w).split()
    }


def match_intensity(text: str, lang: str) -> str | None:
    """Return "little" for words like "сәл" or "a bit", "lot" for "өте" or "much", else None."""
    words = f" {normalize(text)} "
    for level in ("little", "lot"):
        if any(f" {normalize(word)} " in words for word in INTENSITY[lang][level]):
            return level
    return None
