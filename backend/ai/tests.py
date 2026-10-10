import base64
import io
import json
from unittest import mock

import requests
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from PIL import Image

from config.testing import ApiTestCase
from speech.tests import wav_file

from . import background
from .ideas import IDEAS
from .providers import cloudflare, image_provider, prompts, text_provider
from .providers.base import (
    AIProvider,
    LimitReachedError,
    NotConfiguredError,
    RefusedError,
    UnavailableError,
    Understanding,
)
from .providers.gemini import GeminiProvider


def png_bytes(size=(8, 8)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, (200, 100, 50)).save(buffer, format="PNG")
    return buffer.getvalue()


def png_file(size=(8, 8)) -> SimpleUploadedFile:
    return SimpleUploadedFile("photo.png", png_bytes(size), content_type="image/png")


class FakeProvider(AIProvider):
    """Stands in for both providers; tests set what it answers."""

    name = "fake"

    def __init__(self, understanding=None, transcript="аспанға кемпірқосақ қос", error=None):
        self.understanding = understanding or Understanding(
            intent="edit", reply="Кемпірқосақ қосамын!", prompt_en="add a rainbow", edit_kind="add"
        )
        self.transcript = transcript
        self.error = error
        self.calls = []

    def transcribe(self, wav, lang):
        self.calls.append("transcribe")
        return self.transcript

    def understand_request(self, transcript, lang, has_photo):
        self.calls.append("understand")
        return self.understanding

    def edit_image(self, image, prompt_en):
        self.calls.append("edit")
        if self.error:
            raise self.error
        return png_bytes((16, 12))

    def generate_image(self, prompt_en):
        self.calls.append("generate")
        if self.error:
            raise self.error
        return png_bytes((16, 12))


def use_provider(provider):
    """Patch both provider roles with the same fake."""
    return mock.patch.multiple(
        "ai.services", text_provider=lambda: provider, image_provider=lambda: provider
    )


class PromptTests(SimpleTestCase):
    def test_parses_a_valid_answer(self):
        raw = json.dumps(
            {"intent": "edit", "prompt_en": "add snow", "edit_kind": "add", "reply": "Жарайды!"}
        )
        understanding = prompts.parse_understanding(raw)
        self.assertEqual((understanding.intent, understanding.prompt_en), ("edit", "add snow"))

    def test_odd_answers_become_unclear(self):
        for raw in ("not json", '{"intent": "explode", "reply": "x"}', '{"intent": "edit"}'):
            self.assertEqual(prompts.parse_understanding(raw).intent, "unclear", raw)

    def test_local_command_must_exist(self):
        good = prompts.parse_understanding('{"intent": "local_command", "command": "blur"}')
        bad = prompts.parse_understanding('{"intent": "local_command", "command": "explode"}')
        self.assertEqual(good.command, "blur")
        self.assertEqual(bad.intent, "unclear")

    def test_reply_is_at_most_two_short_sentences(self):
        reply = prompts.short_reply("Бір. Екі! Үш? Төрт.")
        self.assertEqual(reply, "Бір. Екі!")
        self.assertLessEqual(len(prompts.short_reply("сөз " * 200)), prompts.MAX_REPLY_CHARACTERS)

    def test_instruction_names_the_language_and_the_child(self):
        text = prompts.system_instruction("kk")
        self.assertIn("Kazakh", text)
        self.assertIn("child", text)


class IdeaTests(SimpleTestCase):
    def test_every_idea_has_words_in_every_language(self):
        i18n = settings.BASE_DIR.parent / "frontend" / "src" / "shared" / "i18n"
        for lang in ("kk", "ru", "en"):
            texts = json.loads((i18n / f"{lang}.json").read_text(encoding="utf-8"))
            self.assertEqual(set(texts["ai"]["ideas"]), set(IDEAS), lang)


class ProviderChoiceTests(SimpleTestCase):
    @override_settings(GEMINI_API_KEY="", CLOUDFLARE_ACCOUNT_ID="", CLOUDFLARE_API_TOKEN="")
    def test_nothing_without_keys(self):
        self.assertIsNone(text_provider())
        self.assertIsNone(image_provider())

    @override_settings(
        GEMINI_API_KEY="g", CLOUDFLARE_ACCOUNT_ID="a", CLOUDFLARE_API_TOKEN="t", AI_TEXT_PROVIDER=""
    )
    def test_gemini_understands_and_cloudflare_draws(self):
        self.assertEqual(text_provider().name, "gemini")
        self.assertEqual(image_provider().name, "cloudflare")

    @override_settings(GEMINI_API_KEY="", CLOUDFLARE_ACCOUNT_ID="a", CLOUDFLARE_API_TOKEN="t")
    def test_cloudflare_alone_does_everything(self):
        self.assertEqual(text_provider().name, "cloudflare")


def fake_response(status=200, body=None):
    response = mock.Mock(status_code=status, text=json.dumps(body or {}))
    response.json.return_value = body or {}
    return response


class GeminiTests(SimpleTestCase):
    def setUp(self):
        self.gemini = GeminiProvider("key", "gemini-test")

    @mock.patch("ai.providers.http.requests.post")
    def test_understands_with_strict_safety_settings(self, post):
        answer = {"intent": "generate", "prompt_en": "a cat in space", "reply": "Салайын!"}
        post.return_value = fake_response(
            body={"candidates": [{"content": {"parts": [{"text": json.dumps(answer)}]}}]}
        )
        understanding = self.gemini.understand_request("мысық сал", "kk", has_photo=True)
        self.assertEqual(understanding.intent, "generate")
        body = post.call_args.kwargs["json"]
        self.assertTrue(
            all(s["threshold"] == "BLOCK_LOW_AND_ABOVE" for s in body["safetySettings"])
        )
        self.assertEqual(body["generationConfig"]["responseSchema"]["type"], "OBJECT")
        self.assertEqual(post.call_args.kwargs["headers"], {"x-goog-api-key": "key"})

    @mock.patch("ai.providers.http.requests.post")
    def test_safety_block_is_a_refusal(self, post):
        post.return_value = fake_response(body={"promptFeedback": {"blockReason": "SAFETY"}})
        with self.assertRaises(RefusedError):
            self.gemini.understand_request("...", "kk", has_photo=True)

    @mock.patch("ai.providers.http.requests.post")
    def test_http_problems_have_their_own_errors(self, post):
        cases = [
            (fake_response(429), LimitReachedError),
            (fake_response(403), NotConfiguredError),
            (fake_response(500), UnavailableError),
        ]
        for response, error in cases:
            post.return_value = response
            with self.assertRaises(error):
                self.gemini.transcribe(b"wav", "ru")
        post.side_effect = requests.ConnectionError("offline")
        with self.assertRaises(UnavailableError):
            self.gemini.transcribe(b"wav", "ru")


class CloudflareTests(SimpleTestCase):
    def setUp(self):
        self.cloudflare = cloudflare.CloudflareProvider("acct", "token", "img", "txt", "stt")

    def test_input_image_is_smaller_than_512(self):
        with Image.open(io.BytesIO(cloudflare.input_png(png_bytes((1200, 800))))) as image:
            self.assertLessEqual(max(image.size), cloudflare.MAX_INPUT_SIDE)

    def test_output_keeps_proportions(self):
        self.assertEqual(cloudflare.output_size(png_bytes((1200, 800))), (1024, 688))
        self.assertEqual(cloudflare.output_size(None), (1024, 768))

    @mock.patch("ai.providers.http.requests.post")
    def test_edit_sends_the_photo_and_returns_the_picture(self, post):
        picture = png_bytes((4, 4))
        post.return_value = fake_response(
            body={"success": True, "result": {"image": base64.b64encode(picture).decode()}}
        )
        self.assertEqual(self.cloudflare.edit_image(png_bytes(), "add a rainbow"), picture)
        files = post.call_args.kwargs["files"]
        self.assertIn("input_image_0", files)
        self.assertIn("young children", files["prompt"][1])
        self.assertTrue(post.call_args.args[0].endswith("/accounts/acct/ai/run/img"))

    @mock.patch("ai.providers.http.requests.post")
    def test_nsfw_answer_is_a_refusal(self, post):
        post.return_value = fake_response(400, {"errors": [{"message": "NSFW content"}]})
        with self.assertRaises(RefusedError):
            self.cloudflare.generate_image("something")


class RemoveBackgroundTests(ApiTestCase):
    url = "/api/ai/remove-background/"

    def setUp(self):
        self.login_as("aru")

    @mock.patch("ai.background.remove_background", return_value=b"\x89PNG result")
    def test_returns_png(self, fake_remove):
        response = self.client.post(self.url, {"image": png_file()})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertEqual(response.content, b"\x89PNG result")
        fake_remove.assert_called_once()

    def test_requires_an_image(self):
        self.assertEqual(self.client.post(self.url, {}).status_code, 400)

    @mock.patch(
        "ai.background.remove_background",
        side_effect=background.BackgroundModelMissingError("x"),
    )
    def test_reports_missing_model(self, _):
        response = self.client.post(self.url, {"image": png_file()})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"error": "model_missing"})

    def test_requires_login(self):
        self.client.credentials()
        self.assertEqual(self.client.post(self.url, {"image": png_file()}).status_code, 401)


@override_settings(AI_DAILY_LIMIT=3, AI_TRANSCRIBE_WITH="provider")
class AIStudioApiTests(ApiTestCase):
    def setUp(self):
        self.login_as("aru")
        self.photo = self.client.get("/api/photos/").json()[0]["id"]
        self.url = f"/api/photos/{self.photo}/ai/"

    def ask(self, **data):
        data.setdefault("lang", "kk")
        data.setdefault("image", png_file())
        return self.client.post(self.url, data)

    def test_status_without_keys(self):
        with mock.patch.multiple(
            "ai.views", text_provider=lambda: None, image_provider=lambda: None
        ):
            body = self.client.get("/api/ai/status/").json()
        self.assertEqual(body, {**body, "ready": False, "remaining": 3})

    def test_not_configured_is_explained(self):
        with use_provider(None):
            response = self.ask(idea="rainbow")
        self.assertEqual(
            (response.status_code, response.json()), (503, {"error": "not_configured"})
        )

    def test_voice_request_makes_a_picture_and_writes_the_chat(self):
        provider = FakeProvider()
        with use_provider(provider):
            response = self.ask(audio=wav_file())
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body["intent"], "edit")
        self.assertEqual(provider.calls, ["transcribe", "understand", "edit"])
        self.assertEqual([m["kind"] for m in body["messages"]], ["text", "text", "result"])
        self.assertEqual(body["messages"][0]["text"], "аспанға кемпірқосақ қос")
        self.assertEqual(body["result"]["decision"], "pending")
        self.assertEqual(body["remaining"], 2)

    def test_idea_tile_skips_speech_and_understanding(self):
        provider = FakeProvider()
        with use_provider(provider):
            body = self.ask(idea="space_cat").json()
        self.assertEqual(provider.calls, ["generate"])
        self.assertEqual(body["messages"][0]["key"], "idea")
        self.assertEqual(body["result"]["kind"], "generate")

    def test_plain_editing_command_is_done_locally(self):
        provider = FakeProvider(transcript="сәл жарық қыл")
        with use_provider(provider):
            body = self.ask(audio=wav_file()).json()
        self.assertEqual((body["intent"], body["command"]), ("local_command", "brighten"))
        self.assertEqual(provider.calls, ["transcribe"])
        self.assertEqual(body["messages"], [])

    def test_unclear_and_refused_requests_get_a_gentle_reply(self):
        for intent in ("unclear", "refused"):
            provider = FakeProvider(Understanding(intent=intent, reply="Басқа идея айтайық."))
            with use_provider(provider):
                body = self.ask(audio=wav_file()).json()
            self.assertIsNone(body["result"])
            self.assertEqual(body["messages"][1]["text"], "Басқа идея айтайық.")

    def test_picture_blocked_by_safety_filter(self):
        with use_provider(FakeProvider(error=RefusedError("nsfw"))):
            body = self.ask(audio=wav_file()).json()
        self.assertEqual(body["messages"][1]["key"], "ai_refused")

    def test_daily_limit(self):
        with use_provider(FakeProvider()):
            for _ in range(3):
                self.assertEqual(self.ask(idea="snow").status_code, 201)
            response = self.ask(idea="snow")
        self.assertEqual((response.status_code, response.json()), (429, {"error": "limit"}))

    def test_failed_service_does_not_count(self):
        with use_provider(FakeProvider(error=UnavailableError("offline"))):
            response = self.ask(idea="snow")
        self.assertEqual(response.status_code, 503)
        with use_provider(FakeProvider()):
            self.assertEqual(self.ask(idea="snow").json()["remaining"], 2)

    def test_rejects_bad_requests(self):
        with use_provider(FakeProvider()):
            self.assertEqual(self.ask().status_code, 400)  # neither audio nor idea
            self.assertEqual(self.ask(idea="dragon").status_code, 400)
            self.assertEqual(self.ask(idea="snow", lang="de").status_code, 400)

    def decide(self, result_id, keep):
        return self.client.post(f"{self.url}results/{result_id}/", {"keep": keep}, format="json")

    def test_keeping_an_edit_moves_the_ai_lesson_on(self):
        with use_provider(FakeProvider()):
            result = self.ask(idea="rainbow").json()["result"]
        body = self.decide(result["id"], True).json()
        self.assertEqual(body["result"]["decision"], "kept")
        self.assertEqual([m["key"] for m in body["messages"]], ["ai_kept", "ai_task"])
        self.assertEqual(body["progress"]["ai_step"], 1)
        self.assertIsNone(body["new_photo"])

    def test_keeping_a_new_picture_saves_it_as_a_photo(self):
        with use_provider(FakeProvider()):
            result = self.ask(idea="space_cat").json()["result"]
        body = self.decide(result["id"], True).json()
        self.assertEqual(body["new_photo"]["title_key"], "space_cat")
        self.assertEqual(len(self.client.get("/api/photos/").json()), 4)

    def test_rejecting_and_deciding_twice(self):
        with use_provider(FakeProvider()):
            result = self.ask(idea="snow").json()["result"]
        body = self.decide(result["id"], False).json()
        self.assertEqual([m["key"] for m in body["messages"]], ["ai_discarded"])
        self.assertEqual(self.decide(result["id"], True).status_code, 409)
        self.assertEqual(self.decide(result["id"], "yes").status_code, 400)


class AIStudioIsolationTests(ApiTestCase):
    """One child must never use another child's photo or AI pictures."""

    def setUp(self):
        self.login_as("aru")
        photo = self.client.get("/api/photos/").json()[0]["id"]
        self.url = f"/api/photos/{photo}/ai/"
        with use_provider(FakeProvider()):
            response = self.client.post(self.url, {"lang": "kk", "idea": "snow"})
        self.result = response.json()["result"]["id"]
        self.login_as("bolat")

    def test_cannot_ask_in_a_foreign_photo(self):
        with use_provider(FakeProvider()):
            response = self.client.post(self.url, {"lang": "kk", "idea": "snow"})
        self.assertEqual(response.status_code, 404)

    def test_cannot_decide_on_a_foreign_picture(self):
        response = self.client.post(
            f"{self.url}results/{self.result}/", {"keep": True}, format="json"
        )
        self.assertEqual(response.status_code, 404)
