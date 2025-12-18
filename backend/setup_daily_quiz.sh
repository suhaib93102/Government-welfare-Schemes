#!/bin/bash
# Quick setup script for Daily Quiz feature
# Run from backend/ directory: bash setup_daily_quiz.sh

set -e

echo "==================================="
echo "Daily Quiz Feature Setup"
echo "==================================="
echo ""

# Check Python version
echo "Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$MAJOR" -lt 3 ] || ([ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 11 ]); then
    echo "❌ Python 3.11+ required. Current version: $PYTHON_VERSION"
    echo ""
    echo "Install Python 3.11:"
    echo "  macOS: brew install python@3.11"
    echo "  Linux: sudo apt install python3.11"
    echo ""
    exit 1
fi

echo "✅ Python $PYTHON_VERSION detected"
echo ""

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment exists"
fi

echo ""
echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing dependencies..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1
echo "✅ Dependencies installed"
echo ""

echo "Running migrations..."
python manage.py migrate
echo "✅ Migrations complete"
echo ""

echo "Creating admin user (if not exists)..."
python manage.py create_dev_admin --username admin --email admin@example.com --password admin123 --noinput
echo ""

echo "Generating today's Daily Quiz..."
python manage.py generate_daily_quiz
echo "✅ Daily Quiz generated"
echo ""

echo "==================================="
echo "✅ Setup Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "  1. Start server: python manage.py runserver 127.0.0.1:8003"
echo "  2. Access admin: http://127.0.0.1:8003/admin/"
echo "     Username: admin"
echo "     Password: admin123"
echo ""
echo "  3. Test API:"
echo "     curl 'http://127.0.0.1:8003/api/daily-quiz/?user_id=testuser'"
echo ""
echo "  4. View documentation: ../DAILY_QUIZ_FEATURE.md"
echo ""
echo "Happy quizzing! 🎯"
