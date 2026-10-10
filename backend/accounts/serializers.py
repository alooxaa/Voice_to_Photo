from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from photos.samples import create_sample_photos

from .models import Language, Profile

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Profile
        fields = ["username", "display_name", "language", "avatar_color", "ai_notice_accepted"]


class RegisterSerializer(serializers.Serializer):
    """Child-friendly registration: name, username and the password twice."""

    display_name = serializers.CharField(max_length=40)
    username = serializers.RegexField(
        r"^[\w.-]+$",
        max_length=30,
        error_messages={"invalid": "username_invalid"},
    )
    password = serializers.CharField(write_only=True)
    password_repeat = serializers.CharField(write_only=True)
    language = serializers.ChoiceField(choices=Language.choices, default=Language.KAZAKH)

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("username_taken")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_repeat"]:
            raise serializers.ValidationError({"password_repeat": "passwords_differ"})
        try:
            validate_password(attrs["password"])
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": "password_short"}) from error
        return attrs

    @transaction.atomic
    def create(self, validated_data: dict) -> Profile:
        user = User.objects.create_user(
            username=validated_data["username"], password=validated_data["password"]
        )
        profile = Profile.objects.create(
            user=user,
            display_name=validated_data["display_name"],
            language=validated_data["language"],
        )
        create_sample_photos(user, profile.language)
        return profile
