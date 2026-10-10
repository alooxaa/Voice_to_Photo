from django.urls import path

from .views import AIRequestView, DecisionView, RemoveBackgroundView, StatusView

urlpatterns = [
    path("ai/status/", StatusView.as_view(), name="ai-status"),
    path("ai/remove-background/", RemoveBackgroundView.as_view(), name="ai-remove-background"),
    path("photos/<int:photo_id>/ai/", AIRequestView.as_view(), name="ai-request"),
    path(
        "photos/<int:photo_id>/ai/results/<int:result_id>/",
        DecisionView.as_view(),
        name="ai-decision",
    ),
]
