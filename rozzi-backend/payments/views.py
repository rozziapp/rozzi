import json
import razorpay
from django.conf import settings
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from payments.models import RazorpayPlanMapping, Subscription, PaymentLog
from payments.services import (
    get_razorpay_client,
    get_or_create_plan,
    get_or_create_customer,
    cancel_razorpay_subscription,
    check_and_sync_subscription,
    timestamp_to_datetime
)

class CreateSubscriptionView(APIView):
    """
    POST /api/payments/create-subscription/
    Request: { "plan": "29" } or { "plan": "seeker_29" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_input = request.data.get('plan')
        if not plan_input:
            return Response({'error': 'Plan is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Map input to plan name
        if str(plan_input) in ['29', 'seeker_29']:
            plan_name = 'seeker_29'
        elif str(plan_input) in ['99', 'recruiter_99']:
            plan_name = 'recruiter_99'
        else:
            return Response({'error': 'Invalid plan specified'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # 1. Get or create plan on Razorpay
            plan_mapping = get_or_create_plan(plan_name)
            
            # 2. Get or create customer ID
            customer_id = get_or_create_customer(request.user)
            
            # 3. Create subscription on Razorpay
            client = get_razorpay_client()
            
            sub_data = {
                "plan_id": plan_mapping.razorpay_plan_id,
                "total_count": 120,  # 10 years monthly recurring limit
                "quantity": 1,
                "customer_notify": 1
            }
            if customer_id:
                sub_data["customer_id"] = customer_id
                
            rzp_subscription = client.subscription.create(data=sub_data)
            
            # 4. Save local subscription record
            Subscription.objects.create(
                user=request.user,
                razorpay_subscription_id=rzp_subscription['id'],
                razorpay_customer_id=customer_id,
                plan_name=plan_name,
                amount=plan_mapping.amount,
                status=rzp_subscription.get('status', 'created'),
                is_active=False
            )
            
            return Response({
                'subscription_id': rzp_subscription['id'],
                'razorpay_key': settings.RAZORPAY_KEY_ID,
                'customer_id': customer_id,
                'plan_name': plan_name,
                'amount': plan_mapping.amount
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': f"Subscription creation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CancelSubscriptionView(APIView):
    """
    POST /api/payments/cancel-subscription/
    Cancels the user's current active Razorpay subscription.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        # Find active subscription
        subscription = Subscription.objects.filter(user=user, is_active=True).order_by('-created_at').first()
        if not subscription:
            # Fallback check for any subscription that is not cancelled/expired
            subscription = Subscription.objects.filter(user=user).exclude(status__in=['cancelled', 'expired']).order_by('-created_at').first()
            
        if not subscription:
            return Response({'error': 'No active subscription found'}, status=status.HTTP_404_NOT_FOUND)
            
        success = cancel_razorpay_subscription(subscription.razorpay_subscription_id)
        if success:
            subscription.status = 'cancelled'
            subscription.is_active = False
            subscription.save()
            
            # Update user profile
            profile = getattr(user, 'profile', None)
            if profile:
                profile.is_premium = False
                profile.subscription_active = False
                profile.subscription_plan = 'free'
                profile.save(update_fields=['is_premium', 'subscription_active', 'subscription_plan'])
                
            return Response({'message': 'Subscription cancelled successfully'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Failed to cancel subscription on Razorpay'}, status=status.HTTP_400_BAD_REQUEST)

class UserSubscriptionDetailView(APIView):
    """
    GET /api/me/subscription/ or GET /api/payments/me/subscription/
    Returns status of active plan and payment logs history.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Self-healing sync on profile check
        check_and_sync_subscription(request.user)
        
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
        active_sub = Subscription.objects.filter(user=request.user, is_active=True).order_by('-created_at').first()
        if not active_sub:
            active_sub = Subscription.objects.filter(user=request.user).exclude(status__in=['cancelled', 'expired']).order_by('-created_at').first()
            
        # Get history of charges
        payments = PaymentLog.objects.filter(user=request.user).order_by('-created_at')
        payment_history = [{
            'payment_id': p.razorpay_payment_id,
            'amount': float(p.amount),
            'status': p.status,
            'created_at': p.created_at.isoformat()
        } for p in payments]
        
        return Response({
            'active_plan': profile.subscription_plan,
            'premium_status': profile.is_premium,
            'subscription_active': profile.subscription_active,
            'expiry_date': active_sub.current_end.isoformat() if active_sub and active_sub.current_end else None,
            'subscription_id': active_sub.razorpay_subscription_id if active_sub else None,
            'payment_history': payment_history
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class RazorpayWebhookView(APIView):
    """
    POST /api/payments/webhook/
    Listens to Razorpay subscription status updates and records logs.
    """
    permission_classes = []  # Public endpoint

    def post(self, request):
        payload_body = request.body.decode('utf-8')
        signature = request.headers.get('X-Razorpay-Signature')
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        
        # Verify Razorpay signature
        client = get_razorpay_client()
        try:
            client.utility.verify_webhook_signature(
                payload_body,
                signature,
                webhook_secret
            )
        except Exception as e:
            print(f"Webhook signature verification failed: {e}")
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            event_data = json.loads(payload_body)
            event_name = event_data.get('event')
            payload = event_data.get('payload', {})
            
            subscription_payload = payload.get('subscription', {}).get('entity', {})
            subscription_id = subscription_payload.get('id')
            
            if not subscription_id:
                return Response({'status': 'ignored', 'message': 'No subscription ID in event'}, status=status.HTTP_200_OK)
                
            # Find the local subscription record
            try:
                sub = Subscription.objects.get(razorpay_subscription_id=subscription_id)
                user = sub.user
                profile = user.profile
            except Subscription.DoesNotExist:
                return Response({'status': 'ignored', 'message': 'Subscription not found locally'}, status=status.HTTP_200_OK)
                
            # Handle Razorpay Events
            if event_name == 'subscription.activated':
                sub.status = 'active'
                sub.is_active = True
                sub.current_start = timestamp_to_datetime(subscription_payload.get('current_start'))
                sub.current_end = timestamp_to_datetime(subscription_payload.get('current_end'))
                sub.save()
                
                # Activate premium in profile
                profile.is_premium = True
                profile.subscription_active = True
                profile.subscription_plan = sub.plan_name
                profile.save(update_fields=['is_premium', 'subscription_active', 'subscription_plan'])
                
            elif event_name == 'subscription.charged':
                sub.status = 'active'
                sub.is_active = True
                sub.current_start = timestamp_to_datetime(subscription_payload.get('current_start'))
                sub.current_end = timestamp_to_datetime(subscription_payload.get('current_end'))
                sub.save()
                
                # Make sure premium is active
                profile.is_premium = True
                profile.subscription_active = True
                profile.subscription_plan = sub.plan_name
                profile.save(update_fields=['is_premium', 'subscription_active', 'subscription_plan'])
                
                # Record charge log
                payment_payload = payload.get('payment', {}).get('entity', {})
                payment_id = payment_payload.get('id')
                if payment_id:
                    # Amount is returned in paise (1 INR = 100 paise)
                    amount_in_inr = payment_payload.get('amount', 0) / 100.0
                    PaymentLog.objects.get_or_create(
                        razorpay_payment_id=payment_id,
                        defaults={
                            'user': user,
                            'subscription': sub,
                            'razorpay_order_id': payment_payload.get('order_id'),
                            'razorpay_signature': signature,
                            'amount': amount_in_inr,
                            'status': payment_payload.get('status', 'captured')
                        }
                    )
                    
            elif event_name == 'subscription.cancelled':
                sub.status = 'cancelled'
                sub.is_active = False
                sub.save()
                
                # Deactivate premium in profile
                profile.is_premium = False
                profile.subscription_active = False
                profile.subscription_plan = 'free'
                profile.save(update_fields=['is_premium', 'subscription_active', 'subscription_plan'])
                
            elif event_name == 'payment.failed':
                # Log charge failure in billing history if payment payload is present
                payment_payload = payload.get('payment', {}).get('entity', {})
                payment_id = payment_payload.get('id')
                if payment_id:
                    amount_in_inr = payment_payload.get('amount', 0) / 100.0
                    PaymentLog.objects.get_or_create(
                        razorpay_payment_id=payment_id,
                        defaults={
                            'user': user,
                            'subscription': sub,
                            'razorpay_order_id': payment_payload.get('order_id'),
                            'amount': amount_in_inr,
                            'status': 'failed'
                        }
                    )
                    
            return Response({'status': 'processed'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Webhook processing error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
