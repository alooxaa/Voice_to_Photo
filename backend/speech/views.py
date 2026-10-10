from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from . import recognizer
from .commands import LANGUAGES, match_command

MAX_AUDIO_BYTES = 2 * 1024 * 1024  # far more than 6 seconds of 16 kHz audio


class RecognizeView(APIView):
    """POST an `audio` WAV file and a `lang`; get back the text and command."""

    parser_classes = [MultiPartParser]

    def post(self, request):
        lang = request.data.get("lang", "")
        audio = request.FILES.get("audio")
        if lang not in LANGUAGES:
            return Response({"error": "bad_language"}, status=status.HTTP_400_BAD_REQUEST)
        if audio is None or audio.size > MAX_AUDIO_BYTES:
            return Response({"error": "bad_audio"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            text = recognizer.recognize(audio.read(), lang)
        except recognizer.BadAudioError:
            return Response({"error": "bad_audio"}, status=status.HTTP_400_BAD_REQUEST)
        except recognizer.ModelMissingError:
            return Response({"error": "model_missing"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({"text": text, "command": match_command(text, lang)})
