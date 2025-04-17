// src/utils/aiConfig.js

// AI Providers enum
export const AI_PROVIDERS = {
  GROK: 'grok',
  OLLAMA: 'ollama',
  TOGETHER: 'together'
};

// Provider configurations
export const PROVIDER_CONFIGS = {
  [AI_PROVIDERS.GROK]: {
    name: 'Grok AI',
    description: 'Local AI service using Grok. Best for privacy and offline use.',
    defaultModel: 'grok-1',
    apiUrl: process.env.REACT_APP_GROK_API_URL || 'http://localhost:3000/api/generate',
    requiresApiKey: false
  },
  [AI_PROVIDERS.OLLAMA]: {
    name: 'Ollama (Legacy)',
    description: 'Local AI service using Ollama. Currently not in use.',
    defaultModel: 'mistral',
    apiUrl: process.env.REACT_APP_OLLAMA_BASE_URL || 'http://localhost:11434',
    requiresApiKey: false
  },
  [AI_PROVIDERS.TOGETHER]: {
    name: 'Together AI',
    description: 'Cloud-based AI service with powerful models. Requires API key.',
    defaultModel: 'mixtral-8x7b',
    apiUrl: 'https://api.together.xyz/v1/completions',
    requiresApiKey: true
  }
};

// Default provider
const defaultProvider = AI_PROVIDERS.GROK;

// Get current provider from env or use default
const getCurrentProvider = () => {
  const envProvider = process.env.REACT_APP_AI_PROVIDER;
  const key = Object.values(AI_PROVIDERS).includes(envProvider) 
    ? envProvider 
    : defaultProvider;
    
  return {
    key,
    ...PROVIDER_CONFIGS[key]
  };
};

// Check if API key is configured for providers that need it
const isApiKeyConfigured = () => {
  const provider = getCurrentProvider();
  
  if (!provider.requiresApiKey) return true;
  
  switch (provider.key) {
    case AI_PROVIDERS.TOGETHER:
      return !!process.env.REACT_APP_TOGETHER_API_KEY;
    default:
      return true;
  }
};

// Generate text with the configured provider
const generateText = async (prompt, options = {}) => {
  const provider = getCurrentProvider();
  
  try {
    switch (provider.key) {
      case AI_PROVIDERS.GROK:
        return await generateWithGrok(prompt, options);
      case AI_PROVIDERS.OLLAMA:
        // Ollama is disabled - fallback to Grok
        console.warn('Ollama is disabled. Falling back to Grok.');
        return await generateWithGrok(prompt, options);
      case AI_PROVIDERS.TOGETHER:
        return await generateWithTogetherAI(prompt, options);
      default:
        throw new Error(`Unknown provider: ${provider.key}`);
    }
  } catch (error) {
    console.error(`Error generating text with ${provider.name}:`, error);
    throw error;
  }
};

// Generate text with Grok
const generateWithGrok = async (prompt, options = {}) => {
  const config = PROVIDER_CONFIGS[AI_PROVIDERS.GROK];
  
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      max_tokens: options.maxTokens || 500,
      temperature: options.temperature || 0.7
    })
  });
  
  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.text || data.output || data.response || '';
};

// Generate text with Together AI
const generateWithTogetherAI = async (prompt, options = {}) => {
  const config = PROVIDER_CONFIGS[AI_PROVIDERS.TOGETHER];
  const apiKey = process.env.REACT_APP_TOGETHER_API_KEY;
  
  if (!apiKey) {
    throw new Error('Together AI API key not configured');
  }
  
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: options.model || config.defaultModel,
      prompt,
      max_tokens: options.maxTokens || 500,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
    })
  });
  
  if (!response.ok) {
    throw new Error(`Together AI API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.text || '';
};

export default {
  AI_PROVIDERS,
  PROVIDER_CONFIGS,
  currentProvider: getCurrentProvider(),
  isApiKeyConfigured,
  generateText
};