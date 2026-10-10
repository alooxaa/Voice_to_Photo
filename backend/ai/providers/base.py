"""The interface every AI provider implements.

The rest of the app only talks to these four methods, so a provider can be
swapped in `.env` without touching the views or the frontend. A provider that
cannot do something raises `NotSupportedError`.
"""

from abc import ABC
from dataclasses import dataclass


class ProviderError(Exception):
    """Base class; the views turn each kind into a calm message for the child."""


class NotConfiguredError(ProviderError):
    """No key, or the key was refused: a grown-up has to connect the service."""


class LimitReachedError(ProviderError):
    """The free daily quota of the service (or of our own counter) is used up."""


class UnavailableError(ProviderError):
    """The service could not be reached or failed: no network, timeout, server error."""


class RefusedError(ProviderError):
    """The service's safety filter blocked the request or the picture."""


class NotSupportedError(ProviderError):
    """This provider does not offer this capability."""


INTENTS = ("edit", "generate", "local_command", "unclear", "refused")
EDIT_KINDS = ("add", "style", "remove", "other")


@dataclass(frozen=True)
class Understanding:
    """What the child asked for, worked out by the text model."""

    intent: str  # one of INTENTS
    reply: str  # a short friendly sentence in the child's language
    prompt_en: str = ""  # a clean English instruction for the image model
    command: str | None = None  # for intent "local_command": an editing command id
    edit_kind: str = "other"  # one of EDIT_KINDS, for the AI studio's lesson


class AIProvider(ABC):  # noqa: B024  (no method is abstract: each one is optional)
    name = "base"

    def transcribe(self, wav: bytes, lang: str) -> str:
        """Free speech in a 16 kHz mono WAV to text, in the given language."""
        raise NotSupportedError(f"{self.name} cannot transcribe")

    def understand_request(self, transcript: str, lang: str, has_photo: bool) -> Understanding:
        """Decide what the child wants, following prompts.SYSTEM_INSTRUCTION."""
        raise NotSupportedError(f"{self.name} cannot understand requests")

    def edit_image(self, image: bytes, prompt_en: str) -> bytes:
        """Change a photo (PNG bytes) as the instruction says; returns image bytes."""
        raise NotSupportedError(f"{self.name} cannot edit images")

    def generate_image(self, prompt_en: str) -> bytes:
        """Draw a new picture from a description; returns image bytes."""
        raise NotSupportedError(f"{self.name} cannot generate images")
