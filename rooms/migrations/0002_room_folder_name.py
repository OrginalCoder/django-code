
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rooms', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='folder_name',
            field=models.CharField(default='', help_text='rooms_storage ichidagi papka nomi', max_length=100, verbose_name='Loyiha papkasi'),
        ),
    ]
