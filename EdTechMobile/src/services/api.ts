import axios from 'axios';
import { Platform } from 'react-native';

// Dynamic API URL based on platform
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return 'http://10.0.2.2:8003/api';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost
    return 'http://localhost:8003/api';
  } else {
    // Web or other platforms
    return 'http://localhost:8003/api';
  }
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

/**
 * Solve question using text input
 * @param text - The question text
 * @param maxResults - Number of search results (default: 5)
 */
export const solveQuestionByText = async (text: string, maxResults: number = 5) => {
  try {
    const response = await api.post('/solve/', {
      text: text,
      max_results: maxResults,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to solve question');
  }
};

/**
 * Solve question using image upload
 * @param imageUri - The local URI of the image
 * @param maxResults - Number of search results (default: 5)
 */
export const solveQuestionByImage = async (imageUri: string, maxResults: number = 5) => {
  try {
    const formData = new FormData();
    
    // Prepare image for upload
    const imageFile = {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'question.jpg',
    } as any;
    
    formData.append('image', imageFile);
    formData.append('max_results', maxResults.toString());
    
    const response = await api.post('/solve/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to process image');
  }
};

/**
 * Check API health status
 */
export const checkHealth = async () => {
  try {
    const response = await api.get('/health/');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Health check failed');
  }
};

/**
 * Check status of all integrated services
 */
export const checkServiceStatus = async () => {
  try {
    const response = await api.get('/status/');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Service status check failed');
  }
};

/**
 * Generate quiz from topic or document
 * @param topic - The topic or text content
 * @param numQuestions - Number of questions to generate (default: 5)
 * @param difficulty - Difficulty level: easy, medium, hard (default: medium)
 * @param document - Optional document file
 */
export const generateQuiz = async (
  topic: string, 
  numQuestions: number = 5, 
  difficulty: string = 'medium',
  document?: any
) => {
  try {
    // Validate minimum text length
    if (!topic || topic.trim().length < 50) {
      throw new Error('Please provide text content with at least 50 characters');
    }
    
    // Map difficulty to backend format
    const response = await api.post('/quiz/generate/', {
      topic: topic,
      num_questions: numQuestions,
      difficulty: difficulty
    });
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to generate quiz');
  }
};

/**
 * Generate flashcards from topic or document
 * @param topic - The topic or text content
 * @param numCards - Number of flashcards to generate (default: 10)
 * @param document - Optional document file
 */
export const generateFlashcards = async (
  topic: string, 
  numCards: number = 10,
  document?: any
) => {
  try {
    const formData = new FormData();
    
    if (document) {
      // For web, document might already be a File object
      if (Platform.OS === 'web' && document.file) {
        formData.append('document', document.file);
      } else if (Platform.OS === 'web' && document instanceof File) {
        formData.append('document', document);
      } else {
        // For mobile platforms
        const documentFile = {
          uri: document.uri,
          type: document.mimeType || document.type || 'application/octet-stream',
          name: document.name || 'document',
        } as any;
        formData.append('document', documentFile);
      }
    } else {
      formData.append('topic', topic);
    }
    
    formData.append('num_cards', numCards.toString());
    
    const response = await api.post('/flashcards/generate/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to generate flashcards');
  }
};

/**
 * Generate comprehensive study material from document or text
 * Extracts: Topics, Concepts, Study Notes, Sample Questions
 * @param text - Text content (for direct text input)
 * @param document - Optional document file (.txt, .jpg, .png, .pdf)
 */
export const generateStudyMaterial = async (
  text?: string,
  document?: any
) => {
  try {
    const formData = new FormData();
    
    if (document) {
      // For web, document might already be a File object
      if (Platform.OS === 'web' && document.file) {
        formData.append('document', document.file);
      } else if (Platform.OS === 'web' && document instanceof File) {
        formData.append('document', document);
      } else {
        // For mobile platforms
        const documentFile = {
          uri: document.uri,
          type: document.mimeType || document.type || 'application/octet-stream',
          name: document.name || 'document',
        } as any;
        formData.append('document', documentFile);
      }
    } else if (text) {
      formData.append('text', text);
    } else {
      throw new Error('Please provide either text or a document');
    }
    
    const response = await api.post('/study-material/generate/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to generate study material');
  }
};

/**
 * Summarize YouTube video
 * @param videoUrl - YouTube video URL
 * @param useDemo - Use demo mode for testing UI (optional)
 */
export const summarizeYouTubeVideo = async (videoUrl: string, useDemo: boolean = false) => {
  try {
    const url = useDemo ? '/youtube/summarize/?demo=true' : '/youtube/summarize/';
    const response = await api.post(url, {
      video_url: videoUrl,
    }, {
      timeout: 60000, // 60 seconds for real video processing
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to summarize video');
  }
};

/**
 * Check YouTube summarizer service health
 */
export const checkYouTubeHealth = async () => {
  try {
    const response = await api.get('/youtube/health/');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'YouTube health check failed');
  }
};

/**
 * Generate predicted important questions from topic or document
 * @param topic - Topic name (for text-based generation)
 * @param examType - Type of exam (General, JEE, NEET, etc.)
 * @param numQuestions - Number of questions (default: 5)
 * @param document - Optional document file
 */
export const generatePredictedQuestions = async (
  topic?: string,
  examType: string = 'General',
  numQuestions: number = 5,
  document?: any
) => {
  try {
    const formData = new FormData();
    
    if (document) {
      // For web, document might already be a File object
      if (Platform.OS === 'web' && document.file) {
        formData.append('document', document.file);
      } else if (Platform.OS === 'web' && document instanceof File) {
        formData.append('document', document);
      } else {
        // For mobile platforms
        const documentFile = {
          uri: document.uri,
          type: document.mimeType || document.type || 'application/octet-stream',
          name: document.name || 'document',
        } as any;
        formData.append('document', documentFile);
      }
    } else if (topic) {
      formData.append('topic', topic);
    } else {
      throw new Error('Please provide either a topic or document');
    }
    
    formData.append('exam_type', examType);
    formData.append('num_questions', numQuestions.toString());
    
    const response = await api.post('/predicted-questions/generate/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for AI generation
    });
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to generate predicted questions');
  }
};

/**
 * SUBSCRIPTION & PRICING APIs
 */

/**
 * Get user's current subscription status
 * @param userId - Unique user identifier (device ID or email)
 */
export const getSubscriptionStatus = async (userId: string) => {
  try {
    const response = await api.get('/subscription/status/', {
      params: { user_id: userId }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to get subscription status');
  }
};

/**
 * Upgrade user to premium plan
 * @param userId - User identifier
 * @param autoPayEnabled - Enable auto-pay renewal
 * @param paymentMethod - Payment method (card, upi, wallet)
 */
export const upgradeToPremium = async (
  userId: string,
  autoPayEnabled: boolean = true,
  paymentMethod: string = 'card'
) => {
  try {
    const response = await api.post('/subscription/upgrade/', {
      user_id: userId,
      auto_pay_enabled: autoPayEnabled,
      payment_method: paymentMethod,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to upgrade plan');
  }
};

/**
 * Manage auto-pay settings
 * @param userId - User identifier
 * @param enable - Enable or disable auto-pay
 */
export const manageAutoPay = async (userId: string, enable: boolean) => {
  try {
    const response = await api.post('/subscription/autopay/', {
      user_id: userId,
      enable: enable,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to manage auto-pay');
  }
};

/**
 * Check if user can access a feature
 * @param userId - User identifier
 * @param feature - Feature name (ask_questions, quiz, flashcards)
 */
export const checkFeatureAccess = async (userId: string, feature: string) => {
  try {
    const response = await api.get('/subscription/feature-access/', {
      params: {
        user_id: userId,
        feature: feature,
      }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to check feature access');
  }
};

/**
 * Log feature usage
 * @param userId - User identifier
 * @param feature - Feature name
 * @param type - Usage type (image, text, file)
 * @param inputSize - Size of input in characters/bytes
 */
export const logFeatureUsage = async (
  userId: string,
  feature: string,
  type: string = 'text',
  inputSize: number = 0
) => {
  try {
    const response = await api.post('/subscription/log-usage/', {
      user_id: userId,
      feature: feature,
      type: type,
      input_size: inputSize,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to log usage');
  }
};

/**
 * Get user's billing history
 * @param userId - User identifier
 */
export const getBillingHistory = async (userId: string) => {
  try {
    const response = await api.get('/subscription/billing-history/', {
      params: { user_id: userId }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to get billing history');
  }
};

/**
 * Daily Quiz API
 */

/**
 * Get today's Daily Quiz
 * @param userId - User identifier
 */
export const getDailyQuiz = async (userId: string) => {
  try {
    const response = await api.get('/daily-quiz/', {
      params: { user_id: userId }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to get Daily Quiz');
  }
};

/**
 * Start the Daily Quiz and award participation coins
 * @param userId - User identifier
 * @param quizId - Quiz id returned from getDailyQuiz
 */
export const startDailyQuiz = async (userId: string, quizId: string) => {
  try {
    const response = await api.post('/daily-quiz/start/', {
      user_id: userId,
      quiz_id: quizId,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to start Daily Quiz');
  }
};

/**
 * Submit Daily Quiz answers
 * @param userId - User identifier
 * @param quizId - Quiz ID
 * @param answers - User's answers {question_id: option_index} e.g. {"1": 0, "2": 2}
 * @param timeTaken - Time taken in seconds
 */
export const submitDailyQuiz = async (
  userId: string,
  quizId: string,
  answers: Record<string, number>,
  timeTaken: number
) => {
  try {
    console.log('Submitting quiz:', { userId, quizId, answers, timeTaken });
    const response = await api.post('/daily-quiz/submit/', {
      user_id: userId,
      quiz_id: quizId,
      answers: answers,
      time_taken_seconds: timeTaken,
    });
    console.log('Submit response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Submit error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Failed to submit quiz');
  }
};

/**
 * Get user's coin balance and stats
 * @param userId - User identifier
 */
export const getUserCoins = async (userId: string) => {
  try {
    const response = await api.get('/daily-quiz/coins/', {
      params: { user_id: userId }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to get coins');
  }
};

/**
 * Get user's quiz history
 * @param userId - User identifier
 * @param limit - Number of records to fetch
 */
export const getQuizHistory = async (userId: string, limit: number = 30) => {
  try {
    const response = await api.get('/daily-quiz/history/', {
      params: { user_id: userId, limit: limit }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to get quiz history');
  }
};

export default api;

