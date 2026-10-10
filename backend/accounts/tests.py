from config.testing import ApiTestCase


class RegistrationTests(ApiTestCase):
    def test_register_returns_tokens_profile_and_sample_photos(self):
        data = self.register("aru", language="ru")

        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertEqual(data["profile"]["display_name"], "Aru")
        self.assertEqual(data["profile"]["language"], "ru")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {data['access']}")
        titles = {photo["title"] for photo in self.client.get("/api/photos/").json()}
        self.assertEqual(titles, {"Горы", "Море", "Город"})

    def test_passwords_must_match(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "display_name": "Aru",
                "username": "aru",
                "password": "secret123",
                "password_repeat": "secret999",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("password_repeat", response.json())

    def test_username_must_be_unique(self):
        self.register("aru")
        response = self.client.post(
            "/api/auth/register/",
            {
                "display_name": "Other",
                "username": "ARU",
                "password": "secret123",
                "password_repeat": "secret123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["username"], ["username_taken"])


class LoginAndProfileTests(ApiTestCase):
    def test_login_refresh_and_me(self):
        self.register("aru")

        login = self.client.post(
            "/api/auth/login/", {"username": "aru", "password": "secret123"}, format="json"
        )
        self.assertEqual(login.status_code, 200)

        refresh = self.client.post(
            "/api/auth/refresh/", {"refresh": login.json()["refresh"]}, format="json"
        )
        self.assertEqual(refresh.status_code, 200)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.json()['access']}")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.json()["username"], "aru")

    def test_wrong_password_is_rejected(self):
        self.register("aru")
        response = self.client.post(
            "/api/auth/login/", {"username": "aru", "password": "wrong-one"}, format="json"
        )
        self.assertEqual(response.status_code, 401)

    def test_profile_can_be_updated(self):
        self.login_as("aru")
        response = self.client.patch(
            "/api/auth/me/",
            {"display_name": "Арухан", "language": "en", "avatar_color": "sun"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["language"], "en")
        self.assertEqual(response.json()["avatar_color"], "sun")

    def test_profile_requires_login(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
