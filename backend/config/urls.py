from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/photos/", include("photos.urls")),
    path("api/photos/<int:photo_id>/", include("chats.urls")),
    path("api/speech/", include("speech.urls")),
    path("api/", include("ai.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
