from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Photo
from .serializers import PhotoEditedSerializer, PhotoSerializer, PhotoUploadSerializer


def photos_of(user):
    """The only way views reach photos: always limited to the requesting user."""
    return Photo.objects.filter(owner=user).annotate(message_count=Count("messages"))


class PhotoListView(generics.ListAPIView):
    """GET lists the user's photos; POST uploads a new one."""

    serializer_class = PhotoSerializer
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        return photos_of(self.request.user)

    def post(self, request):
        upload = PhotoUploadSerializer(data=request.data)
        upload.is_valid(raise_exception=True)
        photo = upload.save(owner=request.user)
        return Response(PhotoSerializer(photo).data, status=status.HTTP_201_CREATED)


class PhotoDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = PhotoSerializer

    def get_queryset(self):
        return photos_of(self.request.user)

    def perform_destroy(self, photo: Photo) -> None:
        # Remove the image files too, not only the database row.
        photo.original.delete(save=False)
        if photo.edited:
            photo.edited.delete(save=False)
        photo.delete()


class PhotoSaveEditedView(APIView):
    """Store the canvas result as the photo's newest edited version."""

    parser_classes = [MultiPartParser]

    def post(self, request, pk: int):
        photo = get_object_or_404(photos_of(request.user), pk=pk)
        serializer = PhotoEditedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_file = photo.edited.name if photo.edited else None
        photo.edited.save(f"photo-{photo.pk}.png", serializer.validated_data["image"])
        if old_file and old_file != photo.edited.name:
            photo.edited.storage.delete(old_file)

        return Response(PhotoSerializer(photos_of(request.user).get(pk=pk)).data)
