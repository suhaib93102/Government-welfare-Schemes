# Ed-Tech-Platform

This is the Django backend for the Ed-Tech platform (question solver API).

## Quick run / local setup

These are the recommended minimal steps to run the backend locally (macOS / Linux):

1. Open terminal and cd into the backend directory:

```bash
cd backend
```

2. (Optional) Create and activate a venv:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Note: This backend requires Python 3.11 or newer (Django 5.0 and some dependencies are Python 3.11+). If you currently have Python 3.10 or older, please install Python 3.11 and recreate the virtual environment.

To install via Homebrew on macOS:

```bash
brew install python@3.11
``` 
Then create the venv using the Python 3.11 binary:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
```

3. Install requirements:

```bash
pip install -r requirements.txt
```

4. Apply migrations (the project uses a local sqlite DB):

```bash
python manage.py migrate
```

5. Start the development server (default 127.0.0.1:8003 used in this repo):

```bash
python manage.py runserver 127.0.0.1:8003
```

6. Health check endpoint:

```
GET http://127.0.0.1:8003/api/health/
```

This repo ships a ready-to-use `db.sqlite3` for local testing. For production deployments you should configure a dedicated DB and production settings.

## Admin panel

The Django admin is available at `/admin/` by default. To create or update a development superuser quickly, run the management command included in the project:

```bash
python manage.py create_dev_admin --username devadmin --email devadmin@example.com --password changeme
```

If you omit the `--password` argument, the command will generate a secure random password and print it to the terminal. You can also use environment variables to set default dev admin credentials:

```bash
export DEV_SUPERUSER_NAME=devadmin
export DEV_SUPERUSER_EMAIL=devadmin@example.com
export DEV_SUPERUSER_PASSWORD=changeme
python manage.py create_dev_admin --noinput
```

Important: never commit production credentials or sensitive secrets into the repository. The management command above is meant for local development and testing only.

## Daily GK Quiz Feature

The backend now includes a gamified Daily Quiz system where users answer 10 general knowledge questions and earn coins for correct answers.

### Quick Start

1. Generate today's quiz (with 10 sample GK questions):
```bash
python manage.py generate_daily_quiz
```

2. Access quiz via API:
```bash
# Get today's quiz
curl "http://127.0.0.1:8003/api/daily-quiz/?user_id=testuser"

# Get user coins
curl "http://127.0.0.1:8003/api/daily-quiz/coins/?user_id=testuser"
```

3. Manage quizzes in admin:
- Navigate to http://127.0.0.1:8003/admin/
- View "Daily Quizzes", "Daily questions", "User Daily Quiz attempts", "User coins"

### Features
- 10 questions per day (easy to moderate difficulty)
- 5 coins per correct answer (50 coins max per day)
- Categories: geography, science, history, current events, general, sports, tech
- One attempt per user per day
- Full transaction logging

For complete documentation, see `DAILY_QUIZ_FEATURE.md` in the project root.
