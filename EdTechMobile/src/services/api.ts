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

export default api;
