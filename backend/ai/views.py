from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from chats.serializers import ChatMessageSerializer, LessonProgressSerializer
from chats.views import own_photo, progress_for
from photos.serializers import MAX_IMAGE_BYTES, PhotoSerializer
from speech.views import MAX_AUDIO_BYTES
from speech.vocabulary import LANGUAGES

from . import background, services, usage
from .ideas import IDEAS
from .models import AIResult
from .providers import image_provider, text_provider
from .providers.base import LimitReachedError, NotConfiguredError, UnavailableError

# Each problem becomes a short code; the frontend shows a calm sentence for it.
PROBLEMS = {
    NotConfiguredError: ("not_configured", status.HTTP_503_SERVICE_UNAVAILABLE),
    LimitReachedError: ("limit", status.HTTP_429_TOO_MANY_REQUESTS),
    UnavailableError: ("unavailable", status.HTTP_503_SERVICE_UNAVAILABLE),
}


def problem(error: Exception) -> Response:
    code, http_status = PROBLEMS[type(error)]
    return Response({"error": code}, status=http_status)


class RemoveBackgroundView(APIView):
    """POST an `image`; get back a PNG with the background made transparent."""

    parser_classes = [MultiPartParser]

    def post(self, request):
        image = request.FILES.get("image")
        if image is None or image.size > MAX_IMAGE_BYTES:
            return Response({"error": "bad_image"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            png = background.remove_background(image.read())
        except background.BadImageError:
            return Response({"error": "bad_image"}, status=status.HTTP_400_BAD_REQUEST)
        except background.BackgroundModelMissingError:
            return Response({"error": "model_missing"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return HttpResponse(png, content_type="image/png")


class StatusView(APIView):
    """Is the AI studio connected, and how many requests are left today?"""

    def get(self, request):
        text, image = text_provider(), image_provider()
        return Response(
            {
                "ready": text is not None and image is not None,
                "text_provider": text.name if text else None,
                "image_provider": image.name if image else None,
                "remaining": usage.remaining_today(request.user),
            }
        )


class ResultSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = AIResult
        fields = ["id", "kind", "url", "decision"]

    def get_url(self, result: AIResult) -> str:
        return result.image.url


class AIRequestView(APIView):
    """POST `lang` and either `audio` (a WAV) or `idea`, plus the current picture as `image`."""

    parser_classes = [MultiPartParser]

    def post(self, request, photo_id: int):
        photo = own_photo(request, photo_id)
        lang = request.data.get("lang", "")
        idea = request.data.get("idea") or None
        audio = request.FILES.get("audio")
        image = request.FILES.get("image")
        if lang not in LANGUAGES:
            return Response({"error": "bad_language"}, status=status.HTTP_400_BAD_REQUEST)
        if (idea is None) == (audio is None) or (idea and idea not in IDEAS):
            return Response({"error": "bad_request"}, status=status.HTTP_400_BAD_REQUEST)
        if (audio and audio.size > MAX_AUDIO_BYTES) or (image and image.size > MAX_IMAGE_BYTES):
            return Response({"error": "too_large"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            outcome = services.run_request(
                request.user,
                photo,
                lang,
                audio=audio.read() if audio else None,
                idea=idea,
                image=image.read() if image else None,
            )
        except (NotConfiguredError, LimitReachedError, UnavailableError) as error:
            return problem(error)

        return Response(
            {
                "transcript": outcome.transcript,
                "intent": outcome.intent,
                "command": outcome.command,
                "messages": ChatMessageSerializer(outcome.messages, many=True).data,
                "result": ResultSerializer(outcome.result).data if outcome.result else None,
                "remaining": usage.remaining_today(request.user),
            },
            status=status.HTTP_201_CREATED,
        )


class DecisionView(APIView):
    """POST `keep` (true or false) for a picture the AI made in this photo's chat."""

    parser_classes = [JSONParser]

    def post(self, request, photo_id: int, result_id: int):
        photo = own_photo(request, photo_id)
        result = get_object_or_404(
            AIResult.objects.filter(owner=request.user, photo=photo), pk=result_id
        )
        keep = request.data.get("keep")
        if not isinstance(keep, bool):
            return Response({"error": "bad_request"}, status=status.HTTP_400_BAD_REQUEST)
        if result.decision != AIResult.Decision.PENDING:
            return Response({"error": "already_decided"}, status=status.HTTP_409_CONFLICT)

        decision = services.decide(result, keep, progress_for(request, photo))
        return Response(
            {
                "result": ResultSerializer(result).data,
                "messages": ChatMessageSerializer(decision.messages, many=True).data,
                "progress": LessonProgressSerializer(decision.progress).data,
                "new_photo": PhotoSerializer(decision.new_photo).data
                if decision.new_photo
                else None,
            }
        )
