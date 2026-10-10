import io
import json
import wave
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from config.testing import ApiTestCase

from . import recognizer
from .commands import grammar, match_command, normalize
from .phrases import PHRASES

FRONTEND_I18N = Path(settings.BASE_DIR).parent / "frontend" / "src" / "shared" / "i18n"


def wav_file(channels: int = 1) -> SimpleUploadedFile:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"\x00\x00" * 1600 * channels)
    return SimpleUploadedFile("speech.wav", buffer.getvalue(), content_type="audio/wav")


class CommandMatchingTests(SimpleTestCase):
    def test_normalize(self):
        self.assertEqual(normalize("  Чёрно-Белое! "), "черно белое")

    def test_matches_each_language(self):
        self.assertEqual(match_command("жарық қыл", "kk"), "brighten")
        self.assertEqual(match_command("ну сделай темнее", "ru"), "darken")
        self.assertEqual(match_command("Black and white", "en"), "grayscale")
        self.assertIsNone(match_command("hello", "en"))
        self.assertIsNone(match_command("", "kk"))

    def test_longest_phrase_wins(self):
        self.assertEqual(match_command("сделай черно белым", "ru"), "grayscale")

    def test_grammar_contains_unknown_token(self):
        self.assertEqual(grammar("en")[-1], "[unk]")
        self.assertIn("make it darker", grammar("en"))

    def test_phrases_match_frontend_translations(self):
        """Voice phrases must be identical in backend and frontend."""
        for lang, phrases in PHRASES.items():
            data = json.loads((FRONTEND_I18N / f"{lang}.json").read_text(encoding="utf-8"))
            frontend = {cid: entry["say"] for cid, entry in data["commands"].items()}
            self.assertEqual(frontend, phrases, f"phrases differ for {lang}")


class RecognizeApiTests(ApiTestCase):
    url = "/api/speech/recognize/"

    def setUp(self):
        self.login_as("aru")

    @mock.patch("speech.recognizer.recognize", return_value="ақ қара")
    def test_returns_text_and_command(self, fake_recognize):
        response = self.client.post(self.url, {"audio": wav_file(), "lang": "kk"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"text": "ақ қара", "command": "grayscale"})
        fake_recognize.assert_called_once()

    @mock.patch("speech.recognizer.recognize", return_value="")
    def test_unknown_speech_gives_no_command(self, _):
        response = self.client.post(self.url, {"audio": wav_file(), "lang": "en"})
        self.assertEqual(response.json(), {"text": "", "command": None})

    def test_rejects_bad_language(self):
        response = self.client.post(self.url, {"audio": wav_file(), "lang": "de"})
        self.assertEqual(response.status_code, 400)

    def test_rejects_stereo_audio(self):
        with mock.patch("speech.recognizer.get_model"):
            response = self.client.post(self.url, {"audio": wav_file(channels=2), "lang": "kk"})
        self.assertEqual(response.json(), {"error": "bad_audio"})

    @mock.patch("speech.recognizer.get_model", side_effect=recognizer.ModelMissingError("x"))
    def test_reports_missing_model(self, _):
        response = self.client.post(self.url, {"audio": wav_file(), "lang": "ru"})
        self.assertEqual(response.status_code, 503)

    def test_requires_login(self):
        self.client.credentials()
        response = self.client.post(self.url, {"audio": wav_file(), "lang": "kk"})
        self.assertEqual(response.status_code, 401)
