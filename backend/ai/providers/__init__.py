"""Choose the providers from the settings (which come from `.env`).

Two roles: the text provider listens to free speech and understands the
request; the image provider edits and draws pictures. One service may play
both roles. Without keys both are None and the AI studio says so kindly.
"""

from django.conf import settings

from .base import AIProvider
from .cloudflare import CloudflareProvider
from .gemini import GeminiProvider


def _gemini() -> AIProvider | None:
    if not settings.GEMINI_API_KEY:
        return None
    return GeminiProvider(settings.GEMINI_API_KEY, settings.GEMINI_MODEL)


def _cloudflare() -> AIProvider | None:
    if not (settings.CLOUDFLARE_ACCOUNT_ID and settings.CLOUDFLARE_API_TOKEN):
        return None
    return CloudflareProvider(
        account_id=settings.CLOUDFLARE_ACCOUNT_ID,
        api_token=settings.CLOUDFLARE_API_TOKEN,
        image_model=settings.CLOUDFLARE_IMAGE_MODEL,
        text_model=settings.CLOUDFLARE_TEXT_MODEL,
        speech_model=settings.CLOUDFLARE_SPEECH_MODEL,
    )


_FACTORIES = {"gemini": _gemini, "cloudflare": _cloudflare}


def _choose(preferred: str, order: tuple[str, ...]) -> AIProvider | None:
    """The provider named in `.env`, or else the first one that has a key."""
    if preferred:
        factory = _FACTORIES.get(preferred)
        return factory() if factory else None
    for name in order:
        provider = _FACTORIES[name]()
        if provider:
            return provider
    return None


def text_provider() -> AIProvider | None:
    # Gemini understands Kazakh best, so it comes first when both keys are there.
    return _choose(settings.AI_TEXT_PROVIDER, ("gemini", "cloudflare"))


def image_provider() -> AIProvider | None:
    # Only Cloudflare draws on a free plan (checked in October 2026).
    return _choose(settings.AI_IMAGE_PROVIDER, ("cloudflare",))
