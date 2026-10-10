"""The chat assistant: free, local and rule-based.

Everything the rest of the app needs is `reply(...)`. It takes the command the
child gave (or None if nothing was understood), the lesson state and the
language, and returns the assistant's messages plus the new lesson state.
A real language model could replace the body of `reply` later without any
change to the views or the frontend.

Messages are returned as a template key plus parameters, not as final text.
The frontend turns them into words in the language the interface uses at the
moment of reading, so a chat never mixes languages after a language switch.
The templates live in `frontend/src/shared/i18n/*.json` under `assistant`.
"""

import random
from dataclasses import dataclass, field

from speech.vocabulary import GROUP_OF

# One step from each group, so the lesson visits every kind of tool once.
# The frontend shows the same steps (features/lesson/steps.ts).
LESSON_STEPS = ("brighten", "grayscale", "rotate", "blur", "undo", "auto_enhance")

# Commands suggested in free mode when the child said something we did not understand:
# simple, instant edits that are easy to see.
EXAMPLE_COMMANDS = tuple(
    command for command, group in GROUP_OF.items() if group in {"light", "colour", "shape"}
)


@dataclass(frozen=True)
class LessonState:
    step: int = 0  # index into LESSON_STEPS of the task to do now
    finished: bool = False


@dataclass(frozen=True)
class AssistantMessage:
    kind: str  # "text" | "task" | "praise" | "retry"
    key: str  # template name, e.g. "praise" or "retry_heard"
    params: dict = field(default_factory=dict)
    command: str | None = None


@dataclass(frozen=True)
class Reply:
    messages: list[AssistantMessage]
    state: LessonState


def task_message(step: int) -> AssistantMessage:
    return AssistantMessage("task", "task", {"step": step}, LESSON_STEPS[step])


def reply(
    command: str | None,
    state: LessonState,
    heard: str = "",
    rng: random.Random | None = None,
    teaching: bool = True,
) -> Reply:
    """`teaching=False` (a simple command asked for in the AI studio) only confirms the
    change: the editing lesson's tasks belong to Edit mode."""
    rng = rng or random.Random()

    if command is None:
        return Reply([_not_understood(state, heard, rng)], state)

    if state.finished or not teaching:
        # Free mode: no tasks, just confirm what happened.
        return Reply([AssistantMessage("text", "effect", {}, command)], state)

    if command != LESSON_STEPS[state.step]:
        # A valid command, but not the task: it still works, then we gently repeat the task.
        return Reply(
            [AssistantMessage("text", "other_command", {}, command), task_message(state.step)],
            state,
        )

    praise = AssistantMessage("praise", "praise", {}, command)
    next_step = state.step + 1
    if next_step == len(LESSON_STEPS):
        # This message is also the one-time notice that free mode has started.
        finished = AssistantMessage("praise", "finished")
        return Reply([praise, finished], LessonState(step=next_step, finished=True))
    return Reply([praise, task_message(next_step)], LessonState(step=next_step))


def _not_understood(state: LessonState, heard: str, rng: random.Random) -> AssistantMessage:
    """Never blame the child: say what was heard and what to do next."""
    if state.finished:
        # Free mode has no task to repeat, so we suggest a few commands instead.
        examples = rng.sample(EXAMPLE_COMMANDS, 3)
        key = "free_retry_heard" if heard else "free_retry_unclear"
        return AssistantMessage("retry", key, {"heard": heard, "examples": examples})

    key = "retry_heard" if heard else "retry_unclear"
    return AssistantMessage("retry", key, {"heard": heard, "expected": LESSON_STEPS[state.step]})


# ---------------------------------------------------------------- AI studio

# The AI studio's short lesson: add something, change the style, remove something.
AI_LESSON_STEPS = ("add", "style", "remove")


@dataclass(frozen=True)
class AiLessonState:
    step: int = 0
    finished: bool = False


@dataclass(frozen=True)
class AiReply:
    messages: list[AssistantMessage]
    state: AiLessonState


def ai_task_message(step: int) -> AssistantMessage:
    return AssistantMessage("task", "ai_task", {"step": step})


def ai_decision_reply(kept: bool, kind: str, edit_kind: str, state: AiLessonState) -> AiReply:
    """What the assistant says after the child kept or rejected an AI picture."""
    if not kept:
        return AiReply([AssistantMessage("text", "ai_discarded")], state)

    saved = "ai_saved" if kind == "generate" else "ai_kept"
    if state.finished or edit_kind != AI_LESSON_STEPS[state.step]:
        return AiReply([AssistantMessage("praise", saved)], state)

    next_step = state.step + 1
    if next_step == len(AI_LESSON_STEPS):
        finished = AssistantMessage("praise", "ai_finished")
        return AiReply(
            [AssistantMessage("praise", saved), finished],
            AiLessonState(step=next_step, finished=True),
        )
    return AiReply(
        [AssistantMessage("praise", saved), ai_task_message(next_step)],
        AiLessonState(step=next_step),
    )
