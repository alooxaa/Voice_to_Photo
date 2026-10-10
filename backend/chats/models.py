from django.conf import settings
from django.db import models

from photos.models import Photo


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        CHILD = "child", "Child"
        ASSISTANT = "assistant", "Assistant"

    class Kind(models.TextChoices):
        TEXT = "text", "Text"
        TASK = "task", "Task"
        PRAISE = "praise", "Praise"
        RETRY = "retry", "Retry"

    photo = models.ForeignKey(Photo, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=Role.choices)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.TEXT)
    text = models.CharField(max_length=300)
    # null = the child said something that is not a command (the spec asks for a nullable id).
    command = models.CharField(max_length=20, null=True, blank=True)  # noqa: DJ001
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created", "id"]

    def __str__(self) -> str:
        return f"{self.role}: {self.text}"


class LessonProgress(models.Model):
    """Where the child is in the six-step lesson for one photo."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    photo = models.OneToOneField(Photo, on_delete=models.CASCADE, related_name="progress")
    current_step = models.PositiveSmallIntegerField(default=0)
    finished = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"{self.photo}: step {self.current_step}"
