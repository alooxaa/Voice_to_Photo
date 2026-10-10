from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import ProfileSerializer, RegisterSerializer


class RegisterView(generics.GenericAPIView):
    """Create an account and log the child in straight away."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        refresh = RefreshToken.for_user(profile.user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "profile": ProfileSerializer(profile).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """GET or PATCH the logged-in user's own profile."""

    serializer_class = ProfileSerializer
    http_method_names = ["get", "patch"]

    def get_object(self):
        return self.request.user.profile
