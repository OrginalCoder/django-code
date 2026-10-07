
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Room',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=150, verbose_name='Xona nomi')),
                ('slug', models.SlugField(blank=True, unique=True)),
                ('description', models.TextField(verbose_name='Qisqacha tavsif')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='Tartib raqami')),
            ],
            options={
                'verbose_name': 'Xona',
                'verbose_name_plural': 'Xonalar',
                'ordering': ['order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='Lesson',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='Dars sarlavhasi')),
                ('slug', models.SlugField(blank=True, unique=True)),
                ('theory', models.TextField(verbose_name='Nazariya va topshiriq sharti')),
                ('default_code', models.TextField(default='# Django kodingizni shu yerga yozing\n', verbose_name='Monaco Editor shablon kodi')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='Tartib raqami')),
                ('room', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lessons', to='rooms.room', verbose_name='Xona')),
            ],
            options={
                'verbose_name': 'Dars',
                'verbose_name_plural': 'Darslar',
                'ordering': ['order', 'id'],
            },
        ),
    ]
