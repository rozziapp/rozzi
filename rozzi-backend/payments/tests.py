import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from payments.models import RazorpayPlanMapping, Subscription, PaymentLog
from payments.services import check_and_sync_subscription, get_or_create_plan

class PaymentsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testpaymentuser',
            email='testpayment@example.com',
            password='testpassword123',
            first_name='Test',
            last_name='PaymentUser'
        )
        self.client.force_authenticate(user=self.user)

    @patch('razorpay.Client')
    def test_create_subscription_invalid_data(self, mock_client_class):
        # Missing plan
        response = self.client.post(reverse('create-subscription'), {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

        # Invalid plan name
        response = self.client.post(reverse('create-subscription'), {'plan': 'invalid_plan'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    @patch('razorpay.Client')
    def test_create_subscription_success(self, mock_client_class):
        # Mock Razorpay API
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        
        # Mock plan creation on Razorpay
        mock_client.plan.create.return_value = {'id': 'plan_mock_123'}
        
        # Mock customer creation on Razorpay
        mock_client.customer.create.return_value = {'id': 'cust_mock_123'}
        
        # Mock subscription creation on Razorpay
        mock_client.subscription.create.return_value = {
            'id': 'sub_mock_123',
            'status': 'created'
        }

        response = self.client.post(reverse('create-subscription'), {'plan': 'seeker_29'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subscription_id'], 'sub_mock_123')
        self.assertEqual(response.data['plan_name'], 'seeker_29')
        self.assertEqual(response.data['amount'], 29)

        # Verify DB entries
        self.assertTrue(RazorpayPlanMapping.objects.filter(plan_name='seeker_29').exists())
        self.assertTrue(Subscription.objects.filter(razorpay_subscription_id='sub_mock_123').exists())

    @patch('razorpay.Client')
    def test_cancel_subscription_not_found(self, mock_client_class):
        response = self.client.post(reverse('cancel-subscription'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    @patch('razorpay.Client')
    def test_cancel_subscription_success(self, mock_client_class):
        # Setup mock client
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.subscription.cancel.return_value = {'status': 'cancelled'}

        # Create active subscription locally
        subscription = Subscription.objects.create(
            user=self.user,
            razorpay_subscription_id='sub_active_123',
            plan_name='seeker_29',
            amount=29.00,
            status='active',
            is_active=True
        )
        self.user.profile.is_premium = True
        self.user.profile.subscription_active = True
        self.user.profile.subscription_plan = 'seeker_29'
        self.user.profile.save()

        response = self.client.post(reverse('cancel-subscription'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify local update
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'cancelled')
        self.assertFalse(subscription.is_active)

        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.is_premium)
        self.assertFalse(self.user.profile.subscription_active)
        self.assertEqual(self.user.profile.subscription_plan, 'free')

    @patch('payments.views.check_and_sync_subscription')
    def test_get_subscription_detail(self, mock_sync):
        # Create active subscription and payment logs
        subscription = Subscription.objects.create(
            user=self.user,
            razorpay_subscription_id='sub_detail_123',
            plan_name='recruiter_99',
            amount=99.00,
            status='active',
            is_active=True,
            current_end=timezone.now() + timezone.timedelta(days=30)
        )
        
        PaymentLog.objects.create(
            user=self.user,
            subscription=subscription,
            razorpay_payment_id='pay_123',
            amount=99.00,
            status='captured'
        )

        response = self.client.get(reverse('user-subscription-detail'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['active_plan'], 'free') # Profile is initially free until synced
        self.assertEqual(len(response.data['payment_history']), 1)
        self.assertEqual(response.data['payment_history'][0]['payment_id'], 'pay_123')
        
        # Ensure sync checker was called
        mock_sync.assert_called_once_with(self.user)

class WebhookViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='webhookuser',
            email='webhook@example.com',
            password='testpassword123'
        )
        self.subscription = Subscription.objects.create(
            user=self.user,
            razorpay_subscription_id='sub_webhook_123',
            plan_name='seeker_29',
            amount=29.00,
            status='created',
            is_active=False
        )

    @patch('razorpay.Client')
    def test_webhook_invalid_signature(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.utility.verify_webhook_signature.side_effect = Exception("Signature verification failed")

        payload = {'event': 'subscription.activated'}
        response = self.client.post(
            reverse('razorpay-webhook'),
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE='invalid_sig'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('razorpay.Client')
    def test_webhook_subscription_activated(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.utility.verify_webhook_signature.return_value = True

        payload = {
            'event': 'subscription.activated',
            'payload': {
                'subscription': {
                    'entity': {
                        'id': 'sub_webhook_123',
                        'status': 'active',
                        'current_start': 1716393600,
                        'current_end': 1718985600
                    }
                }
            }
        }
        
        response = self.client.post(
            reverse('razorpay-webhook'),
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE='valid_sig'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, 'active')
        self.assertTrue(self.subscription.is_active)
        
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.is_premium)
        self.assertTrue(self.user.profile.subscription_active)
        self.assertEqual(self.user.profile.subscription_plan, 'seeker_29')

    @patch('razorpay.Client')
    def test_webhook_subscription_charged(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.utility.verify_webhook_signature.return_value = True

        payload = {
            'event': 'subscription.charged',
            'payload': {
                'subscription': {
                    'entity': {
                        'id': 'sub_webhook_123',
                        'status': 'active',
                        'current_start': 1716393600,
                        'current_end': 1718985600
                    }
                },
                'payment': {
                    'entity': {
                        'id': 'pay_charged_123',
                        'amount': 2900,
                        'status': 'captured',
                        'order_id': 'order_charged_123'
                    }
                }
            }
        }
        
        response = self.client.post(
            reverse('razorpay-webhook'),
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE='valid_sig'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertTrue(PaymentLog.objects.filter(razorpay_payment_id='pay_charged_123').exists())
        log = PaymentLog.objects.get(razorpay_payment_id='pay_charged_123')
        self.assertEqual(log.amount, 29.00)
        self.assertEqual(log.status, 'captured')

    @patch('razorpay.Client')
    def test_webhook_subscription_cancelled(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.utility.verify_webhook_signature.return_value = True

        # Activate premium locally first
        self.subscription.status = 'active'
        self.subscription.is_active = True
        self.subscription.save()
        self.user.profile.is_premium = True
        self.user.profile.subscription_active = True
        self.user.profile.subscription_plan = 'seeker_29'
        self.user.profile.save()

        payload = {
            'event': 'subscription.cancelled',
            'payload': {
                'subscription': {
                    'entity': {
                        'id': 'sub_webhook_123',
                        'status': 'cancelled'
                    }
                }
            }
        }
        
        response = self.client.post(
            reverse('razorpay-webhook'),
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE='valid_sig'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, 'cancelled')
        self.assertFalse(self.subscription.is_active)
        
        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.is_premium)
        self.assertFalse(self.user.profile.subscription_active)
        self.assertEqual(self.user.profile.subscription_plan, 'free')

class ServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='serviceuser',
            email='service@example.com',
            password='testpassword123'
        )
        self.subscription = Subscription.objects.create(
            user=self.user,
            razorpay_subscription_id='sub_service_123',
            plan_name='seeker_29',
            amount=29.00,
            status='created',
            is_active=False
        )

    @patch('razorpay.Client')
    def test_check_and_sync_subscription_active(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.subscription.fetch.return_value = {
            'id': 'sub_service_123',
            'status': 'active',
            'current_start': 1716393600,
            'current_end': 1718985600
        }

        # Profile is initially free
        self.assertFalse(self.user.profile.is_premium)

        is_active = check_and_sync_subscription(self.user)
        self.assertTrue(is_active)

        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.is_premium)
        self.assertTrue(self.user.profile.subscription_active)
        self.assertEqual(self.user.profile.subscription_plan, 'seeker_29')

    @patch('razorpay.Client')
    def test_check_and_sync_subscription_cancelled(self, mock_client_class):
        # Set user as premium locally first
        self.user.profile.is_premium = True
        self.user.profile.subscription_active = True
        self.user.profile.subscription_plan = 'seeker_29'
        self.user.profile.save()

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.subscription.fetch.return_value = {
            'id': 'sub_service_123',
            'status': 'cancelled',
            'current_start': 1716393600,
            'current_end': 1718985600
        }

        is_active = check_and_sync_subscription(self.user)
        self.assertFalse(is_active)

        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.is_premium)
        self.assertFalse(self.user.profile.subscription_active)
        self.assertEqual(self.user.profile.subscription_plan, 'free')
