import random

from django.test import SimpleTestCase

from config.testing import ApiTestCase

from .assistant import LESSON_STEPS, LessonState, reply


class AssistantTests(SimpleTestCase):
    def setUp(self):
        self.rng = random.Random(1)

    def test_correct_command_praises_and_gives_next_task(self):
        answer = reply("brighten", LessonState(), rng=self.rng)
        self.assertEqual([m.key for m in answer.messages], ["praise", "task"])
        self.assertEqual(answer.messages[1].command, "darken")
        self.assertEqual(answer.messages[1].params, {"step": 1})
        self.assertEqual(answer.state, LessonState(step=1))

    def test_other_command_works_and_repeats_task(self):
        answer = reply("rotate", LessonState(step=0), rng=self.rng)
        self.assertEqual([m.key for m in answer.messages], ["other_command", "task"])
        self.assertEqual(answer.messages[1].command, "brighten")
        self.assertEqual(answer.state, LessonState(step=0))

    def test_not_understood_says_what_was_heard_and_what_to_say(self):
        answer = reply(None, LessonState(), heard="banana", rng=self.rng)
        message = answer.messages[0]
        self.assertEqual((message.kind, message.key), ("retry", "retry_heard"))
        self.assertEqual(message.params, {"heard": "banana", "expected": "brighten"})

    def test_missed_speech_gets_its_own_reply(self):
        answer = reply(None, LessonState(step=2), heard="", rng=self.rng)
        self.assertEqual(answer.messages[0].key, "retry_unclear")
        self.assertEqual(answer.messages[0].params["expected"], "grayscale")

    def test_full_lesson_then_free_mode(self):
        state = LessonState()
        for command in LESSON_STEPS:
            answer = reply(command, state, rng=self.rng)
            state = answer.state
        self.assertTrue(state.finished)
        # The last answer announces free mode once, as an ordinary message.
        self.assertEqual(answer.messages[-1].key, "finished")

        free = reply("darken", state, rng=self.rng)
        self.assertEqual([m.key for m in free.messages], ["effect"])
        self.assertEqual(free.state, state)

    def test_free_mode_suggests_examples_instead_of_a_lesson_task(self):
        state = LessonState(step=len(LESSON_STEPS), finished=True)
        for heard in ("banana", ""):
            message = reply(None, state, heard=heard, rng=self.rng).messages[0]
            self.assertTrue(message.key.startswith("free_retry"))
            self.assertNotIn("expected", message.params)
            self.assertEqual(len(message.params["examples"]), 3)


class ChatApiTests(ApiTestCase):
    def setUp(self):
        self.login_as("aru")
        self.photo = self.client.get("/api/photos/").json()[0]["id"]
        self.url = f"/api/photos/{self.photo}/messages/"

    def say(self, command, text=""):
        return self.client.post(self.url, {"command": command, "text": text}, format="json")

    def test_first_request_creates_chat_and_advances_lesson(self):
        response = self.say("brighten", "жарық қыл")
        self.assertEqual(response.status_code, 201, response.content)
        roles = [m["role"] for m in response.json()["messages"]]
        self.assertEqual(roles, ["child", "assistant", "assistant"])
        self.assertEqual(response.json()["progress"], {"current_step": 1, "finished": False})

        history = self.client.get(self.url).json()
        self.assertEqual(len(history), 3)
        # The child's words are kept; replies are stored as templates, not as text.
        self.assertEqual(history[0]["text"], "жарық қыл")
        self.assertEqual(history[1]["key"], "praise")
        self.assertEqual(history[1]["text"], "")
        self.assertTrue(self.client.get(f"/api/photos/{self.photo}/").json()["has_chat"])

    def test_tile_press_is_marked_so_its_label_can_be_translated(self):
        response = self.client.post(
            self.url, {"command": "rotate", "text": "", "source": "tile"}, format="json"
        )
        child = response.json()["messages"][0]
        self.assertEqual((child["key"], child["command"]), ("tile", "rotate"))

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
        self.client.post(f"{self.url}messages/", {"command": "brighten", "text": ""}, format="json")
        self.login_as("bolat")

    def test_cannot_read_foreign_chat_or_progress(self):
        self.assertEqual(self.client.get(f"{self.url}messages/").status_code, 404)
        self.assertEqual(self.client.get(f"{self.url}progress/").status_code, 404)

    def test_cannot_write_into_foreign_chat(self):
        response = self.client.post(
            f"{self.url}messages/", {"command": "darken", "text": ""}, format="json"
        )
        self.assertEqual(response.status_code, 404)
