#!/bin/bash

echo "🚀 Setting up Pair Quiz Feature"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -d "EdTechMobile" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Backend Setup
echo "📦 Step 1: Installing backend dependencies..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install python-socketio==5.11.0 redis==5.0.1
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
echo "✅ Backend dependencies installed"
echo ""

# Run migrations
echo "🗄️  Step 2: Running database migrations..."
python manage.py makemigrations
python manage.py migrate
if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    exit 1
fi
echo "✅ Database migrations completed"
echo ""

# Frontend Setup
echo "📦 Step 3: Installing frontend dependencies..."
cd ../EdTechMobile
npm install socket.io-client@4.8.1
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
echo "✅ Frontend dependencies installed"
echo ""

echo "✅ Setup Complete!"
echo ""
echo "To start the application:"
echo ""
echo "1. Start backend (in backend/ directory):"
echo "   uvicorn edtech_project.asgi:application --host 0.0.0.0 --port 8003"
echo ""
echo "   Or install uvicorn first:"
echo "   pip install uvicorn[standard]"
echo ""
echo "2. Start frontend (in EdTechMobile/ directory):"
echo "   npm start"
echo ""
echo "3. Access Pair Quiz from the navigation menu: 'Pair Quiz'"
echo ""
echo "📖 See PAIR_QUIZ_FEATURE.md for detailed documentation"
echo ""
