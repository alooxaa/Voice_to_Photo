from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from photos.samples import create_sample_photos


class Command(BaseCommand):
    help = "Give the three sample photos to every user who has no photos yet."

    def handle(self, *args, **options):
        users = get_user_model().objects.filter(photos__isnull=True).select_related("profile")
        count = 0
        for user in users:
            language = user.profile.language if hasattr(user, "profile") else "kk"
            create_sample_photos(user, language)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Sample photos given to {count} user(s)."))
