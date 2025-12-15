# Cloudinary File Cleanup System

This system automatically manages old and unused files in your Cloudinary account to save storage space and costs.

## Features

1. **Automatic Cleanup on Upload**: When users upload new profile pictures or resumes, old files are automatically deleted
2. **Orphaned File Detection**: Finds files in Cloudinary that are no longer referenced in the database
3. **Scheduled Cleanup**: Management commands for periodic cleanup via cron jobs
4. **Safe Deletion**: Only deletes files that are confirmed to be unused
5. **Dry Run Mode**: Test cleanup operations without actually deleting files

## Setup

### 1. Environment Variables

Set these environment variables in production:

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Install Dependencies

The system uses the existing Cloudinary dependencies:
- `cloudinary>=1.44.1`
- `django-cloudinary-storage>=0.3.0`

## Usage

### Manual Cleanup

#### Clean up all orphaned and old files:
```bash
python manage.py cleanup_cloudinary
```

#### Dry run (see what would be deleted without deleting):
```bash
python manage.py cleanup_cloudinary --dry-run
```

#### Clean up only orphaned files:
```bash
python manage.py cleanup_cloudinary --orphaned-only
```

#### Clean up only old files (default: 30 days):
```bash
python manage.py cleanup_cloudinary --old-files-only --days-old=30
```

#### Verbose output:
```bash
python manage.py cleanup_cloudinary --verbose
```

### Scheduled Cleanup

#### Daily cleanup (orphaned files only):
```bash
python manage.py schedule_cleanup --daily
```

#### Weekly cleanup (comprehensive):
```bash
python manage.py schedule_cleanup --weekly
```

### Setting Up Cron Jobs

Add these to your crontab (`crontab -e`):

```bash
# Daily cleanup at 2 AM
0 2 * * * cd /path/to/your/project && python manage.py schedule_cleanup --daily >> /var/log/cloudinary_cleanup.log 2>&1

# Weekly cleanup on Sundays at 3 AM
0 3 * * 0 cd /path/to/your/project && python manage.py schedule_cleanup --weekly >> /var/log/cloudinary_cleanup.log 2>&1
```

## How It Works

### Automatic Cleanup (Signals)

The system uses Django signals to automatically clean up old files:

1. **Profile Pictures**: When a user uploads a new profile picture, the old one is deleted from Cloudinary
2. **Resume Files**: When a user uploads a new resume, the old one is deleted
3. **ID Card Photos**: When an ID card photo is updated, the old one is deleted
4. **Model Deletion**: When records are deleted, associated files are removed from Cloudinary

### Orphaned File Detection

The system:
1. Fetches all files from Cloudinary using the Admin API
2. Scans the database for all file references
3. Identifies files in Cloudinary that aren't referenced anywhere
4. Safely deletes orphaned files

### Safety Measures

- **Current File Protection**: Never deletes files that are currently in use
- **Database Verification**: Cross-references all database models before deletion
- **Error Handling**: Logs errors and continues processing other files
- **Dry Run Mode**: Test operations without actual deletion

## File Types Handled

### Images (`image` resource type)
- Profile pictures (`setuna/profiles/`)
- ID card photos (`setuna/id_cards/`)

### Documents (`raw` resource type)
- Resume files (`setuna/resumes/`)

### Job PDFs (Conditionally)
Job-related PDFs are **not** automatically deleted as per requirement #3, in case they are being redirected or shared.

## Monitoring and Logs

The system provides detailed logging:

```python
import logging
logging.getLogger('core.utils.cloudinary_cleanup').setLevel(logging.INFO)
```

### Log Levels:
- `INFO`: Successful operations, file counts
- `WARNING`: Skipped operations, minor issues  
- `ERROR`: Failed deletions, exceptions
- `DEBUG`: Detailed operation traces (use `--verbose`)

## Example Output

```
🔍 Scanning for orphaned files...
Found 1247 referenced files in database
Fetched 156 image resources so far...
Fetched 89 raw resources so far...
Found orphaned file: profiles/old_avatar_123
Successfully deleted image: profiles/old_avatar_123
✅ Orphaned files cleanup: 12 deleted, 0 errors

🕰️ Scanning for files older than 30 days...
Found old unreferenced file: resumes/old_resume_456 (created: 2024-10-15T10:30:00Z)
Successfully deleted raw: resumes/old_resume_456
✅ Old files cleanup: 8 deleted, 0 errors

📊 CLEANUP SUMMARY
⏱️ Duration: 0:02:34
🗑️ Total files deleted: 20
❌ Total errors: 0
🎉 Cleanup completed successfully!
```

## Troubleshooting

### Common Issues:

1. **API Rate Limits**: Cloudinary has rate limits. The system handles pagination automatically.

2. **Permission Errors**: Ensure your API credentials have Admin API access.

3. **Network Issues**: The system retries failed requests and logs errors.

4. **Large Cleanups**: For accounts with many files, use `--max-files` to limit processing:
   ```bash
   python manage.py cleanup_cloudinary --max-files=100
   ```

### Debugging:

1. **Use Dry Run**: Always test with `--dry-run` first
2. **Enable Verbose Logging**: Use `--verbose` for detailed output
3. **Check Logs**: Monitor Django logs for error details
4. **Manual Verification**: Check Cloudinary dashboard before/after cleanup

## Security Considerations

1. **Environment Variables**: Never commit API secrets to version control
2. **Backup Strategy**: Consider backing up important files before cleanup
3. **Access Control**: Limit API key permissions to necessary operations only
4. **Monitoring**: Set up alerts for cleanup failures in production

## Cost Savings

Regular cleanup can significantly reduce Cloudinary costs:
- **Storage**: Remove unused files
- **Bandwidth**: Fewer files to sync/backup  
- **API Calls**: Optimized batch operations

Monitor your Cloudinary usage dashboard to track savings.





























