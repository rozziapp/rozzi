from django.urls import path
from payments.views import (
    CreateSubscriptionView,
    CancelSubscriptionView,
    UserSubscriptionDetailView,
    RazorpayWebhookView
)

urlpatterns = [
    path('create-subscription/', CreateSubscriptionView.as_view(), name='create-subscription'),
    path('cancel-subscription/', CancelSubscriptionView.as_view(), name='cancel-subscription'),
    path('me/subscription/', UserSubscriptionDetailView.as_view(), name='user-subscription-detail'),
    path('webhook/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
]
