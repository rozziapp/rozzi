from django.test import TestCase
from django.contrib.auth.models import User
from core.models import Conversation, Message
from core.utils.moderation import censor_text, moderate_image
from rest_framework.test import APITestCase
from rest_framework import status
from PIL import Image
import io
import base64

def create_mock_image(color, width=50, height=50):
    img = Image.new('RGB', (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()

class ModerationTestCase(TestCase):
    def test_text_censorship_direct(self):
        # Test standard profanities
        self.assertEqual(censor_text("hello world"), "hello world")
        self.assertEqual(censor_text("you are a chutiya!"), "you are a *******!")
        self.assertEqual(censor_text("fucking bitch"), "******* *****")
        
        # Test Hinglish profanities
        self.assertEqual(censor_text("bhenchod"), "********")
        self.assertEqual(censor_text("bhen chod"), "*********")
        
        # Test leetspeak
        self.assertEqual(censor_text("chut1ya"), "*******")
        self.assertEqual(censor_text("f@ck"), "****")
        
        # Test word boundaries (should NOT censor)
        self.assertEqual(censor_text("assess"), "assess")
        self.assertEqual(censor_text("association"), "association")

    def test_message_save_auto_censor(self):
        # Create user and conversation
        user1 = User.objects.create_user(username="u1", password="pw1")
        user2 = User.objects.create_user(username="u2", password="pw2")
        conversation = Conversation.objects.create()
        conversation.participants.add(user1, user2)
        
        # Save profane message
        msg = Message.objects.create(
            conversation=conversation,
            sender=user1,
            content="this is a fucking test with chutiya words"
        )
        # Should be censored in db
        self.assertEqual(msg.content, "this is a ******* test with ******* words")

    def test_image_moderation_skin_ratio(self):
        # 1. Non-skin image (solid blue)
        blue_img = create_mock_image((0, 0, 255))
        is_safe, reason = moderate_image(blue_img)
        self.assertTrue(is_safe)
        
        # 2. Excessive skin image (solid skin-tone)
        skin_img = create_mock_image((240, 200, 180))
        is_safe, reason = moderate_image(skin_img)
        self.assertFalse(is_safe)
        self.assertIn("excessive skin exposure", reason)

class ProfilePhotoUploadAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testapi", password="password123")
        self.client.force_authenticate(user=self.user)

    def test_upload_safe_photo_base64(self):
        # Create solid blue image bytes
        img_bytes = create_mock_image((0, 0, 255))
        img_b64 = "data:image/jpeg;base64," + base64.b64encode(img_bytes).decode('utf-8')
        
        # Mock cloudinary upload response to avoid hitting actual internet
        from unittest.mock import patch
        with patch('cloudinary.uploader.upload') as mock_upload:
            mock_upload.return_value = {
                'secure_url': 'https://res.cloudinary.com/test/image/upload/v1/profile_1_123.jpg',
                'public_id': 'rozzi/profiles/profile_1_123'
            }
            
            response = self.client.post('/api/upload-profile-photo/', {'photo': img_b64})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('photo_url', response.data)

    def test_upload_unsafe_photo_base64(self):
        # Create solid skin color image bytes
        img_bytes = create_mock_image((240, 200, 180))
        img_b64 = "data:image/jpeg;base64," + base64.b64encode(img_bytes).decode('utf-8')
        
        # This should fail BEFORE uploading to cloudinary, returning 400
        response = self.client.post('/api/upload-profile-photo/', {'photo': img_b64})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('rejected', response.data['error'])
