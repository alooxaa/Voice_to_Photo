from rest_framework import serializers

from speech.commands import COMMAND_IDS

from .models import ChatMessage, LessonProgress


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "kind", "key", "params", "text", "command", "created"]


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ["current_step", "finished"]


class ChildRequestSerializer(serializers.Serializer):
    """What the child did: a recognised (or missed) voice command, or a tile press."""

    text = serializers.CharField(max_length=200, allow_blank=True)
    command = serializers.ChoiceField(choices=COMMAND_IDS, allow_null=True)
    # A pressed tile has no spoken words; its label is shown in the current language instead.
    source = serializers.ChoiceField(choices=["voice", "tile"], default="voice")
