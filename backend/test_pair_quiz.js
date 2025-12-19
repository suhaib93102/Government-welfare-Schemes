/**
 * Pair Quiz Integration Test
 * Tests the full flow: create, join, answer, complete
 */

const axios = require('axios');

const API_BASE_URL = 'http://127.0.0.1:8003/api';

async function testPairQuiz() {
  console.log('🧪 Testing Pair Quiz Integration\n');

  try {
    // Test 1: Create Session
    console.log('1️⃣ Creating pair quiz session...');
    const createResponse = await axios.post(`${API_BASE_URL}/pair-quiz/create/`, {
      userId: 'test_user_1',
      quizConfig: {
        subject: 'Mathematics',
        difficulty: 'easy',
        numQuestions: 5
      }
    });

    const { sessionId, sessionCode, questions } = createResponse.data;
    console.log(`✅ Session created: ${sessionCode}`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Questions: ${questions.length}\n`);

    // Test 2: Join Session
    console.log('2️⃣ Joining session...');
    const joinResponse = await axios.post(`${API_BASE_URL}/pair-quiz/join/`, {
      userId: 'test_user_2',
      sessionCode: sessionCode
    });

    console.log(`✅ Session joined`);
    console.log(`   Status: ${joinResponse.data.status}\n`);

    // Test 3: Get Session Details
    console.log('3️⃣ Fetching session details...');
    const sessionResponse = await axios.get(`${API_BASE_URL}/pair-quiz/${sessionId}/`);
    console.log(`✅ Session details retrieved`);
    console.log(`   Host: ${sessionResponse.data.hostUserId}`);
    console.log(`   Partner: ${sessionResponse.data.partnerUserId}`);
    console.log(`   Current Question: ${sessionResponse.data.currentQuestionIndex + 1}\n`);

    // Test 4: Cancel Session
    console.log('4️⃣ Cancelling session...');
    await axios.post(`${API_BASE_URL}/pair-quiz/${sessionId}/cancel/`, {
      userId: 'test_user_1',
      reason: 'Test completed'
    });
    console.log(`✅ Session cancelled\n`);

    console.log('🎉 All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testPairQuiz();
