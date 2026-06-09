from django.db import models
from django.contrib.auth.models import User

class RazorpayPlanMapping(models.Model):
    plan_name = models.CharField(max_length=50, unique=True)  # seeker_29, recruiter_99
    razorpay_plan_id = models.CharField(max_length=100)
    amount = models.IntegerField()  # 29, 99
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.plan_name} -> {self.razorpay_plan_id}"

class Subscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    razorpay_subscription_id = models.CharField(max_length=100, unique=True)
    razorpay_customer_id = models.CharField(max_length=100, blank=True, null=True)
    plan_name = models.CharField(max_length=50)  # seeker_29, recruiter_99
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=False)
    status = models.CharField(max_length=50, default='created')  # created, authenticated, active, cancelled, expired, pending, halted
    current_start = models.DateTimeField(blank=True, null=True)
    current_end = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Subscription {self.razorpay_subscription_id} for {self.user.username} ({self.plan_name})"

class PaymentLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_logs')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    razorpay_payment_id = models.CharField(max_length=100, unique=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, default='captured')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.razorpay_payment_id} - ₹{self.amount} for {self.user.username}"
