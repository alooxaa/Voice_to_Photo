from rest_framework import serializers

from speech.vocabulary import COMMAND_IDS

from .models import ChatMessage, LessonProgress


class ChatMessageSerializer(serializers.ModelSerializer):
    # A picture made in the AI studio: its address and whether the child kept it.
    result = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ["id", "role", "kind", "key", "params", "text", "command", "result", "created"]

    def get_result(self, message: ChatMessage) -> dict | None:
        result = message.result
        if result is None:
            return None
        return {
            "id": result.id,
            "kind": result.kind,
            "url": result.image.url,
            "decision": result.decision,
        }


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ["current_step", "finished", "ai_step", "ai_finished"]


class ChildRequestSerializer(serializers.Serializer):
    """What the child did: a recognised (or missed) voice command, or a tile press."""

    text = serializers.CharField(max_length=200, allow_blank=True)
    command = serializers.ChoiceField(choices=COMMAND_IDS, allow_null=True)
    # A pressed tile has no spoken words; its label is shown in the current language instead.
    # "ai": a simple command the child asked for in the AI studio.
    source = serializers.ChoiceField(choices=["voice", "tile", "ai"], default="voice")
