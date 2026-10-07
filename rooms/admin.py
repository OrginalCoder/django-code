from django.contrib import admin
from .models import Room, Lesson

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('title', 'folder_name', 'order', 'slug')
    search_fields = ('title', 'folder_name', 'description')
    prepopulated_fields = {'slug': ('title',)}

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'room', 'order', 'slug')
    list_filter = ('room',)
    prepopulated_fields = {'slug': ('title',)}