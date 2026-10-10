"""Background removal with rembg: free and local, no external service.

The neural network (a few hundred MB of ONNX weights) is downloaded once by
`scripts/download_models.py` into `backend/models_ai/`. It is loaded on the
first request and then reused, like the Vosk models.
"""

import io
import os
import threading
from pathlib import Path

from django.conf import settings
from PIL import Image, UnidentifiedImageError

_session = None
_lock = threading.Lock()


class BackgroundModelMissingError(RuntimeError):
    """The rembg model has not been downloaded yet."""


class BadImageError(ValueError):
    """The uploaded file is not an image Pillow can read."""


def model_path() -> Path:
    """Where rembg keeps the weights: `<home>/models/<name>/<name>.onnx`."""
    name = settings.REMBG_MODEL
    return Path(settings.REMBG_MODELS_DIR) / "models" / name / f"{name}.onnx"


def _get_session():
    global _session
    with _lock:
        if _session is None:
            # Never download during a request: the app must work offline.
            if not model_path().is_file():
                raise BackgroundModelMissingError(f"Model not found: {model_path()}")
            os.environ["U2NET_HOME"] = str(settings.REMBG_MODELS_DIR)
            from rembg import new_session  # heavy import, only when first needed

            _session = new_session(settings.REMBG_MODEL)
        return _session


def remove_background(image_bytes: bytes) -> bytes:
    """Return a PNG of the same picture with a transparent background."""
    session = _get_session()
    from rembg import remove

    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            result = remove(image.convert("RGB"), session=session)
    except (UnidentifiedImageError, OSError) as error:
        raise BadImageError(str(error)) from error

    buffer = io.BytesIO()
    result.save(buffer, format="PNG")
    return buffer.getvalue()
