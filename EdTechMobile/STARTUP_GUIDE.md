# 🚀 Quick Start Guide - ED Tech Mobile App

## ✅ Backend is Connected!

The mobile app is now fully configured to work with your Django backend API.

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Backend server running on port 8003
- ✅ All required Python packages installed in backend
- ✅ API keys configured in `backend/.env` file
- ✅ Node.js and npm installed for mobile app

## 🎯 Step-by-Step Launch

### 1. Start the Backend Server

Open a terminal in the backend folder:
```bash
cd "/Users/vishaljha/Desktop/ED Tech/backend"
python manage.py runserver 8003
```

You should see:
```
Starting development server at http://127.0.0.1:8003/
```

### 2. Test Backend Connectivity (Optional but Recommended)

Open a new terminal in EdTechMobile folder:
```bash
cd "/Users/vishaljha/Desktop/ED Tech/EdTechMobile"
node test-api.js
```

This will verify all endpoints are working correctly.

### 3. Launch the Mobile App

Choose your platform:

#### 🌐 Web Browser (Easiest)
```bash
cd "/Users/vishaljha/Desktop/ED Tech/EdTechMobile"
npm run web
```
Opens in browser at http://localhost:8081

#### 📱 Android Emulator
```bash
cd "/Users/vishaljha/Desktop/ED Tech/EdTechMobile"
npm run android
```
Requires Android Studio with emulator running.

#### 🍎 iOS Simulator (Mac only)
```bash
cd "/Users/vishaljha/Desktop/ED Tech/EdTechMobile"
npm run ios
```
Requires Xcode installed.

## 🔗 API Configuration

The mobile app automatically selects the correct API URL:

| Platform | API URL | Notes |
|----------|---------|-------|
| **Web** | `http://localhost:8003/api` | Direct connection |
| **iOS Simulator** | `http://localhost:8003/api` | Direct connection |
| **Android Emulator** | `http://10.0.2.2:8003/api` | Special emulator address |
| **Physical Devices** | Use your computer's IP | See "Physical Device Setup" below |

## 📱 Physical Device Setup

To test on a real Android or iOS device:

1. Find your computer's local IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Update `EdTechMobile/src/services/api.ts`:
   ```typescript
   // Replace localhost with your IP address
   const API_URL = 'http://192.168.1.XXX:8003/api';
   ```

3. Ensure your device is on the same WiFi network as your computer

4. Backend must allow your IP in CORS settings (already configured in DEBUG mode)

## 🧪 Testing the App

### Text Input Mode
1. Switch to "Text Input" tab
2. Type a question like "What is photosynthesis?"
3. Click "Solve Question"
4. Wait for results (may take 5-30 seconds depending on backend services)

### Image Upload Mode
1. Switch to "Image Upload" tab
2. Choose "Take Photo" or "Choose from Library"
3. Select an image with text/question
4. Click "Analyze Image"
5. Results will show extracted text + answers

## 📊 What You'll See in Results

The app displays:
- ✅ **Processing Info**: Pipeline type (text/image) and processing time
- ✅ **Extracted/Input Text**: The question or OCR-extracted text
- ✅ **Confidence Score**: How confident the OCR/search is (color-coded)
- ✅ **Search Results**: Top web results with titles, snippets, and links
- ✅ **Detailed Content**: Full article content from trusted sources
- ✅ **YouTube Videos**: Educational video tutorials with metadata

## ⚠️ Troubleshooting

### Backend Not Running
**Error**: "Network Error" or "Failed to solve question"
**Solution**: 
```bash
cd backend
python manage.py runserver 8003
```

### Android Can't Connect
**Error**: Connection timeout on Android emulator
**Solution**: The app already uses `10.0.2.2` for Android. Ensure backend is on port 8003.

### CORS Errors (Web)
**Error**: "CORS policy blocked"
**Solution**: Already fixed! Backend allows all origins in DEBUG mode.

### Module Not Found (Mobile)
**Error**: "Module not found" when starting app
**Solution**: 
```bash
cd EdTechMobile
npm install
```

### Expo/Metro Not Working
**Error**: "spawn EAGAIN" or fork errors
**Solution**: 
1. Close unnecessary apps
2. Restart your computer
3. Clear npm cache: `npm cache clean --force`
4. Try again

### Slow Results
**Issue**: Taking longer than 30 seconds
**Cause**: Backend is processing OCR, web scraping, and YouTube search
**Solution**: Normal for complex queries. The timeout is set to 30 seconds.

## 🎨 App Features

- ✨ **Dual Input Modes**: Text typing or image upload
- 🎯 **Smart OCR**: Extracts text from images using EasyOCR
- 🔍 **Web Search**: Finds relevant educational content
- 📚 **Content Scraping**: Fetches full article content
- 🎥 **YouTube Integration**: Suggests educational videos
- 📊 **Confidence Scoring**: Shows reliability of results
- 📱 **Cross-Platform**: Works on Web, Android, and iOS

## 🔧 Configuration Files

All configuration is complete! Files updated:

- ✅ `EdTechMobile/src/services/api.ts` - API client with platform detection
- ✅ `EdTechMobile/App.tsx` - Main app with proper API integration
- ✅ `EdTechMobile/src/components/Results.tsx` - Results display
- ✅ `backend/edtech_project/settings.py` - CORS settings for mobile

## 📚 API Endpoints Reference

See `API_CONFIGURATION.md` for detailed endpoint documentation.

## 🆘 Need Help?

Check the logs:

**Backend logs**: Terminal where you ran `python manage.py runserver`
**Mobile logs**: Terminal where you ran `npm run web/android/ios`

Backend logs will show:
- OCR processing
- Search queries
- Web scraping progress
- YouTube search results
- Any errors

## ✨ You're Ready!

Everything is connected and ready to go. Just:
1. Start backend server (port 8003)
2. Start mobile app (web/android/ios)
3. Ask questions and get smart answers!

---

**Happy Learning! 🎓**
