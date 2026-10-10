from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from photos.views import photos_of

from . import assistant
from .models import ChatMessage, LessonProgress
from .serializers import ChatMessageSerializer, ChildRequestSerializer, LessonProgressSerializer


def own_photo(request, photo_id: int):
    """404 for photos of other users, so their existence is not even revealed."""
    return get_object_or_404(photos_of(request.user), pk=photo_id)


def progress_for(request, photo) -> LessonProgress:
    progress, _ = LessonProgress.objects.get_or_create(photo=photo, defaults={"user": request.user})
    return progress


class MessageListView(APIView):
    """GET the chat of a photo; POST what the child did and get the assistant's answer."""

    def get(self, request, photo_id: int):
        photo = own_photo(request, photo_id)
        return Response(ChatMessageSerializer(photo.messages.all(), many=True).data)

    @transaction.atomic
    def post(self, request, photo_id: int):
        photo = own_photo(request, photo_id)
        child = ChildRequestSerializer(data=request.data)
        child.is_valid(raise_exception=True)
        data = child.validated_data
        progress = progress_for(request, photo)

        answer = assistant.reply(
            command=data["command"],
            state=assistant.LessonState(progress.current_step, progress.finished),
            lang=data["lang"],
            heard=data["text"],
        )

        created = [
            ChatMessage.objects.create(
                photo=photo,
                role=ChatMessage.Role.CHILD,
                text=data["text"],
                command=data["command"],
            )
        ]
        created += [
            ChatMessage.objects.create(
                photo=photo,
                role=ChatMessage.Role.ASSISTANT,
                kind=message.kind,
                text=message.text,
                command=message.command,
            )
            for message in answer.messages
        ]

        progress.current_step = answer.state.step
        progress.finished = answer.state.finished
        progress.save()
        # Touch the photo so the most recently used one comes first on the home screen.
        photo.save(update_fields=["updated"])

        return Response(
            {
                "messages": ChatMessageSerializer(created, many=True).data,
                "progress": LessonProgressSerializer(progress).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ProgressView(APIView):
    def get(self, request, photo_id: int):
        photo = own_photo(request, photo_id)
        return Response(LessonProgressSerializer(progress_for(request, photo)).data)
