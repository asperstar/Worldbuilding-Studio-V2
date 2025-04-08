// src/utils/apiOptimization.js
export const estimateTokenUsage = (text) => {
    // Claude API roughly uses 1 token per 4 characters
    return Math.ceil(text.length / 4);
  };
  
  export const optimizePrompt = (character, conversationHistory, userMessage) => {
    const maxTokens = 1500; // Set a reasonable limit
    
    // Start with essential context
    let optimizedPrompt = `You are roleplaying as ${character.name}.\n\n`;
    optimizedPrompt += `Character traits: ${character.personality || ''} ${character.traits || ''}\n`;
    
    // Add the user's current message
    optimizedPrompt += `\nUser's message: "${userMessage}"\n\n`;
    
    // Estimate token count so far
    let tokenCount = estimateTokenUsage(optimizedPrompt);
    
    // Add as much conversation history as will fit
    const conversationLines = conversationHistory.split('\n').reverse(); // Start with most recent
    const includedHistory = [];
    
    for (const line of conversationLines) {
      const lineTokens = estimateTokenUsage(line);
      if (tokenCount + lineTokens < maxTokens) {
        includedHistory.unshift(line); // Add to the front since we reversed earlier
        tokenCount += lineTokens;
      } else {
        break;
      }
    }
    
    if (includedHistory.length > 0) {
      optimizedPrompt += `Recent conversation:\n${includedHistory.join('\n')}\n\n`;
    }
    
    // Add reminders to stay in character
    optimizedPrompt += `Please respond as ${character.name} would, staying in character.`;
    
    return optimizedPrompt;
  };
  
  // Rate limiting to prevent excessive API calls
  const apiCallTimestamps = [];
  const MAX_CALLS_PER_MINUTE = 10;
  const MINUTE_IN_MS = 60 * 1000;
  
  export const checkRateLimit = () => {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    while (apiCallTimestamps.length > 0 && apiCallTimestamps[0] < now - MINUTE_IN_MS) {
      apiCallTimestamps.shift();
    }
    
    return apiCallTimestamps.length < MAX_CALLS_PER_MINUTE;
  };
  
  export const recordApiCall = () => {
    apiCallTimestamps.push(Date.now());
  };