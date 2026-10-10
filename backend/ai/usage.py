"""A daily counter per user, so one class demo cannot use up the free quota."""

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import AIUsage
from .providers.base import LimitReachedError


def _today():
    return timezone.localdate()


def used_today(user) -> int:
    row = AIUsage.objects.filter(user=user, day=_today()).first()
    return row.count if row else 0


def remaining_today(user) -> int:
    return max(0, settings.AI_DAILY_LIMIT - used_today(user))


@transaction.atomic
def take_one(user) -> None:
    """Count one AI request, or raise LimitReachedError when today's limit is reached."""
    row, _ = AIUsage.objects.select_for_update().get_or_create(user=user, day=_today())
    if row.count >= settings.AI_DAILY_LIMIT:
        raise LimitReachedError("daily limit")
    AIUsage.objects.filter(pk=row.pk).update(count=F("count") + 1)


def give_back(user) -> None:
    """Undo `take_one` when the service could not be reached, so nothing was spent."""
    AIUsage.objects.filter(user=user, day=_today(), count__gt=0).update(count=F("count") - 1)
