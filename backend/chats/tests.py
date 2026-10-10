import random

from django.test import SimpleTestCase

from config.testing import ApiTestCase

from .assistant import LESSON_STEPS, LessonState, reply
from .assistant_texts import LABELS, TEXTS


class AssistantTests(SimpleTestCase):
    def setUp(self):
        self.rng = random.Random(1)

    def test_correct_command_praises_and_gives_next_task(self):
        answer = reply("brighten", LessonState(), "kk", rng=self.rng)
        self.assertEqual([m.kind for m in answer.messages], ["praise", "task"])
        self.assertEqual(answer.messages[1].command, "darken")
        self.assertEqual(answer.state, LessonState(step=1))

    def test_other_command_works_and_repeats_task(self):
        answer = reply("rotate", LessonState(step=0), "ru", rng=self.rng)
        self.assertEqual([m.kind for m in answer.messages], ["text", "task"])
        self.assertEqual(answer.messages[1].command, "brighten")
        self.assertEqual(answer.state, LessonState(step=0))

    def test_not_understood_says_what_was_heard(self):
        answer = reply(None, LessonState(), "en", heard="banana", rng=self.rng)
        self.assertEqual(answer.messages[0].kind, "retry")
        self.assertIn("banana", answer.messages[0].text)
        self.assertIn("Brighten", answer.messages[0].text)

    def test_full_lesson_then_free_mode(self):
        state = LessonState()
        for command in LESSON_STEPS:
            state = reply(command, state, "kk", rng=self.rng).state
        self.assertTrue(state.finished)

        free = reply("darken", state, "kk", rng=self.rng)
        self.assertEqual([m.kind for m in free.messages], ["text"])
        self.assertEqual(free.state, state)

    def test_every_language_has_every_text(self):
        for lang in ("kk", "ru", "en"):
            self.assertEqual(set(LABELS[lang]), set(LESSON_STEPS))
            self.assertEqual(set(TEXTS[lang]["effects"]), set(LESSON_STEPS))
            self.assertEqual(TEXTS[lang].keys(), TEXTS["kk"].keys())


class ChatApiTests(ApiTestCase):
    def setUp(self):
        self.login_as("aru")
        self.photo = self.client.get("/api/photos/").json()[0]["id"]
        self.url = f"/api/photos/{self.photo}/messages/"

    def say(self, command, text="", lang="kk"):
        return self.client.post(
            self.url, {"command": command, "text": text, "lang": lang}, format="json"
        )

    def test_first_request_creates_chat_and_advances_lesson(self):
        response = self.say("brighten", "жарық қыл")
        self.assertEqual(response.status_code, 201, response.content)
        roles = [m["role"] for m in response.json()["messages"]]
        self.assertEqual(roles, ["child", "assistant", "assistant"])
        self.assertEqual(response.json()["progress"], {"current_step": 1, "finished": False})

        history = self.client.get(self.url).json()
        self.assertEqual(len(history), 3)
        self.assertTrue(self.client.get(f"/api/photos/{self.photo}/").json()["has_chat"])

    def test_progress_endpoint(self):
        self.say("brighten")
        progress = self.client.get(f"/api/photos/{self.photo}/progress/").json()
        self.assertEqual(progress["current_step"], 1)

    def test_rejects_unknown_command(self):
        self.assertEqual(self.say("explode").status_code, 400)


class ChatIsolationTests(ApiTestCase):
    """One child must never read or write another child's chat."""

    def setUp(self):
        self.login_as("aru")
        photo = self.client.get("/api/photos/").json()[0]["id"]
        self.url = f"/api/photos/{photo}/"
        self.client.post(
            f"{self.url}messages/", {"command": "brighten", "text": "", "lang": "kk"}, format="json"
        )
        self.login_as("bolat")

    def test_cannot_read_foreign_chat_or_progress(self):
        self.assertEqual(self.client.get(f"{self.url}messages/").status_code, 404)
        self.assertEqual(self.client.get(f"{self.url}progress/").status_code, 404)

    def test_cannot_write_into_foreign_chat(self):
        response = self.client.post(
            f"{self.url}messages/", {"command": "darken", "text": "", "lang": "kk"}, format="json"
        )
        self.assertEqual(response.status_code, 404)
