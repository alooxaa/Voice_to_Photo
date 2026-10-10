"""Google Gemini API: free text model for understanding requests and for speech.

The key comes from Google AI Studio (aistudio.google.com) and needs no bank
card. Gemini's image models are not on the free tier, so this provider does
not draw pictures; Cloudflare does (see cloudflare.py).
"""

import base64

from . import http, prompts
from .base import AIProvider, RefusedError, UnavailableError, Understanding

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# The strictest setting for every category the API lets us configure.
SAFETY_SETTINGS = [
    {"category": category, "threshold": "BLOCK_LOW_AND_ABOVE"}
    for category in (
        "HARM_CATEGORY_HARASSMENT",
        "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "HARM_CATEGORY_DANGEROUS_CONTENT",
    )
]

TRANSCRIBE_INSTRUCTION = (
    "Write down exactly what the child says in this recording, in {language}, "
    "using the {language} alphabet. Answer with the words only. "
    "If nothing is said, answer with nothing."
)


def openapi_schema(schema: dict) -> dict:
    """Gemini's responseSchema spells types in capitals ("OBJECT", "STRING")."""
    result = {**schema, "type": schema["type"].upper()}
    if "properties" in schema:
        result["properties"] = {
            name: openapi_schema(value) for name, value in schema["properties"].items()
        }
    return result


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def _generate(self, body: dict) -> str:
        data = http.post(
            API_URL.format(model=self.model),
            headers={"x-goog-api-key": self.api_key},
            json={**body, "safetySettings": SAFETY_SETTINGS},
        )
        if data.get("promptFeedback", {}).get("blockReason"):
            raise RefusedError(data["promptFeedback"]["blockReason"])
        candidates = data.get("candidates") or []
        if not candidates:
            raise UnavailableError("No answer")
        if candidates[0].get("finishReason") in {"SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"}:
            raise RefusedError(candidates[0]["finishReason"])
        parts = candidates[0].get("content", {}).get("parts", [])
        return "".join(part.get("text", "") for part in parts).strip()

    def transcribe(self, wav: bytes, lang: str) -> str:
        language = prompts.LANGUAGE_NAMES[lang]
        return self._generate(
            {
                "contents": [
                    {
                        "parts": [
                            {"text": TRANSCRIBE_INSTRUCTION.format(language=language)},
                            {
                                "inline_data": {
                                    "mime_type": "audio/wav",
                                    "data": base64.b64encode(wav).decode("ascii"),
                                }
                            },
                        ]
                    }
                ],
                "generationConfig": {"temperature": 0, "maxOutputTokens": 200},
            }
        )

    def understand_request(self, transcript: str, lang: str, has_photo: bool) -> Understanding:
        raw = self._generate(
            {
                "systemInstruction": {"parts": [{"text": prompts.system_instruction(lang)}]},
                "contents": [{"parts": [{"text": prompts.user_message(transcript, has_photo)}]}],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 400,
                    "responseMimeType": "application/json",
                    "responseSchema": openapi_schema(prompts.RESPONSE_SCHEMA),
                },
            }
        )
        return prompts.parse_understanding(raw)
