"""One AI studio request, from the child's voice (or an idea tile) to a picture.

1. Speech to text, free-form (the command grammar cannot be used here).
2. Understand the request. A plain editing command is done locally instead,
   without spending the AI quota on it.
3. Run the image model: edit the current photo, or draw a new picture.
4. Store the result as a proposal and write everything into the photo's chat.
   The child then keeps or rejects it (see `decide`).
"""

import io
from dataclasses import dataclass, field

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from PIL import Image, UnidentifiedImageError

from chats import assistant
from chats.models import ChatMessage, LessonProgress
from photos.models import Photo
from speech import recognizer
from speech.commands import exact_command

from . import usage
from .ideas import IDEAS
from .models import AIResult
from .providers import image_provider, text_provider
from .providers.base import (
    LimitReachedError,
    NotConfiguredError,
    RefusedError,
    UnavailableError,
    Understanding,
)


@dataclass
class Outcome:
    transcript: str
    intent: str
    command: str | None = None
    messages: list[ChatMessage] = field(default_factory=list)
    result: AIResult | None = None


def is_ready() -> bool:
    return text_provider() is not None and image_provider() is not None


def transcribe(audio: bytes, lang: str) -> str:
    if settings.AI_TRANSCRIBE_WITH == "vosk":
        return recognizer.recognize(audio, lang, vocabulary=None)
    provider = text_provider()
    if provider is None:
        raise NotConfiguredError("no text provider")
    return provider.transcribe(audio, lang)


def run_request(
    user,
    photo: Photo,
    lang: str,
    *,
    audio: bytes | None = None,
    idea: str | None = None,
    image: bytes | None = None,
) -> Outcome:
    """Raises NotConfiguredError, LimitReachedError or UnavailableError; the view explains them."""
    if not is_ready():
        raise NotConfiguredError("AI providers are not configured")

    usage.take_one(user)
    try:
        return _run(photo, lang, audio=audio, idea=idea, image=image)
    except (NotConfiguredError, LimitReachedError, UnavailableError):
        # Nothing was made, so the request does not count against today's limit.
        usage.give_back(user)
        raise


def _run(photo, lang, *, audio, idea, image) -> Outcome:
    if idea:
        plan = IDEAS[idea]
        understanding = Understanding(
            intent=plan.intent, reply="", prompt_en=plan.prompt_en, edit_kind=plan.edit_kind
        )
        transcript = ""
        child = {"key": "idea", "params": {"idea": idea}}
    else:
        transcript = transcribe(audio, lang).strip()[:200]
        child = {"text": transcript}
        if not transcript:
            return _answer(photo, "unclear", "", child, key="ai_not_heard")
        # A plain editing command is done by the editor itself, without the AI.
        local = exact_command(transcript, lang)
        if local:
            return Outcome(transcript, "local_command", command=local)
        try:
            understanding = text_provider().understand_request(transcript, lang, image is not None)
        except RefusedError:
            return _answer(photo, "refused", transcript, child, key="ai_refused")

    if understanding.intent == "local_command":
        return Outcome(transcript, "local_command", command=understanding.command)
    if understanding.intent in {"unclear", "refused"}:
        key = "" if understanding.reply else f"ai_{understanding.intent}"
        return _answer(photo, understanding.intent, transcript, child, key, understanding.reply)

    kind = understanding.intent if image is not None else "generate"
    try:
        if kind == "edit":
            picture = image_provider().edit_image(image, understanding.prompt_en)
        else:
            picture = image_provider().generate_image(understanding.prompt_en)
    except RefusedError:
        return _answer(photo, "refused", transcript, child, key="ai_refused")

    return _save_result(photo, kind, understanding, transcript, child, picture)


def _answer(photo, intent, transcript, child, key="", text="") -> Outcome:
    """The child's words and one assistant reply, without a picture."""
    with transaction.atomic():
        messages = [
            ChatMessage.objects.create(photo=photo, role=ChatMessage.Role.CHILD, **child),
            ChatMessage.objects.create(
                photo=photo,
                role=ChatMessage.Role.ASSISTANT,
                kind=ChatMessage.Kind.RETRY,
                key=key,
                text=text,
            ),
        ]
    return Outcome(transcript, intent, messages=messages)


def _save_result(photo, kind, understanding, transcript, child, picture: bytes) -> Outcome:
    png = _as_png(picture)
    with transaction.atomic():
        result = AIResult(
            owner=photo.owner,
            photo=photo,
            kind=kind,
            edit_kind=understanding.edit_kind,
            request=transcript,
            idea=child.get("params", {}).get("idea", ""),
            prompt_en=understanding.prompt_en,
        )
        result.image.save("result.png", ContentFile(png), save=False)
        result.save()
        reply = {"text": understanding.reply} if understanding.reply else {"key": f"ai_{kind}"}
        messages = [
            ChatMessage.objects.create(photo=photo, role=ChatMessage.Role.CHILD, **child),
            ChatMessage.objects.create(photo=photo, role=ChatMessage.Role.ASSISTANT, **reply),
            ChatMessage.objects.create(
                photo=photo,
                role=ChatMessage.Role.ASSISTANT,
                kind=ChatMessage.Kind.RESULT,
                key="ai_result",
                result=result,
            ),
        ]
        photo.save(update_fields=["updated"])
    return Outcome(transcript, kind, messages=messages, result=result)


def _as_png(picture: bytes) -> bytes:
    """Check that the service really sent a picture, and store it as PNG."""
    try:
        with Image.open(io.BytesIO(picture)) as image:
            buffer = io.BytesIO()
            image.convert("RGB").save(buffer, format="PNG")
    except (UnidentifiedImageError, OSError) as error:
        raise UnavailableError("The service did not send a picture") from error
    return buffer.getvalue()


@dataclass
class Decision:
    messages: list[ChatMessage]
    progress: LessonProgress
    new_photo: Photo | None = None


@transaction.atomic
def decide(result: AIResult, keep: bool, progress: LessonProgress) -> Decision:
    """The child kept or rejected an AI picture. A kept new picture becomes a photo."""
    result.decision = AIResult.Decision.KEPT if keep else AIResult.Decision.DISCARDED
    new_photo = None
    if keep and result.kind == AIResult.Kind.GENERATE:
        # Named after the child's words; a picture from an idea tile gets the idea's
        # translated name, like the sample photos.
        new_photo = Photo(
            owner=result.owner, title=(result.request or "AI")[:60], title_key=result.idea
        )
        result.image.open("rb")
        with result.image:
            new_photo.original.save("ai.png", ContentFile(result.image.read()), save=False)
        new_photo.save()
        result.new_photo = new_photo
    result.save()

    answer = assistant.ai_decision_reply(
        keep,
        result.kind,
        result.edit_kind,
        assistant.AiLessonState(progress.ai_step, progress.ai_finished),
    )
    messages = [
        ChatMessage.objects.create(
            photo=result.photo,
            role=ChatMessage.Role.ASSISTANT,
            kind=message.kind,
            key=message.key,
            params=message.params,
        )
        for message in answer.messages
    ]
    progress.ai_step = answer.state.step
    progress.ai_finished = answer.state.finished
    progress.save()
    return Decision(messages, progress, new_photo)
