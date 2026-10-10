"""Cloudflare Workers AI: free daily allowance, no bank card on the free plan.

It is the provider that draws: FLUX.2 [klein] both edits a photo from a text
instruction and draws new pictures. It can also transcribe speech (Whisper)
and understand requests (a small open text model), so it can run the whole
AI studio on its own.
"""

import base64
import io
import json

from PIL import Image

from . import http, prompts
from .base import AIProvider, UnavailableError, Understanding

API_URL = "https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/{model}"

# FLUX.2 [klein] only accepts input images smaller than 512 × 512.
MAX_INPUT_SIDE = 504
# Output pictures: the long side in pixels (a multiple of 16, as the model prefers).
OUTPUT_LONG_SIDE = 1024


def input_png(image: bytes) -> bytes:
    """The photo scaled down for the model, flattened on white (no transparency)."""
    with Image.open(io.BytesIO(image)) as source:
        picture = source.convert("RGBA")
    flat = Image.new("RGB", picture.size, (255, 255, 255))
    flat.paste(picture, mask=picture.getchannel("A"))
    flat.thumbnail((MAX_INPUT_SIDE, MAX_INPUT_SIDE))
    buffer = io.BytesIO()
    flat.save(buffer, format="PNG")
    return buffer.getvalue()


def output_size(image: bytes | None) -> tuple[int, int]:
    """Keep the photo's proportions; a new picture is landscape 4:3."""
    width, height = (4, 3)
    if image:
        with Image.open(io.BytesIO(image)) as source:
            width, height = source.size
    scale = OUTPUT_LONG_SIDE / max(width, height)
    return (max(256, round(width * scale / 16) * 16), max(256, round(height * scale / 16) * 16))


class CloudflareProvider(AIProvider):
    name = "cloudflare"

    def __init__(
        self, account_id: str, api_token: str, image_model: str, text_model: str, speech_model: str
    ):
        self.account_id = account_id
        self.api_token = api_token
        self.image_model = image_model
        self.text_model = text_model
        self.speech_model = speech_model

    def _run(self, model: str, **kwargs) -> dict:
        data = http.post(
            API_URL.format(account=self.account_id, model=model),
            headers={"Authorization": f"Bearer {self.api_token}"},
            **kwargs,
        )
        if not data.get("success", True) or "result" not in data:
            raise UnavailableError(str(data.get("errors"))[:300])
        return data["result"]

    def transcribe(self, wav: bytes, lang: str) -> str:
        result = self._run(
            self.speech_model,
            json={"audio": base64.b64encode(wav).decode("ascii"), "language": lang},
        )
        return str(result.get("text", "")).strip()

    def understand_request(self, transcript: str, lang: str, has_photo: bool) -> Understanding:
        result = self._run(
            self.text_model,
            json={
                "messages": [
                    {"role": "system", "content": prompts.system_instruction(lang)},
                    {"role": "user", "content": prompts.user_message(transcript, has_photo)},
                ],
                "response_format": {
                    "type": "json_schema",
                    "json_schema": prompts.RESPONSE_SCHEMA,
                },
                "max_tokens": 400,
                "temperature": 0.3,
            },
        )
        answer = result.get("response", "")
        # In JSON mode the answer usually arrives already parsed.
        raw = answer if isinstance(answer, str) else json.dumps(answer)
        return prompts.parse_understanding(raw)

    def _draw(self, prompt_en: str, image: bytes | None) -> bytes:
        width, height = output_size(image)
        fields = {
            "prompt": (None, prompt_en + prompts.IMAGE_SAFETY_SUFFIX),
            "width": (None, str(width)),
            "height": (None, str(height)),
        }
        if image:
            fields["input_image_0"] = ("photo.png", input_png(image), "image/png")
        result = self._run(self.image_model, files=fields)
        try:
            return base64.b64decode(result["image"])
        except (KeyError, ValueError) as error:
            raise UnavailableError("No picture in the answer") from error

    def edit_image(self, image: bytes, prompt_en: str) -> bytes:
        return self._draw(prompt_en, image)

    def generate_image(self, prompt_en: str) -> bytes:
        return self._draw(prompt_en, None)
