from django.conf import settings
from django.db import models


class Language(models.TextChoices):
    KAZAKH = "kk", "Қазақша"
    RUSSIAN = "ru", "Русский"
    ENGLISH = "en", "English"


class AvatarColor(models.TextChoices):
    # Only colours from the design palette are allowed.
    BLUE = "blue", "Blue"
    SUN = "sun", "Sun"
    INK = "ink", "Ink"


class Profile(models.Model):
    """Extra data for Django's built-in User."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=40)
    language = models.CharField(max_length=2, choices=Language.choices, default=Language.KAZAKH)
    avatar_color = models.CharField(
        max_length=8, choices=AvatarColor.choices, default=AvatarColor.BLUE
    )

    def __str__(self) -> str:
        return self.display_name
