#!/bin/bash

echo "🚀 EdTech App - Quick Start Setup"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -d "EdTechMobile" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📦 Step 1: Installing frontend dependencies..."
cd EdTechMobile
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
echo "✅ Frontend dependencies installed"
echo ""

echo "📦 Step 2: Installing backend dependencies..."
cd ../backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
echo "✅ Backend dependencies installed"
echo ""

echo "🗄️  Step 3: Running database migrations..."
python manage.py makemigrations
python manage.py migrate
if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    exit 1
fi
echo "✅ Database migrations completed"
echo ""

echo "✅ Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Start the backend server:"
echo "   cd backend && source venv/bin/activate && python manage.py runserver"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   cd EdTechMobile && npm start"
echo ""
echo "3. Follow the integration steps in AUTHENTICATION_GUIDE.md"
echo ""
echo "🎉 Happy coding!"
