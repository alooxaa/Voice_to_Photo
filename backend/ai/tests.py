import io
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from config.testing import ApiTestCase

from . import background


def png_file() -> SimpleUploadedFile:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), (200, 100, 50)).save(buffer, format="PNG")
    return SimpleUploadedFile("photo.png", buffer.getvalue(), content_type="image/png")


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
