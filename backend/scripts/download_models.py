"""Download the free offline models: Vosk speech models into backend/models_stt/
and the rembg background-removal model into backend/models_ai/.

Run from the project root:

    .\\.venv\\Scripts\\python.exe backend\\scripts\\download_models.py

Models that are already unpacked are skipped, so the script is safe to re-run.
"""

import os
import sys
import urllib.request
import zipfile
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from speech.model_names import MODEL_NAMES  # noqa: E402  (needs the path above)

BASE_URL = "https://alphacephei.com/vosk/models/"


class Progress:
    """Prints a one-line progress bar, redrawn only when the percentage changes."""

    def __init__(self) -> None:
        self.last_percent = -1

    def __call__(self, block_count: int, block_size: int, total_size: int) -> None:
        if total_size <= 0:
            return
        done = min(block_count * block_size, total_size)
        percent = done * 100 // total_size
        if percent == self.last_percent:
            return
        self.last_percent = percent
        bar = "#" * (percent // 4)
        sys.stdout.write(f"\r  [{bar:<25}] {percent:3d}%  of {total_size // 2**20} MB")
        sys.stdout.flush()


def download_model(name: str, target: Path) -> None:
    if (target / name).is_dir():
        print(f"{name}: already present, skipped")
        return

    archive = target / f"{name}.zip"
    print(f"{name}: downloading")
    urllib.request.urlretrieve(f"{BASE_URL}{name}.zip", archive, Progress())
    print()

    print(f"{name}: unpacking")
    with zipfile.ZipFile(archive) as zipped:
        zipped.extractall(target)
    archive.unlink()
    print(f"{name}: ready")


def download_background_model(name: str, target: Path) -> None:
    """rembg downloads its own weights (with a progress bar) into U2NET_HOME."""
    if (target / "models" / name / f"{name}.onnx").is_file():
        print(f"rembg {name}: already present, skipped")
        return
    print(f"rembg {name}: downloading")
    os.environ["U2NET_HOME"] = str(target)
    from rembg import new_session  # heavy import, only needed here

    new_session(name)
    print(f"rembg {name}: ready")


def main() -> None:
    load_dotenv(BACKEND_DIR.parent / ".env")
    target = Path(os.getenv("VOSK_MODELS_DIR") or BACKEND_DIR / "models_stt")
    target.mkdir(parents=True, exist_ok=True)
    print(f"Models folder: {target}")
    for name in MODEL_NAMES.values():
        download_model(name, target)

    ai_target = Path(os.getenv("REMBG_MODELS_DIR") or BACKEND_DIR / "models_ai")
    ai_target.mkdir(parents=True, exist_ok=True)
    download_background_model(os.getenv("REMBG_MODEL", "u2net"), ai_target)


if __name__ == "__main__":
    main()
