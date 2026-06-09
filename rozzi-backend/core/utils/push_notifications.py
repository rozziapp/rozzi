import requests
import logging

logger = logging.getLogger(__name__)

def send_expo_push_notification(to_tokens, title, body, data=None):
    """
    Send push notification using Expo Push API.
    
    to_tokens: list of strings (tokens) or single token string
    title: notification title
    body: notification body / message
    data: dict containing custom payload data (like senderId, conversationId, type)
    """
    if not to_tokens:
        return None
        
    if isinstance(to_tokens, str):
        to_tokens = [to_tokens]
        
    url = "https://exp.host/--/api/v2/push/send"
    
    payload = []
    for token in to_tokens:
        if not token or not token.startswith("ExponentPushToken["):
            # Ensure it is a valid token format
            continue
        item = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
        }
        if data:
            item["data"] = data
        payload.append(item)
        
    if not payload:
        return None
        
    try:
        response = requests.post(
            url, 
            json=payload, 
            headers={
                "accept": "application/json",
                "accept-encoding": "gzip, deflate",
                "content-type": "application/json",
            }, 
            timeout=10
        )
        
        if response.status_code == 200:
            logger.info(f"Successfully sent push notifications to {len(payload)} devices")
            return response.json()
        else:
            logger.error(f"Failed to send push notifications: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error sending push notification via Expo: {e}")
        return None
