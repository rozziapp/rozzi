# Generated manually for safe trigram search extension enablement

from django.db import migrations

def create_trigram_extension(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_alter_job_city_alter_job_created_at_and_more'),
    ]

    operations = [
        migrations.RunPython(create_trigram_extension, reverse_code=migrations.RunPython.noop),
    ]
