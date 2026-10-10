import io

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from config.testing import ApiTestCase


def png_file(name: str = "cat.png") -> SimpleUploadedFile:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), (200, 100, 50)).save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class PhotoTests(ApiTestCase):
    def setUp(self):
        self.login_as("aru")

    def test_upload_uses_file_name_as_title(self):
        response = self.client.post("/api/photos/", {"original": png_file("my cat.png")})
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["title"], "my cat")
        self.assertEqual(len(self.client.get("/api/photos/").json()), 4)

    def test_rejects_files_that_are_not_images(self):
        fake = SimpleUploadedFile("notes.png", b"not an image", content_type="image/png")
        response = self.client.post("/api/photos/", {"original": fake})
        self.assertEqual(response.status_code, 400)

    def test_save_edited_version(self):
        photo_id = self.client.get("/api/photos/").json()[0]["id"]
        response = self.client.post(f"/api/photos/{photo_id}/save/", {"image": png_file()})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()["edited_url"].endswith(".png"))

    def test_sample_photos_have_translation_keys(self):
        photos = self.client.get("/api/photos/").json()
        self.assertEqual({photo["title_key"] for photo in photos}, {"mountains", "sea", "city"})
        uploaded = self.client.post("/api/photos/", {"original": png_file("my cat.png")}).json()
        self.assertEqual(uploaded["title_key"], "")

    def test_delete(self):
        photo_id = self.client.get("/api/photos/").json()[0]["id"]
        self.assertEqual(self.client.delete(f"/api/photos/{photo_id}/").status_code, 204)
        self.assertEqual(self.client.get(f"/api/photos/{photo_id}/").status_code, 404)


class PhotoIsolationTests(ApiTestCase):
    """One child must never see or change another child's photos."""

    def setUp(self):
        self.login_as("aru")
        self.aru_photo = self.client.get("/api/photos/").json()[0]["id"]
        self.login_as("bolat")

    def test_list_shows_only_own_photos(self):
        ids = {photo["id"] for photo in self.client.get("/api/photos/").json()}
        self.assertEqual(len(ids), 3)
        self.assertNotIn(self.aru_photo, ids)

    def test_cannot_read_change_or_delete_foreign_photo(self):
        url = f"/api/photos/{self.aru_photo}/"
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.post(f"{url}save/", {"image": png_file()}).status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)

    def test_requires_login(self):
        self.client.credentials()
        self.assertEqual(self.client.get("/api/photos/").status_code, 401)
