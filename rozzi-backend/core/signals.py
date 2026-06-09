from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import Message, Notification
from core.utils.push_notifications import send_expo_push_notification

@receiver(post_save, sender=Message)
def send_push_notification_on_message(sender, instance, created, **kwargs):
    """Send push notification to the recipient of a message"""
    if created:
        try:
            conversation = instance.conversation
            # Find participants who are not the sender
            recipients = conversation.participants.exclude(id=instance.sender.id)
            
            for recipient in recipients:
                # Get device tokens for recipient
                tokens = list(recipient.device_tokens.values_list('token', flat=True))
                if tokens:
                    # Prepare display name for sender
                    full_name = f"{instance.sender.first_name} {instance.sender.last_name}".strip()
                    display_name = full_name if full_name else instance.sender.username
                    
                    data = {
                        "type": "message",
                        "conversationId": str(conversation.id),
                        "senderId": str(instance.sender.id),
                        "messageId": str(instance.id),
                    }
                    
                    send_expo_push_notification(
                        to_tokens=tokens,
                        title=f"Message from {display_name}",
                        body=instance.content,
                        data=data
                    )
        except Exception as e:
            print(f"Error sending message push notification: {e}")

@receiver(post_save, sender=Notification)
def send_push_notification_on_db_notification(sender, instance, created, **kwargs):
    """Send push notification to the recipient of a database Notification"""
    if created:
        try:
            recipient = instance.recipient
            tokens = list(recipient.device_tokens.values_list('token', flat=True))
            if tokens:
                data = {
                    "id": str(instance.id),
                    "type": instance.notification_type,
                    "jobId": str(instance.related_job_id) if instance.related_job_id else "",
                    "applicationId": str(instance.related_application_id) if instance.related_application_id else "",
                    "hireRequestId": str(instance.related_hire_request_id) if instance.related_hire_request_id else "",
                    "senderId": str(instance.sender_id) if instance.sender_id else "",
                }
                
                send_expo_push_notification(
                    to_tokens=tokens,
                    title=instance.title,
                    body=instance.message,
                    data=data
                )
        except Exception as e:
            print(f"Error sending DB notification push: {e}")
