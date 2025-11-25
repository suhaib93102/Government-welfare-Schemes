# API Configuration Guide

## Backend Endpoints

The mobile app connects to the Django backend API at:
- **Web/iOS**: `http://localhost:8003/api`
- **Android Emulator**: `http://10.0.2.2:8003/api`

### Available Endpoints

#### 1. Solve Question (POST `/api/solve/`)
Main endpoint for solving questions via text or image.

**Text Input:**
```json
{
  "text": "What is photosynthesis?",
  "max_results": 5
}
```

**Image Input:**
```
Content-Type: multipart/form-data

image: [image file]
max_results: 5
```

**Response:**
```json
{
  "success": true,
  "pipeline": "text" | "image",
  "query": {
    "original": "...",
    "cleaned": "...",
    "translated": "...",
    "language": "en"
  },
  "search_results": {
    "total": 10,
    "trusted_count": 8,
    "results": [...]
  },
  "web_content": [...],
  "confidence": {
    "overall": 85.5,
    "factors": {...}
  },
  "youtube_videos": [...],
  "metadata": {
    "processing_steps": 7,
    "image_processed": false,
    "queries_generated": 1
  }
}
```

#### 2. Health Check (GET `/api/health/`)
Check if the API is running.

**Response:**
```json
{
  "status": "healthy",
  "service": "question-solver-api",
  "version": "1.0.0"
}
```

#### 3. Service Status (GET `/api/status/`)
Check status of integrated services (OCR, Search, YouTube, etc.).

**Response:**
```json
{
  "ocr": {
    "available": true,
    "engine": "EasyOCR"
  },
  "search": {
    "searchapi": true,
    "serpapi": true
  },
  "youtube": {
    "available": true
  },
  "firecrawl": {
    "available": true
  }
}
```

## How to Test

### 1. Start the Backend Server
```bash
cd backend
python manage.py runserver 8003
```

### 2. Start the Mobile App

**For Web:**
```bash
cd EdTechMobile
npm run web
```

**For Android:**
```bash
cd EdTechMobile
npm run android
```

**For iOS:**
```bash
cd EdTechMobile
npm run ios
```

### 3. Test API Connection
The app will automatically detect the correct API URL based on the platform:
- Web/iOS uses `localhost:8003`
- Android emulator uses `10.0.2.2:8003` (special address for host machine)

## Troubleshooting

### CORS Issues
The backend is configured to allow all origins in DEBUG mode. If you encounter CORS errors:
1. Ensure `DEBUG=True` in backend settings
2. Check that `corsheaders` is installed: `pip install django-cors-headers`

### Android Emulator Connection
If Android can't connect to the backend:
1. Verify backend is running on port 8003
2. Use `10.0.2.2` instead of `localhost` (already configured in api.ts)
3. Check your emulator's network settings

### iOS Simulator Connection
If iOS can't connect:
1. Verify backend is running on port 8003
2. iOS simulator should be able to access `localhost` directly

### Network Request Timeout
If requests timeout (default: 30 seconds):
1. Check backend is processing requests (look at Django logs)
2. Ensure all required API keys are configured in backend `.env` file

## API Service Functions

The mobile app provides these API functions:

```typescript
// Solve question using text
solveQuestionByText(text: string, maxResults?: number): Promise<any>

// Solve question using image
solveQuestionByImage(imageUri: string, maxResults?: number): Promise<any>

// Check API health
checkHealth(): Promise<any>

// Check service status
checkServiceStatus(): Promise<any>
```

## Example Usage in Code

```typescript
import { solveQuestionByText, solveQuestionByImage } from './src/services/api';

// Text question
const response = await solveQuestionByText("What is Newton's first law?");

// Image question
const response = await solveQuestionByImage("file:///path/to/image.jpg");
```
