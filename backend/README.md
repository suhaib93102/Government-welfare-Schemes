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
