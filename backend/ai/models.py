from django.conf import settings
from django.db import models

from photos.models import Photo


def result_path(result: "AIResult", filename: str) -> str:
    return f"ai/{result.owner_id}/{filename}"


class AIResult(models.Model):
    """A picture the AI made: an edit of a photo, or a new picture from an idea.

    It is only a proposal until the child chooses: "keep" applies an edit to
    the photo (as an undoable step) or saves a new picture as a new photo.
    """

    class Kind(models.TextChoices):
        EDIT = "edit", "Edit"
        GENERATE = "generate", "Generate"

    class Decision(models.TextChoices):
        PENDING = "pending", "Pending"
        KEPT = "kept", "Kept"
        DISCARDED = "discarded", "Discarded"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # The photo whose chat the request was made in.
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE, related_name="ai_results")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    # "add", "style", "remove" or "other": used by the AI studio's lesson.
    edit_kind = models.CharField(max_length=10, blank=True)
    # What the child asked for: their words, or the id of a pressed idea tile.
    request = models.CharField(max_length=200, blank=True)
    idea = models.CharField(max_length=20, blank=True)
    prompt_en = models.CharField(max_length=500)
    image = models.ImageField(upload_to=result_path)
    decision = models.CharField(max_length=10, choices=Decision.choices, default=Decision.PENDING)
    # For a kept new picture: the photo it became.
    new_photo = models.ForeignKey(
        Photo, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.kind}: {self.prompt_en}"


class AIUsage(models.Model):
    """How many AI requests a user made on one day: a guard for the free quota."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    day = models.DateField()
    count = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "day"], name="one_usage_row_per_day")
        ]

    def __str__(self) -> str:
        return f"{self.user} {self.day}: {self.count}"
