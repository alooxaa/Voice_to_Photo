"""Instructions shared by all text models, and how their answers are checked.

The text model never talks to the child freely: it must answer with one JSON
object, and `parse_understanding` accepts only known intents and commands and
cuts the reply to two short sentences.
"""

import json
import re

from speech.vocabulary import COMMAND_IDS, ENTRIES

from .base import EDIT_KINDS, INTENTS, Understanding

LANGUAGE_NAMES = {"kk": "Kazakh", "ru": "Russian", "en": "English"}

# Commands the photo editor can do by itself, so the AI quota is not spent on them.
_LOCAL_COMMANDS = "\n".join(
    f"- {command}: {ENTRIES[command]['en']['label']}"
    for command in COMMAND_IDS
    if command not in {"undo", "redo", "reset", "save"}
)

SYSTEM_INSTRUCTION = f"""\
You help a child aged 6 to 12 with dyspraxia use a voice-controlled photo editor.
The child spoke; you get what speech recognition heard, which may contain mistakes.
Decide what the child wants and answer with one JSON object only.

intent:
- "local_command" if a simple editor tool does it. Then "command" is one of:
{_LOCAL_COMMANDS}
- "edit" to change the current photo in a way those tools cannot (add or remove an
  object, change the sky, change the style). Only possible when a photo is open.
- "generate" to draw a completely new picture from an idea.
- "unclear" if you cannot tell what the child wants.
- "refused" if the request is not suitable for a young child (violence, weapons,
  blood, scary or adult content, real people, personal information) or asks to
  change a person's face or body.

prompt_en: for "edit" or "generate", one short clear English instruction for an
image model. For "edit" describe only the change ("add a rainbow in the sky").
Always keep it cheerful and suitable for young children. Otherwise "".

edit_kind: "add" (something is added), "remove" (something is taken away),
"style" (the look or style changes), or "other".

reply: one or two very short, warm sentences in {{language}}, for the child.
Say what you will do, or for "unclear" and "refused" gently suggest an idea such
as adding a rainbow or making it snow. Never blame the child, never ask for
personal information, never use more than two sentences.
"""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "intent": {"type": "string", "enum": list(INTENTS)},
        "command": {"type": "string"},
        "prompt_en": {"type": "string"},
        "edit_kind": {"type": "string", "enum": list(EDIT_KINDS)},
        "reply": {"type": "string"},
    },
    "required": ["intent", "reply"],
}

# Added to every image instruction, whatever the text model wrote.
IMAGE_SAFETY_SUFFIX = " Keep it friendly, colourful and suitable for young children."

MAX_REPLY_CHARACTERS = 220


def system_instruction(lang: str) -> str:
    return SYSTEM_INSTRUCTION.replace("{language}", LANGUAGE_NAMES[lang])


def user_message(transcript: str, has_photo: bool) -> str:
    photo = "A photo is open." if has_photo else "No photo is open."
    return f"{photo}\nThe child said: {transcript}"


def short_reply(text: str) -> str:
    """At most two sentences and a few dozen words, whatever the model wrote."""
    sentences = re.split(r"(?<=[.!?…])\s+", " ".join(text.split()))
    reply = " ".join(sentences[:2])
    if len(reply) > MAX_REPLY_CHARACTERS:
        reply = reply[: MAX_REPLY_CHARACTERS - 1].rsplit(" ", 1)[0] + "…"
    return reply


def parse_understanding(raw: str) -> Understanding:
    """Turn the model's JSON into an Understanding; anything odd becomes "unclear"."""
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    try:
        data = json.loads(match.group(0) if match else raw)
    except (json.JSONDecodeError, TypeError):
        return Understanding(intent="unclear", reply="")
    if not isinstance(data, dict):
        return Understanding(intent="unclear", reply="")

    intent = data.get("intent")
    command = data.get("command") or None
    prompt_en = str(data.get("prompt_en") or "").strip()[:400]
    edit_kind = data.get("edit_kind") if data.get("edit_kind") in EDIT_KINDS else "other"
    reply = short_reply(str(data.get("reply") or ""))

    if intent not in INTENTS:
        intent = "unclear"
    if intent == "local_command" and command not in COMMAND_IDS:
        intent = "unclear"
    if intent in {"edit", "generate"} and not prompt_en:
        intent = "unclear"
    if intent != "local_command":
        command = None
    return Understanding(
        intent=intent, reply=reply, prompt_en=prompt_en, command=command, edit_kind=edit_kind
    )
