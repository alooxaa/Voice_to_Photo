from django.http import HttpResponse
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from photos.serializers import MAX_IMAGE_BYTES

from . import background


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
