from django.urls import path

from .views import RemoveBackgroundView

urlpatterns = [
    path("remove-background/", RemoveBackgroundView.as_view(), name="ai-remove-background"),
]
