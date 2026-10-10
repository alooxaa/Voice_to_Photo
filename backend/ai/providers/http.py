"""One place that turns HTTP failures of any provider into our error types."""

import requests

from .base import LimitReachedError, NotConfiguredError, RefusedError, UnavailableError

# Image models take several seconds; a slow network should not hang a request forever.
TIMEOUT_SECONDS = 90

# Words services use when a safety filter blocked a request.
_SAFETY_WORDS = ("nsfw", "safety", "flagged", "blocked", "prohibited")


def post(url: str, **kwargs) -> dict:
    """POST and return the JSON answer, or raise a ProviderError subclass."""
    try:
        response = requests.post(url, timeout=TIMEOUT_SECONDS, **kwargs)
    except requests.RequestException as error:
        raise UnavailableError(str(error)) from error

    status = response.status_code
    text = response.text[:300]
    if status == 429:
        raise LimitReachedError(text)
    if status in (401, 403) or (status == 400 and "api key" in text.lower()):
        raise NotConfiguredError(text)
    if status >= 400 and any(word in text.lower() for word in _SAFETY_WORDS):
        raise RefusedError(text)
    if status >= 400:
        raise UnavailableError(f"{status}: {text}")
    try:
        return response.json()
    except ValueError as error:
        raise UnavailableError("The answer was not JSON") from error
