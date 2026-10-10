import io
import wave
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from config.testing import ApiTestCase

from . import recognizer
from .commands import grammar, match_command, match_intensity, normalize
from .vocabulary import (
    ADJUSTABLE,
    CHOICE_PHRASES,
    COMMAND_IDS,
    ENTRIES,
    GROUP_OF,
    GROUPS,
    LANGUAGES,
    PHRASES,
)


def wav_file(channels: int = 1) -> SimpleUploadedFile:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"\x00\x00" * 1600 * channels)
    return SimpleUploadedFile("speech.wav", buffer.getvalue(), content_type="audio/wav")


class VocabularyTests(SimpleTestCase):
    """shared/commands.json is the one source of truth; these checks keep it complete."""

    def test_every_command_is_complete_in_every_language(self):
        self.assertGreaterEqual(len(COMMAND_IDS), 24)
        for command in COMMAND_IDS:
            self.assertIn(GROUP_OF[command], GROUPS)
            for lang in LANGUAGES:
                entry = ENTRIES[command][lang]
                self.assertTrue(entry["label"] and entry["effect"], (command, lang))
                self.assertTrue(3 <= len(entry["say"]) <= 5, (command, lang))

    def test_no_phrase_belongs_to_two_commands(self):
        for vocabulary in (PHRASES, CHOICE_PHRASES):
            for lang, commands in vocabulary.items():
                seen = {}
                for command, phrases in commands.items():
                    for phrase in phrases:
                        key = normalize(phrase)
                        self.assertNotIn(key, seen, f"{lang}: {phrase!r} in {command}")
                        seen[key] = command

    def test_every_phrase_is_understood_as_its_own_command(self):
        for vocabulary, phrases in (("commands", PHRASES), ("choice", CHOICE_PHRASES)):
            for lang, commands in phrases.items():
                for command, options in commands.items():
                    for phrase in options:
                        self.assertEqual(match_command(phrase, lang, vocabulary), command, phrase)


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
        self.assertEqual(match_command("фонды алып таста", "kk"), "remove_background")

    def test_part_of_a_phrase_is_enough_when_it_is_unambiguous(self):
        # Vosk sometimes drops the last word: "жарқын қыл" arrives as "жарқын".
        self.assertEqual(match_command("жарқын", "kk"), "brighten")
        self.assertEqual(match_command("сәл жарқын", "kk"), "brighten")
        # "make it" belongs to many commands, so it alone means nothing.
        self.assertIsNone(match_command("make it", "en"))

    def test_intensity_words(self):
        self.assertEqual(match_intensity("сәл жарық қыл", "kk"), "little")
        self.assertEqual(match_intensity("чуть светлее", "ru"), "little")
        self.assertEqual(match_intensity("much brighter", "en"), "lot")
        self.assertIsNone(match_intensity("brighter", "en"))
        self.assertEqual(match_command("өте қараңғы қыл", "kk"), "darken")

    def test_grammar_contains_intensity_variants_and_unknown_token(self):
        phrases = grammar("kk")
        self.assertEqual(phrases[-1], "[unk]")
        self.assertIn("сәл жарық қыл", phrases)
        self.assertIn("brighten", ADJUSTABLE)
        self.assertNotIn("сәл бұр", phrases)  # rotating has no strength

    def test_choice_vocabulary(self):
        self.assertEqual(match_command("қалдыр", "kk", "choice"), "keep")
        self.assertEqual(match_command("не надо", "ru", "choice"), "discard")
        self.assertIn("keep it", grammar("en", "choice"))


class RecognizeApiTests(ApiTestCase):
    url = "/api/speech/recognize/"

    def setUp(self):
        self.login_as("aru")

    @mock.patch("speech.recognizer.recognize", return_value="ақ қара")
    def test_returns_text_and_command(self, fake_recognize):
        response = self.client.post(self.url, {"audio": wav_file(), "lang": "kk"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), {"text": "ақ қара", "command": "grayscale", "intensity": None}
        )
        fake_recognize.assert_called_once()

    @mock.patch("speech.recognizer.recognize", return_value="")
    def test_unknown_speech_gives_no_command(self, _):
        response = self.client.post(self.url, {"audio": wav_file(), "lang": "en"})
        self.assertEqual(response.json(), {"text": "", "command": None, "intensity": None})

    @mock.patch("speech.recognizer.recognize", return_value="сәл жарық қыл")
    def test_reports_intensity(self, _):
        response = self.client.post(self.url, {"audio": wav_file(), "lang": "kk"})
        self.assertEqual(response.json()["intensity"], "little")

    @mock.patch("speech.recognizer.recognize", return_value="оставь")
    def test_choice_vocabulary(self, fake_recognize):
        data = {"audio": wav_file(), "lang": "ru", "vocabulary": "choice"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.json()["command"], "keep")
        self.assertEqual(fake_recognize.call_args.args[2], "choice")

    def test_rejects_unknown_vocabulary(self):
        data = {"audio": wav_file(), "lang": "kk", "vocabulary": "everything"}
        self.assertEqual(self.client.post(self.url, data).status_code, 400)

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
