"""
Setup script for subscription system
Initializes BASIC and PREMIUM plans in database
"""
import os
import django
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edtech_project.setting
from question_solver.models import SubscriptionPlan

def setup_subscription_plans():
    """Initialize BASIC and PREMIUM subscription plans"""
    print("=" * 60)
    print("SUBSCRIPTION PLAN SETUP")
    print("=" * 60)
    
    print("\n1. Initializing default plans...")
    SubscriptionPlan.initialize_default_plans()
    
    print("\n2. Verifying plans in database...")
    plans = SubscriptionPlan.objects.all()
    
    if plans.exists():
        print(f"\n✓ Found {plans.count()} plan(s) in database:\n")
        for plan in plans:
            print(f"   {plan.display_name}")
            print(f"   - Name: {plan.name}")
            print(f"   - First Month: ₹{plan.first_month_price}")
            print(f"   - Recurring: ₹{plan.recurring_price}/month")
            print(f"   - Description: {plan.description}")
            print(f"   - Features:")
            features = plan.get_feature_dict()
            for feature, limit in features.items():
                limit_str = "Unlimited" if limit is None else str(limit)
                print(f"     • {feature}: {limit_str}")
            print()
    else:
        print("\n✗ No plans found! Something went wrong.")
        return False
    
    print("=" * 60)
    print("SETUP COMPLETE!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Add Razorpay credentials to .env:")
    print("   RAZORPAY_KEY_ID=rzp_test_xxxxx")
    print("   RAZORPAY_KEY_SECRET=xxxxx")
    print("   RAZORPAY_WEBHOOK_SECRET=xxxxx")
    print()
    print("2. Create plans in Razorpay Dashboard:")
    print("   - BASIC: plan_basic_99 (₹99/month)")
    print("   - PREMIUM: plan_premium_499 (₹499/month)")
    print()
    print("3. Start Django server:")
    print("   python manage.py runserver 8003")
    print()
    print("4. Test API endpoints:")
    print("   python test_subscription_api.py")
    
    return True

if __name__ == "__main__":
    try:
        setup_subscription_plans()
    except Exception as e:
        print(f"\n✗ Error during setup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
