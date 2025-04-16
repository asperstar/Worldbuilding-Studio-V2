// src/utils/grokSetup.js
import { createXai } from '@ai-sdk/xai';

// Initialize Grok model
export const createGrokModel = () => {
  if (!process.env.XAI_API_KEY) {
    console.error("XAI_API_KEY is not set in environment variables!");
    return null;
  }
  return createXai({ apiKey: process.env.XAI_API_KEY })('grok-3');
};

export default createGrokModel;