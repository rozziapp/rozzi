import datetime
import razorpay
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.models import User
from payments.models import RazorpayPlanMapping, Subscription, PaymentLog

def get_razorpay_client():
    """Initializes and returns the Razorpay client."""
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def get_or_create_plan(plan_name):
    """
    Retrieves or creates/updates a subscription plan using user-defined Razorpay IDs.
    plan_name must be 'seeker_29' or 'recruiter_99'.
    """
    predefined_plans = {
        'seeker_29': {
            'id': 'plan_SzgdSqEJkQ2pqi',
            'amount': 29
        },
        'recruiter_99': {
            'id': 'plan_Szh2QUrpGDfn5n',
            'amount': 99
        }
    }
    
    if plan_name not in predefined_plans:
        raise ValueError(f"Unknown plan name: {plan_name}")
        
    plan_info = predefined_plans[plan_name]
    
    mapping, created = RazorpayPlanMapping.objects.get_or_create(
        plan_name=plan_name,
        defaults={
            'razorpay_plan_id': plan_info['id'],
            'amount': plan_info['amount']
        }
    )
    
    # If the database entry already exists but has a different/stale ID, update it
    if not created and mapping.razorpay_plan_id != plan_info['id']:
        mapping.razorpay_plan_id = plan_info['id']
        mapping.amount = plan_info['amount']
        mapping.save()
        
    return mapping

def get_or_create_customer(user):
    """
    Checks if a Razorpay customer exists for this user in any subscription log.
    If not, creates one on Razorpay.
    """
    # Try to find existing customer ID from subscriptions
    existing_sub = Subscription.objects.filter(user=user).exclude(razorpay_customer_id__isnull=True).first()
    if existing_sub and existing_sub.razorpay_customer_id:
        return existing_sub.razorpay_customer_id
        
    client = get_razorpay_client()
    
    # Try to get phone number from ID card if available
    contact_number = ""
    primary_card = user.id_cards.filter(is_primary=True).first()
    if primary_card and primary_card.phone_number:
        contact_number = primary_card.phone_number
    else:
        any_card = user.id_cards.first()
        if any_card and any_card.phone_number:
            contact_number = any_card.phone_number
            
    # Full name representation
    name = f"{user.first_name} {user.last_name}".strip() or user.username
    
    customer_data = {
        "name": name,
        "email": user.email or f"{user.username}@rozzi.com",
    }
    if contact_number:
        customer_data["contact"] = contact_number
        
    try:
        customer = client.customer.create(data=customer_data)
        return customer['id']
    except Exception as e:
        # Fallback in case of registration failure
        print(f"Error creating customer: {e}")
        # Return none, checkout can proceed without pre-registered customer if needed
        return None

def timestamp_to_datetime(ts):
    """Helper to convert unix timestamp from Razorpay to timezone-aware datetime."""
    if not ts:
        return None
    return datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)

def cancel_razorpay_subscription(subscription_id, cancel_at_cycle_end=1):
    """Cancels a subscription on Razorpay."""
    client = get_razorpay_client()
    try:
        client.subscription.cancel(subscription_id, {"cancel_at_cycle_end": cancel_at_cycle_end})
        return True
    except Exception as e:
        print(f"Error cancelling Razorpay subscription {subscription_id}: {e}")
        return False

def check_and_sync_subscription(user):
    """
    Self-healing checker to sync user premium and subscription status with Razorpay.
    Usually called on profile endpoints or startup.
    """
    profile = getattr(user, 'profile', None)
    if not profile:
        return None
        
    # Get active or pending local subscriptions
    local_subs = Subscription.objects.filter(user=user).exclude(status__in=['cancelled', 'expired']).order_by('-created_at')
    
    if not local_subs.exists():
        # Sync profile if no subscription is present in DB
        if profile.is_premium or profile.subscription_active or profile.subscription_plan != 'free':
            profile.is_premium = False
            profile.subscription_active = False
            profile.subscription_plan = 'free'
            profile.save(update_fields=['is_premium', 'subscription_active', 'subscription_plan'])
        return None
        
    client = get_razorpay_client()
    has_active = False
    active_plan = 'free'
    
    for sub in local_subs:
        try:
            rzp_sub = client.subscription.fetch(sub.razorpay_subscription_id)
            status = rzp_sub.get('status')
            
            # Update fields in DB
            sub.status = status
            sub.current_start = timestamp_to_datetime(rzp_sub.get('current_start'))
            sub.current_end = timestamp_to_datetime(rzp_sub.get('current_end'))
            
            # Check if active
            # Razorpay subscription statuses: created, authenticated, active, pending, halted, cancelled, expired
            # Cancelled subscriptions remain active until the end of the paid billing cycle
            is_valid_period = sub.current_end and timezone.now() < sub.current_end
            if status in ['active', 'authenticated'] or (status == 'cancelled' and is_valid_period):
                sub.is_active = True
                has_active = True
                active_plan = sub.plan_name
            else:
                sub.is_active = False
                
            sub.save()
        except Exception as e:
            print(f"Error syncing subscription {sub.razorpay_subscription_id}: {e}")
            
    # Sync with UserProfile
    if has_active:
        profile.is_premium = True
        profile.subscription_active = True
        profile.subscription_plan = active_plan
    else:
        profile.is_premium = False
        profile.subscription_active = False
        profile.subscription_plan = 'free'
        
    profile.save(update_fields=['is_premium', 'subscription_active', 'subscription_plan'])
    return has_active

def sync_profile_from_local_subscriptions(user):
    """
    Updates the UserProfile subscription fields based on local Subscription records,
    without making external Razorpay API requests.
    """
    profile = getattr(user, 'profile', None)
    if not profile:
        return
        
    active_sub = Subscription.objects.filter(user=user, is_active=True).order_by('-created_at').first()
    if active_sub:
        profile.is_premium = True
        # If the subscription is active, its auto-renew active status matches whether it's not cancelled
        profile.subscription_active = (active_sub.status in ['active', 'authenticated'])
        profile.subscription_plan = active_sub.plan_name
    else:
        profile.is_premium = False
        profile.subscription_active = False
        profile.subscription_plan = 'free'
        
    profile.save(update_fields=['is_premium', 'subscription_active', 'subscription_plan'])
