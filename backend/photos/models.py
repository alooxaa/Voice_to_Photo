from django.conf import settings
from django.db import models


def original_path(photo: "Photo", filename: str) -> str:
    return f"photos/{photo.owner_id}/original/{filename}"


def edited_path(photo: "Photo", filename: str) -> str:
    return f"photos/{photo.owner_id}/edited/{filename}"


class Photo(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="photos"
    )
    title = models.CharField(max_length=60)
    original = models.ImageField(upload_to=original_path)
    # The newest saved result of editing; empty until the child saves once.
    edited = models.ImageField(upload_to=edited_path, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated"]

    def __str__(self) -> str:
        return self.title
