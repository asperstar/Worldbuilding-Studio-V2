// src/utils/apiProvider.js
import ollamaService from './ollamaService';
import togetherAIService from './togetherAIService';

/**
 * API Provider that handles selecting the appropriate AI service
 * based on environment and availability
 */
class ApiProvider {
  constructor() {
    this.services = {
      ollama: ollamaService,
      together: togetherAIService
    };

    // Default to Together AI in production, Ollama in development
    this.defaultService = process.env.NODE_ENV === 'production' 
      ? 'together' 
      : 'ollama';
    
    // Can be overridden by environment variable
    this.preferredService = process.env.REACT_APP_PREFERRED_AI_SERVICE || this.defaultService;
    
    console.log(`API Provider initialized with preferred service: ${this.preferredService}`);
  }

  /**
   * Set the preferred service to use
   * @param {string} serviceName - 'ollama' or 'together'
   */
  setPreferredService(serviceName) {
    if (this.services[serviceName]) {
      this.preferredService = serviceName;
      console.log(`Switched to ${serviceName} service`);
      return true;
    }
    return false;
  }

  /**
   * Get the current service
   * @returns {Object} The service object
   */
  getCurrentService() {
    return this.services[this.preferredService];
  }

  /**
   * Generate a character response using the preferred service
   * Falls back to alternative service if preferred service fails
   */
  async generateCharacterResponse(character, userMessage, conversationHistory = [], options = {}) {
    const primaryService = this.services[this.preferredService];
    const fallbackService = this.services[this.preferredService === 'ollama' ? 'together' : 'ollama'];
    
    try {
      // Try the preferred service first
      return await primaryService.generateCharacterResponse(
        character, 
        userMessage, 
        conversationHistory, 
        options
      );
    } catch (error) {
      console.warn(`Error with ${this.preferredService} service:`, error.message);
      
      // Only try fallback in development or if explicitly allowed
      if (process.env.NODE_ENV !== 'production' || process.env.REACT_APP_ALLOW_FALLBACK === 'true') {
        console.log(`Falling back to ${this.preferredService === 'ollama' ? 'together' : 'ollama'} service`);
        
        try {
          return await fallbackService.generateCharacterResponse(
            character, 
            userMessage, 
            conversationHistory, 
            options
          );
        } catch (fallbackError) {
          console.error('Fallback service also failed:', fallbackError);
          throw new Error(`Both services failed: ${error.message} and ${fallbackError.message}`);
        }
      } else {
        // In production, just throw the original error if fallback isn't allowed
        throw error;
      }
    }
  }

  /**
   * Check if the current preferred service is available
   * @returns {Promise<boolean>} Whether the service is available
   */
  async isServiceAvailable() {
    const service = this.services[this.preferredService];
    
    if (this.preferredService === 'ollama') {
      try {
        const response = await fetch(`${service.baseUrl}/api/tags`, { 
          method: 'GET',
          timeout: 2000 // Short timeout for quick check
        });
        return response.ok;
      } catch (error) {
        console.warn('Ollama service not available:', error.message);
        return false;
      }
    } else if (this.preferredService === 'together') {
      // Together API should be available if key is set
      return !!service.apiKey;
    }
    
    return false;
  }

  /**
   * Initialize the provider by checking service availability
   * and switching to available service if needed
   */
  async initialize() {
    const isAvailable = await this.isServiceAvailable();
    
    if (!isAvailable) {
      const alternativeService = this.preferredService === 'ollama' ? 'together' : 'ollama';
      console.warn(`${this.preferredService} service not available, trying ${alternativeService}`);
      
      const isAlternativeAvailable = await this.isServiceAvailable(alternativeService);
      
      if (isAlternativeAvailable) {
        this.setPreferredService(alternativeService);
        return { success: true, service: alternativeService, message: `Switched to ${alternativeService}` };
      } else {
        return { 
          success: false, 
          message: 'No AI service available. Please check your configuration.' 
        };
      }
    }
    
    return { success: true, service: this.preferredService };
  }
}

export default new ApiProvider();