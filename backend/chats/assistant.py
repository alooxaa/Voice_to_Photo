"""The chat assistant: free, local and rule-based.

Everything the rest of the app needs is `reply(...)`. It takes the command the
child gave (or None if nothing was understood), the lesson state and the
language, and returns the assistant's messages plus the new lesson state.
A real language model could replace the body of `reply` later without any
change to the views or the frontend.
"""

import random
from dataclasses import dataclass

from .assistant_texts import LABELS, TEXTS

LESSON_STEPS = ("brighten", "darken", "grayscale", "undo", "rotate", "save")


@dataclass(frozen=True)
class LessonState:
    step: int = 0  # index into LESSON_STEPS of the task to do now
    finished: bool = False


@dataclass(frozen=True)
class AssistantMessage:
    kind: str  # "text" | "task" | "praise" | "retry"
    text: str
    command: str | None = None


@dataclass(frozen=True)
class Reply:
    messages: list[AssistantMessage]
    state: LessonState


def task_message(step: int, lang: str) -> AssistantMessage:
    command = LESSON_STEPS[step]
    text = TEXTS[lang]["task"].format(label=LABELS[lang][command])
    return AssistantMessage("task", text, command)


def reply(
    command: str | None,
    state: LessonState,
    lang: str,
    heard: str = "",
    rng: random.Random | None = None,
) -> Reply:
    rng = rng or random.Random()
    texts = TEXTS[lang]

    if command is None:
        return Reply([_not_understood(state, lang, heard, rng)], state)

    effect = texts["effects"][command]

    if state.finished:
        # Free mode: no tasks, just confirm what happened.
        return Reply([AssistantMessage("text", effect, command)], state)

    if command != LESSON_STEPS[state.step]:
        # A valid command, but not the task: it still works, then we gently repeat the task.
        text = rng.choice(texts["other_command"]).format(effect=effect)
        return Reply(
            [AssistantMessage("text", text, command), task_message(state.step, lang)], state
        )

    praise = AssistantMessage("praise", f"{rng.choice(texts['praise'])} {effect}", command)
    next_step = state.step + 1
    if next_step == len(LESSON_STEPS):
        finished = AssistantMessage("praise", texts["finished"])
        return Reply([praise, finished], LessonState(step=next_step, finished=True))
    return Reply([praise, task_message(next_step, lang)], LessonState(step=next_step))


def _not_understood(
    state: LessonState, lang: str, heard: str, rng: random.Random
) -> AssistantMessage:
    """Never blame the child: say what was heard and what to do next."""
    texts = TEXTS[lang]
    if state.finished:
        key = "free_retry_heard" if heard else "free_retry_unclear"
        return AssistantMessage("retry", rng.choice(texts[key]).format(heard=heard))

    key = "retry_heard" if heard else "retry_unclear"
    label = LABELS[lang][LESSON_STEPS[state.step]]
    return AssistantMessage("retry", rng.choice(texts[key]).format(heard=heard, label=label))
