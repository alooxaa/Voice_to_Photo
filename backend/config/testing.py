"""Shared helpers for the test suites of all apps."""

import shutil
import tempfile

from django.test import override_settings
from rest_framework.test import APITestCase


class ApiTestCase(APITestCase):
    """Writes uploaded files to a temporary folder and offers a quick sign-up."""

    @classmethod
    def setUpClass(cls):
        cls._media = tempfile.mkdtemp()
        cls._media_override = override_settings(MEDIA_ROOT=cls._media)
        cls._media_override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls._media_override.disable()
        shutil.rmtree(cls._media, ignore_errors=True)

    def register(self, username: str, language: str = "kk") -> dict:
        response = self.client.post(
            "/api/auth/register/",
            {
                "display_name": username.title(),
                "username": username,
                "password": "secret123",
                "password_repeat": "secret123",
                "language": language,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def login_as(self, username: str) -> None:
        """Register `username` and send its access token with every request."""
        tokens = self.register(username)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
