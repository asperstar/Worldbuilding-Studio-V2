// src/utils/memory/campaignMemoryManager.js
import { addMemory, getRelevantMemories, getTimeAgo  } from './memoryManager';

// Store campaign-specific memories
export const addCampaignMemory = async (characterId, campaignId, content, type, importance = 6) => {
  // Tag memory with campaign ID
  const taggedContent = `[Campaign: ${campaignId}] ${content}`;
  return await addMemory(characterId, taggedContent, type, importance);
};

// Get memories relevant to current campaign
export const getCampaignMemories = async (characterId, campaignId, currentContext) => {
  try {
    const memories = await getRelevantMemories(characterId, currentContext);
    
    console.log('Retrieved memories:', typeof memories, Array.isArray(memories) ? 'is array' : 'not array', memories);
    
    // Validate memories
    if (!Array.isArray(memories)) {
      console.warn(`Memories is not an array. Type: ${typeof memories}`);
      return ''; // Return empty string as fallback
    }
    
    // Filter for campaign-specific memories
    const campaignMemories = memories.filter(memory => 
      memory && memory.content && memory.content.includes(`[Campaign: ${campaignId}]`)
    );
    
    // Also include some general memories that don't have campaign tag
    const generalMemories = memories.filter(memory => 
      memory && memory.content && !memory.content.includes('[Campaign:')
    ).slice(0, 3); // Just get top 3 general memories
    
    // Format memories with timeAgo
    return [...campaignMemories, ...generalMemories].map(memory => {
      const timeAgo = getTimeAgo(memory.timestamp);
      return `- (${memory.type}, ${timeAgo}) ${memory.content}`;
    }).join('\n');
    
  } catch (error) {
    console.error('Error getting campaign memories:', error);
    return '';
  }
};

/**
 * Process and store character interactions in a campaign
 * This will create memories for both the speaking character and witnesses
 */
export const processCampaignInteraction = async (
  campaignId,
  speakingCharacterId,
  speakingCharacterName,
  message,
  witnessIds = []
) => {
  // Create memory for the speaking character
  await addCampaignMemory(
    speakingCharacterId,
    campaignId,
    `I said: "${message}"`,
    'ACTION',
    7 // High importance for their own actions
  );
  
  // Create memories for all witnesses
  for (const witnessId of witnessIds) {
    if (witnessId !== speakingCharacterId) {
      await addCampaignMemory(
        witnessId,
        campaignId,
        `${speakingCharacterName} said: "${message}"`,
        'OBSERVATION',
        5 // Medium importance for witnessed events
      );
    }
  }
};

/**
 * Enhanced campaign memory retrieval
 * Gets memories that are more relevant to character interactions
 */
export const getEnhancedCampaignMemories = async (characterId, campaignId, currentContext) => {
  try {
    // Get basic campaign memories
    const basicMemories = await getCampaignMemories(characterId, campaignId, currentContext);
    
    // Additional context to prioritize personal actions and observations
    const enhancedContext = currentContext + " character interactions personality behavior";
    
    // Get memories specifically about character interactions
    const interactionMemories = await getSpecificCampaignMemories(
      characterId, 
      campaignId,
      enhancedContext,
      ['ACTION', 'OBSERVATION']
    );
    
    // Combine and deduplicate memories
    const combinedMemories = [...new Set([...basicMemories.split('\n'), ...interactionMemories])];
    
    return combinedMemories.join('\n');
  } catch (error) {
    console.error('Error getting enhanced campaign memories:', error);
    return '';
  }
};

/**
 * Get specific types of memories for a campaign
 */
export const getSpecificCampaignMemories = async (
  characterId, 
  campaignId, 
  context, 
  memoryTypes = []
) => {
  try {
    // Import the necessary functions
    const { getRelevantMemoriesByType } = await import('./memoryManager');
    
    // Get memories filtered by type
    const memories = await getRelevantMemoriesByType(
      characterId,
      context,
      memoryTypes
    );
    
    // Filter for campaign-specific memories
    const campaignMemories = memories.filter(memory => 
      memory.content.includes(`[Campaign: ${campaignId}]`)
    );
    
    return campaignMemories.map(memory => memory.content).join('\n');
  } catch (error) {
    console.error('Error getting specific campaign memories:', error);
    return '';
  }
};

/**
 * Process conversation to extract campaign memories and important information
 */
export const processCampaignConversation = async (
  campaignId, 
  characterId, 
  userMessage, 
  characterResponse
) => {
  // Store the conversation exchange
  await addCampaignMemory(
    characterId,
    campaignId,
    `In response to "${userMessage}", I said "${characterResponse}"`,
    'CONVERSATION',
    5
  );
  
  // Check for potentially important information
  const combinedText = `${userMessage} ${characterResponse}`.toLowerCase();
  
  if (combinedText.includes('promise') || 
      combinedText.includes('swear') ||
      combinedText.includes('never forget')) {
    await addCampaignMemory(
      characterId,
      campaignId,
      `Important: There was a promise or commitment made in this conversation: "${userMessage}" -> "${characterResponse}"`,
      'FACT',
      8
    );
  }
};