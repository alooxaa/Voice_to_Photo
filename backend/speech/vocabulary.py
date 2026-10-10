"""The command vocabulary, read from the one file both apps share.

`shared/commands.json` in the project root lists every command with its group,
and per language its label, the sentence describing its effect, and the
phrases a child can say. The frontend imports the same file, so the words the
recogniser listens for and the words shown on the tiles cannot drift apart.

Kept free of Django imports so scripts can reuse it.
"""

import json
from pathlib import Path

VOCABULARY_FILE = Path(__file__).resolve().parents[2] / "shared" / "commands.json"

_data = json.loads(VOCABULARY_FILE.read_text(encoding="utf-8"))

LANGUAGES = ("kk", "ru", "en")
GROUPS: tuple[str, ...] = tuple(_data["groups"])
COMMAND_IDS: tuple[str, ...] = tuple(_data["commands"])
CHOICE_IDS: tuple[str, ...] = tuple(_data["choices"])

# Commands whose strength can be changed by "a little" / "a lot" words.
ADJUSTABLE: frozenset[str] = frozenset(
    command for command, entry in _data["commands"].items() if entry.get("adjustable")
)
GROUP_OF: dict[str, str] = {command: entry["group"] for command, entry in _data["commands"].items()}

# PHRASES[lang][command] -> what a child may say for it.
PHRASES: dict[str, dict[str, list[str]]] = {
    lang: {command: entry[lang]["say"] for command, entry in _data["commands"].items()}
    for lang in LANGUAGES
}
# The words of the keep/discard choice in the AI studio.
CHOICE_PHRASES: dict[str, dict[str, list[str]]] = {
    lang: {choice: entry[lang]["say"] for choice, entry in _data["choices"].items()}
    for lang in LANGUAGES
}
# INTENSITY[lang]["little" | "lot"] -> modifier words.
INTENSITY: dict[str, dict[str, list[str]]] = _data["intensity"]
