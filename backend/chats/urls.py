from django.urls import path

from .views import MessageListView, ProgressView

urlpatterns = [
    path("messages/", MessageListView.as_view(), name="photo-messages"),
    path("progress/", ProgressView.as_view(), name="photo-progress"),
]
