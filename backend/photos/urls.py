from django.urls import path

from .views import PhotoDetailView, PhotoListView, PhotoSaveEditedView

urlpatterns = [
    path("", PhotoListView.as_view(), name="photo-list"),
    path("<int:pk>/", PhotoDetailView.as_view(), name="photo-detail"),
    path("<int:pk>/save/", PhotoSaveEditedView.as_view(), name="photo-save"),
]
