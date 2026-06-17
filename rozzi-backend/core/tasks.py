from celery import shared_task
import logging
from core.utils.push_notifications import send_expo_push_notification

logger = logging.getLogger(__name__)

@shared_task
def send_push_notification_task(to_tokens, title, body, data=None):
    """Celery task to send push notification via Expo"""
    logger.info(f"Sending push notification in background to {len(to_tokens) if isinstance(to_tokens, list) else 1} devices")
    return send_expo_push_notification(to_tokens, title, body, data)
