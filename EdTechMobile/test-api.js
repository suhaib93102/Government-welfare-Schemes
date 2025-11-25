#!/usr/bin/env node

/**
 * Test script to verify backend API connectivity
 * Run this before starting the mobile app to ensure backend is working
 */

const axios = require('axios');

const API_URL = 'http://localhost:8003/api';

async function testAPI() {
  console.log('🔍 Testing ED Tech Backend API...\n');

  // Test 1: Health Check
  console.log('1️⃣  Testing Health Check Endpoint...');
  try {
    const healthResponse = await axios.get(`${API_URL}/health/`);
    console.log('✅ Health Check:', healthResponse.data);
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    console.log('   Make sure the backend server is running on port 8003');
    console.log('   Run: cd backend && python manage.py runserver 8003\n');
    return;
  }

  // Test 2: Service Status
  console.log('\n2️⃣  Testing Service Status Endpoint...');
  try {
    const statusResponse = await axios.get(`${API_URL}/status/`);
    console.log('✅ Service Status:', JSON.stringify(statusResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Service Status Failed:', error.message);
  }

  // Test 3: Text Question Solving
  console.log('\n3️⃣  Testing Text Question Solving...');
  try {
    const textResponse = await axios.post(`${API_URL}/solve/`, {
      text: 'What is the capital of France?',
      max_results: 3
    });
    console.log('✅ Text Question Solved Successfully!');
    console.log('   Pipeline:', textResponse.data.pipeline);
    console.log('   Success:', textResponse.data.success);
    console.log('   Search Results:', textResponse.data.search_results?.total || 0);
    console.log('   Confidence:', textResponse.data.confidence?.overall || 'N/A');
  } catch (error) {
    console.error('❌ Text Question Failed:', error.response?.data?.error || error.message);
  }

  console.log('\n✨ API Testing Complete!\n');
  console.log('📱 You can now start the mobile app:');
  console.log('   npm run web    (for web browser)');
  console.log('   npm run android (for Android emulator)');
  console.log('   npm run ios    (for iOS simulator)\n');
}

testAPI().catch(console.error);
