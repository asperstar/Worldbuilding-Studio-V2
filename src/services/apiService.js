import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// Centralized error handler
const handleApiError = (error) => {
  console.error('API Error Details:', error);
  
  if (error.response) {
    switch(error.response.status) {
      case 500:
        return { 
          error: true, 
          message: 'Server error. Our characters are having a momentary existential crisis.' 
        };
      case 403:
        return { 
          error: true, 
          message: 'Access denied. Check API configurations.' 
        };
      case 404:
        return { 
          error: true, 
          message: 'Character communication channel not found.' 
        };
      default:
        return { 
          error: true, 
          message: `Unexpected error: ${error.response.status}` 
        };
    }
  } else if (error.request) {
    return { 
      error: true, 
      message: 'No response from character. Check your network connection.' 
    };
  } else {
    return { 
      error: true, 
      message: 'Failed to initiate character communication.' 
    };
  }
};

export const CharacterChatService = {
  async sendMessage(payload, retries = 2) {
    try {
      const response = await axios.post(`${API_BASE_URL}/claude-api`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 second timeout
      });
      
      return {
        error: false,
        data: response.data
      };
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying API call. Attempts left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return this.sendMessage(payload, retries - 1);
      }
      
      return handleApiError(error);
    }
  }
};

// Logging utility
export const LogService = {
  log(context, data) {
    console.log(`[${new Date().toISOString()}] ${context}:`, data);
    // In production, you might want to send logs to a server
  },
  error(context, error) {
    console.error(`[${new Date().toISOString()}] ERROR - ${context}:`, error);
  }
};