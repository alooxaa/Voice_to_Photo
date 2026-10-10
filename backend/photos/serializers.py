from rest_framework import serializers

from .models import Photo

MAX_IMAGE_BYTES = 10 * 1024 * 1024


def check_size(image):
    if image.size > MAX_IMAGE_BYTES:
        raise serializers.ValidationError("image_too_large")
    return image


class PhotoSerializer(serializers.ModelSerializer):
    original_url = serializers.SerializerMethodField()
    edited_url = serializers.SerializerMethodField()
    has_chat = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = [
            "id",
            "title",
            "title_key",
            "original_url",
            "edited_url",
            "has_chat",
            "created",
            "updated",
        ]

    # Relative URLs work through the Vite proxy and do not depend on the host name.
    def get_original_url(self, photo: Photo) -> str:
        return photo.original.url

    def get_edited_url(self, photo: Photo) -> str | None:
        return photo.edited.url if photo.edited else None

    def get_has_chat(self, photo: Photo) -> bool:
        return getattr(photo, "message_count", 0) > 0


class PhotoUploadSerializer(serializers.ModelSerializer):
    original = serializers.ImageField(validators=[check_size])
    title = serializers.CharField(max_length=60, required=False, allow_blank=True)

    class Meta:
        model = Photo
        fields = ["original", "title"]

    def create(self, validated_data: dict) -> Photo:
        if not validated_data.get("title"):
            name = validated_data["original"].name.rsplit(".", 1)[0]
            validated_data["title"] = name[:60]
        return super().create(validated_data)


class PhotoEditedSerializer(serializers.Serializer):
    image = serializers.ImageField(validators=[check_size])
