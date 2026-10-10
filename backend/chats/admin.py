from django.contrib import admin

from .models import ChatMessage, LessonProgress


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["photo", "role", "kind", "text", "created"]


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ["photo", "user", "current_step", "finished"]
