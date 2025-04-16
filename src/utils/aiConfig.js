// src/utils/aiConfig.js
/**
 * Configuration settings for AI providers
 * This allows easy switching between local and production AI providers
 */

// Default provider based on environment
const DEFAULT_PROVIDER = process.env.NODE_ENV === 'production' 
  ? 'together' 
  : 'ollama';

// Configurable through .env file
const CONFIGURED_PROVIDER = process.env.REACT_APP_AI_PROVIDER || DEFAULT_PROVIDER;

// Available AI providers
export const AI_PROVIDERS = {
  OLLAMA: 'ollama',
  TOGETHER: 'together',
  OPENAI: 'openai'
};

// Provider-specific settings
export const PROVIDER_CONFIGS = {
  [AI_PROVIDERS.OLLAMA]: {
    name: 'Ollama (Local)',
    baseUrl: process.env.REACT_APP_OLLAMA_BASE_URL || 'http://localhost:11434',
    defaultModel: process.env.REACT_APP_OLLAMA_MODEL || 'mistral',
    requiresApiKey: false,
    maxContextLength: 8192, // Approximate, depends on model
    supportsStreaming: true,
    endpointPath: '/api/generate',
    description: 'Local AI using Ollama. Requires Ollama to be running.'
  },
  [AI_PROVIDERS.TOGETHER]: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'mistralai/Mistral-7B-Instruct-v0.2',
    modelOptions: [
      'mistralai/Mistral-7B-Instruct-v0.2',
      'meta-llama/Llama-2-70b-chat-hf'
    ],
    requiresApiKey: true,
    apiKeyEnvVar: 'REACT_APP_TOGETHER_API_KEY',
    maxContextLength: 8192,
    supportsStreaming: true,
    endpointPath: '/completions',
    description: 'Production-ready AI with good context handling and minimal content filtering.'
  },
  [AI_PROVIDERS.OPENAI]: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-3.5-turbo',
    modelOptions: [
      'gpt-3.5-turbo',
      'gpt-4',
      'gpt-4-turbo'
    ],
    requiresApiKey: true,
    apiKeyEnvVar: 'REACT_APP_OPENAI_API_KEY',
    maxContextLength: 16384, // For gpt-4-turbo
    supportsStreaming: true,
    endpointPath: '/chat/completions',
    description: 'High quality but more strictly moderated content. Not recommended for morally ambiguous roleplay.'
  }
};

// Helper to get current AI provider settings
export const getCurrentProvider = () => {
  const providerKey = Object.values(AI_PROVIDERS).includes(CONFIGURED_PROVIDER) 
    ? CONFIGURED_PROVIDER 
    : DEFAULT_PROVIDER;
    
  return {
    key: providerKey,
    ...PROVIDER_CONFIGS[providerKey]
  };
};

// Check if API key is configured for providers that require one
export const isApiKeyConfigured = () => {
  const provider = getCurrentProvider();
  
  if (!provider.requiresApiKey) return true;
  
  const apiKey = process.env[provider.apiKeyEnvVar];
  return !!apiKey;
};

// Export current provider
export const currentProvider = getCurrentProvider();

export default {
  getCurrentProvider,
  isApiKeyConfigured,
  AI_PROVIDERS,
  currentProvider
};