#!/usr/bin/env python3.10
"""
Setup Razorpay subscription plans
Creates BASIC and PREMIUM plans in Razorpay dashboard
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edtech_project.settings')
django.setup()

import razorpay
from django.conf import settings
from question_solver.models import SubscriptionPlan

def setup_plans():
    """Create subscription plans in Razorpay"""
    
    # Initialize Razorpay client
    try:
        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        print("✓ Razorpay client initialized")
        print(f"  Key ID: {settings.RAZORPAY_KEY_ID}")
    except Exception as e:
        print(f"✗ Failed to initialize Razorpay client: {e}")
        return False
    
    # Get plans from database
    try:
        basic_plan = SubscriptionPlan.objects.get(name='basic')
        premium_plan = SubscriptionPlan.objects.get(name='premium')
        print("✓ Found subscription plans in database")
    except Exception as e:
        print(f"✗ Failed to get plans from database: {e}")
        print("  Run migrations first: python manage.py migrate")
        return False
    
    plans_config = [
        {
            'name': 'basic',
            'db_plan': basic_plan,
            'razorpay_id': 'plan_basic_99'
        },
        {
            'name': 'premium',
            'db_plan': premium_plan,
            'razorpay_id': 'plan_premium_499'
        }
    ]
    
    created_plans = []
    
    for config in plans_config:
        db_plan = config['db_plan']
        plan_name = config['name'].upper()
        
        print(f"\n{plan_name} Plan:")
        print(f"  Display Name: {db_plan.display_name}")
        print(f"  First Month: ₹{db_plan.first_month_price}")
        print(f"  Recurring: ₹{db_plan.recurring_price}/month")
        
        plan_data = {
            "period": "monthly",
            "interval": 1,
            "item": {
                "name": db_plan.display_name,
                "amount": int(db_plan.recurring_price * 100),  # Convert to paise
                "currency": "INR",
                "description": db_plan.description
            },
            "notes": {
                "first_month_price": f"₹{db_plan.first_month_price}",
                "plan_type": config['name']
            }
        }
        
        try:
            razorpay_plan = client.plan.create(plan_data)
            plan_id = razorpay_plan['id']
            created_plans.append({
                'name': config['name'],
                'id': plan_id,
                'amount': db_plan.recurring_price
            })
            print(f"  ✓ Created Razorpay plan: {plan_id}")
        except Exception as e:
            error_str = str(e)
            if 'already exists' in error_str.lower():
                print(f"  ⚠ Plan already exists, using ID: {config['razorpay_id']}")
                created_plans.append({
                    'name': config['name'],
                    'id': config['razorpay_id'],
                    'amount': db_plan.recurring_price
                })
            else:
                print(f"  ✗ Failed to create plan: {e}")
    
    if created_plans:
        print("\n" + "="*60)
        print("Successfully configured Razorpay plans!")
        print("="*60)
        print("\nAdd these to your .env file:")
        for plan in created_plans:
            env_var = f"RAZORPAY_{plan['name'].upper()}_PLAN_ID"
            print(f"{env_var}={plan['id']}")
        
        print("\n" + "="*60)
        print("Test subscription creation:")
        print("="*60)
        test_cmd = '''curl -X POST http://localhost:8003/api/subscriptions/create/ \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "test-user-123", "plan": "basic"}'
'''
        print(test_cmd)
        return True
    else:
        print("\n✗ No plans were created successfully")
        return False

if __name__ == '__main__':
    print("="*60)
    print("Razorpay Subscription Plans Setup")
    print("="*60)
    print()
    
    success = setup_plans()
    
    if not success:
        print("\nSetup failed. Please check:")
        print("1. Razorpay credentials are set in .env file")
        print("2. Database migrations are applied")
        print("3. Internet connection is available")
        sys.exit(1)
    else:
        print("\n✓ Setup complete!")
        sys.exit(0)
