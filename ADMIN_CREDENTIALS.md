# Django Admin Panel - Credentials & Guide

## 🔐 Admin Credentials

**Admin Panel URL:** `http://localhost:8003/admin/`

**Username:** `admin`  
**Password:** `admin123`

> ⚠️ **IMPORTANT:** Change the password in production!

---

## 📋 Admin Panel Features

### 1. **Quiz Settings** (Global Configuration)
- **Path:** `Admin Panel > Quiz Settings`
- **Features:**
  - Configure Daily Quiz coin rewards
    - Attempt bonus (default: 5 coins)
    - Coins per correct answer (default: 5 coins)
    - Perfect score bonus (default: 10 coins)
  - Pair Quiz settings
    - Enable/disable feature
    - Session timeout (minutes)
    - Max questions per quiz
  - Coin system settings
    - Coin to currency conversion rate
    - Minimum coins for redemption

### 2. **Daily Quiz Management**
- **Path:** `Admin Panel > Daily Quizzes`
- **Features:**
  - View all daily quizzes by date
  - Edit quiz questions
  - Set coin rewards per quiz
  - Mark quizzes as active/inactive
  - View quiz statistics

### 3. **Daily Questions**
- **Path:** `Admin Panel > Daily Questions`
- **Features:**
  - View/edit individual questions
  - Organize by category and difficulty
  - Update correct answers and explanations
  - Add fun facts

### 4. **User Coins Management**
- **Path:** `Admin Panel > User Coins`
- **Features:**
  - View all users' coin balances
  - Track lifetime coins earned
  - Monitor coins spent
  - View transaction history inline

### 5. **Coin Transactions**
- **Path:** `Admin Panel > Coin Transactions`
- **Features:**
  - Full transaction history
  - Filter by transaction type (earn/spend)
  - Search by user
  - Audit trail

### 6. **User Daily Quiz Attempts**
- **Path:** `Admin Panel > User Daily Quiz Attempts`
- **Features:**
  - View all quiz attempts
  - Filter by date and completion status
  - See scores and coins earned
  - Export data

### 7. **Pair Quiz Sessions**
- **Path:** `Admin Panel > Pair Quiz Sessions`
- **Features:**
  - View all pair quiz sessions
  - Session status badges (waiting/active/completed/cancelled)
  - See both players' progress
  - View questions and answers
  - Bulk actions:
    - Cancel active sessions
    - Delete expired sessions
  - Detailed session analytics

### 8. **Subscriptions & Payments**
- **Path:** `Admin Panel > User Subscriptions`
- **Features:**
  - Manage user subscriptions
  - View payment history
  - Reset monthly usage limits
  - Track feature usage

---

## 🚀 Quick Start Guide

### Step 1: Access Admin Panel
```bash
# Start the server if not running
cd backend
./start_socketio.sh

# Open browser to:
http://localhost:8003/admin/
```

### Step 2: Configure Quiz Settings
1. Login with admin credentials
2. Click on **"Quiz Settings"**
3. Adjust coin rewards:
   - Daily Quiz Attempt Bonus: 5-10 coins recommended
   - Coins Per Correct Answer: 5-10 coins recommended
   - Perfect Score Bonus: 10-20 coins recommended
4. Click **"Save"**

### Step 3: Manage Daily Quizzes
1. Go to **"Daily Quizzes"**
2. Click on today's quiz (auto-generated)
3. Edit questions inline
4. Adjust coin rewards if needed
5. Click **"Save"**

### Step 4: Monitor User Activity
1. Go to **"User Coins"** to see coin balances
2. Go to **"User Daily Quiz Attempts"** to see quiz activity
3. Go to **"Pair Quiz Sessions"** to monitor live games

---

## 📊 Admin Dashboard Features

### Bulk Actions
- **Cancel multiple pair quiz sessions** at once
- **Delete expired sessions** in bulk
- **Reset monthly subscription usage** for multiple users

### Filtering & Search
- All models have powerful filtering
- Search by user ID, session code, date, etc.
- Date hierarchies for time-based browsing

### Inline Editing
- Edit related records without leaving the page
- View transaction history with user coins
- See payments with subscriptions

### Data Visualization
- Status badges with colors
- JSON data formatted for readability
- Question previews in session details

---

## 🔧 How to Change Admin Password

### Via Django Shell:
```bash
cd backend
python manage.py shell

# In shell:
from django.contrib.auth.models import User
u = User.objects.get(username='admin')
u.set_password('new_secure_password')
u.save()
exit()
```

### Via Admin Panel:
1. Login to admin panel
2. Click on your username (top right)
3. Click "Change password"
4. Follow instructions

---

## 📝 Common Admin Tasks

### Update Coin Rewards
1. Go to **Quiz Settings**
2. Update values under **"Daily Quiz Rewards"**
3. Save changes
4. New rewards apply immediately to new quizzes

### View User Progress
1. Go to **User Daily Quiz Attempts**
2. Filter by user ID or date
3. See detailed breakdown of answers

### Clean Up Old Data
1. Go to **Pair Quiz Sessions**
2. Select expired sessions
3. Choose **"Delete expired sessions"** action
4. Confirm deletion

### Grant Bonus Coins
1. Go to **User Coins**
2. Find user
3. Click on user
4. Add transaction inline
5. Set positive amount for bonus

---

## 🎯 Best Practices

1. **Regular Monitoring:**
   - Check Quiz Settings weekly
   - Review coin economy monthly
   - Monitor user activity daily

2. **Data Management:**
   - Delete old expired sessions regularly
   - Archive completed quiz attempts quarterly
   - Backup coin transaction data monthly

3. **Security:**
   - Change default admin password immediately
   - Create separate admin accounts for team members
   - Use strong passwords (minimum 12 characters)

4. **Testing:**
   - Test quiz settings changes with test users first
   - Monitor coin balance impacts
   - Review user feedback on reward amounts

---

## 🆘 Troubleshooting

### Can't Login?
- Verify username is `admin`
- Try resetting password via shell
- Check if server is running on port 8003

### Settings Not Saving?
- Check for validation errors (red text)
- Ensure all required fields are filled
- Try refreshing the page

### Sessions Not Appearing?
- Check date filter settings
- Try "Clear all filters" button
- Verify data exists in database

---

## 📞 Support

For issues or questions about the admin panel:
1. Check Django admin documentation
2. Review model definitions in `question_solver/models.py`
3. Check admin configuration in `question_solver/admin.py`

---

## ✅ Admin Panel Checklist

- [x] Quiz Settings configured
- [x] Admin user created
- [x] Default coin rewards set
- [x] Daily quiz monitoring active
- [x] Pair quiz sessions tracked
- [x] User coin balances viewable
- [x] Transaction history available
- [ ] Production password changed
- [ ] Backup strategy in place
- [ ] Team admin accounts created

