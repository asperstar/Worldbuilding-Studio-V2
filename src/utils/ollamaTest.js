// src/utils/ollamaTest.js
/**
 * Utility to test Ollama connectivity
 */

import ollamaService from './ollamaService';

export const testOllamaConnection = async () => {
  try {
    const testRequest = await fetch(`${ollamaService.baseUrl}/api/tags`, {
      method: 'GET'
    });
    
    if (!testRequest.ok) {
      return {
        connected: false,
        error: `Error ${testRequest.status}: ${testRequest.statusText}`
      };
    }
    
    const response = await testRequest.json();
    
    // Check if Mistral model is available
    const hasMistral = response.models?.some(model => 
      model.name.toLowerCase().includes('mistral')
    );
    
    return {
      connected: true,
      availableModels: response.models?.map(model => model.name) || [],
      hasMistral
    };
  } catch (error) {
    console.error('Ollama connection test failed:', error);
    
    return {
      connected: false,
      error: error.message,
      suggestion: "Make sure Ollama is running. You can start it with 'ollama serve' command."
    };
  }
};

export const testOllamaGeneration = async () => {
  try {
    const response = await fetch(`${ollamaService.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ollamaService.model,
        prompt: 'Reply with "Ollama is working correctly!" if you can see this message.',
        options: {
          temperature: 0.1,
          num_predict: 20
        }
      })
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `Error ${response.status}: ${response.statusText}`
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      response: data.response,
      model: ollamaService.model
    };
  } catch (error) {
    console.error('Ollama generation test failed:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Use this function to check if Mistral model is available
export const ensureMistralAvailable = async () => {
  try {
    const tagsResponse = await fetch(`${ollamaService.baseUrl}/api/tags`, {
      method: 'GET'
    });
    
    if (!tagsResponse.ok) {
      return {
        available: false,
        error: `Error ${tagsResponse.status}: ${tagsResponse.statusText}`
      };
    }
    
    const tags = await tagsResponse.json();
    
    // Check if any model name contains "mistral"
    const hasMistral = tags.models?.some(model => 
      model.name.toLowerCase().includes('mistral')
    );
    
    if (!hasMistral) {
      return {
        available: false,
        message: 'Mistral model not found',
        suggestion: 'Run "ollama pull mistral" to download the model'
      };
    }
    
    return {
      available: true,
      models: tags.models?.filter(model => 
        model.name.toLowerCase().includes('mistral')
      )
    };
  } catch (error) {
    console.error('Error checking Mistral availability:', error);
    
    return {
      available: false,
      error: error.message
    };
  }
};