from django.db import models
from django.utils.text import slugify

class Room(models.Model):
    title = models.CharField(max_length=150, verbose_name="Xona nomi")
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(verbose_name="Qisqacha tavsif")
    folder_name = models.CharField(max_length=100, default='', verbose_name="Loyiha papkasi", help_text="rooms_storage ichidagi papka nomi")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib raqami")

    class Meta:
        ordering = ['order', 'id']
        verbose_name = "Xona"
        verbose_name_plural = "Xonalar"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Lesson(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='lessons', verbose_name="Xona")
    title = models.CharField(max_length=200, verbose_name="Dars sarlavhasi")
    slug = models.SlugField(unique=True, blank=True)
    theory = models.TextField(verbose_name="Nazariya va topshiriq sharti")
    default_code = models.TextField(
        default="",
        verbose_name="Monaco Editor shablon kodi"
    )
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib raqami")

    class Meta:
        ordering = ['order', 'id']
        verbose_name = "Dars"
        verbose_name_plural = "Darslar"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.room.title} -> {self.title}"