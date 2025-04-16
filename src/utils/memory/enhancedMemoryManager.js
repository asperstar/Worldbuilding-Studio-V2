// src/utils/memory/enhancedMemoryManager.js
import { addMemory, getCharacterMemories } from './memoryManager';

/**
 * Get the most relevant memories for the current conversation context
 * Enhanced with support for campaign-specific memories
 */
export const getEnhancedContextMemories = async (characterId, currentContext, conversationHistory, options = {}) => {
  try {
    // Get all character memories
    const allMemories = await getCharacterMemories(characterId);
    
    if (!allMemories || allMemories.length === 0) {
      return [];
    }
    
    // Combine current message and recent conversation history for context
    let combinedContext = currentContext;
    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-3).map(msg => msg.text).join(' ');
      combinedContext += ' ' + recentMessages;
    }
    
    // Add campaign context if provided
    if (options.campaignContext) {
      combinedContext += ` Campaign: ${options.campaignContext.name}. Scene: ${
        options.campaignContext.currentScene?.title || 'Current scene'
      }. ${options.campaignContext.currentScene?.description || ''}`;
    }

    // Filter for campaign-specific memories if campaignId is provided
    let memoriesToProcess = allMemories;
    if (options.campaignId) {
      const campaignTag = `[Campaign: ${options.campaignId}]`;
      const campaignMemories = allMemories.filter(memory => 
        memory.content && memory.content.includes(campaignTag)
      );
      
      if (campaignMemories.length > 0) {
        const generalMemories = allMemories
          .filter(memory => !memory.content.includes('[Campaign:'))
          .slice(0, 5);
        memoriesToProcess = [...campaignMemories, ...generalMemories];
      }
    }

    // Simple relevance scoring algorithm
    const scoredMemories = memoriesToProcess.map(memory => {
      const content = memory.content || '';
      const contentWords = content.toLowerCase().split(/\s+/);
      const contextWords = combinedContext.toLowerCase().split(/\s+/);
      
      // Calculate similarity (number of matching words)
      let matchCount = 0;
      contextWords.forEach(word => {
        if (word.length > 3 && contentWords.includes(word)) {
          matchCount++;
        }
      });
      
      // Calculate relevance score
      const score = contextWords.length > 0 
        ? matchCount / Math.min(contextWords.length, 10) * 10 
        : 5; // Default mid-relevance
      
      return {
        ...memory,
        score,
        summary: content.length > 50 ? content.substring(0, 47) + '...' : content
      };
    });
    
    // Sort by relevance score and return top memories
    const relevantMemories = scoredMemories
      .sort((a, b) => {
        // Prioritize by score, then by importance
        if (Math.abs(b.score - a.score) > 1) {
          return b.score - a.score;
        }
        return (b.metadata?.importance || 0) - (a.metadata?.importance || 0);
      })
      .slice(0, 7); // Limit to 7 most relevant memories
    
    return relevantMemories;
  } catch (error) {
    console.error('Error getting enhanced context memories:', error);
    return allMemories.slice(0, 5); // Fallback to first 5 memories
  }
};

/**
 * Extracts insights from a conversation and stores them as memories
 */
export const extractConversationInsights = async (characterId, conversation, characterName) => {
  try {
    const conversationText = conversation.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
    
    // Create a simple insight based on conversation keywords
    // (In a full implementation, you'd use an AI API here)
    let insight = `${characterName} had a conversation`;
    
    // Extract potential insights based on keywords
    const fullText = conversationText.toLowerCase();
    
    if (fullText.includes('like') || fullText.includes('enjoy') || fullText.includes('love')) {
      insight = `${characterName} expressed preferences in a conversation`;
    } else if (fullText.includes('sad') || fullText.includes('happy') || fullText.includes('angry')) {
      insight = `${characterName} expressed emotions in a conversation`;
    } else if (fullText.includes('remember') || fullText.includes('forgot') || fullText.includes('recall')) {
      insight = `${characterName} discussed memories in a conversation`;
    } else if (fullText.includes('should') || fullText.includes('must') || fullText.includes('need to')) {
      insight = `${characterName} discussed obligations or requirements`;
    }
    
    // Add the last exchange to provide context
    const lastUserMsg = conversation.filter(msg => msg.sender === 'user').pop();
    const lastCharMsg = conversation.filter(msg => msg.sender === 'character').pop();
    
    if (lastUserMsg && lastCharMsg) {
      insight += `: User said "${lastUserMsg.text.substring(0, 30)}..." and ${characterName} responded "${lastCharMsg.text.substring(0, 30)}..."`;
    }

    // Store the insight as a memory
    await addMemory(
      characterId,
      insight,
      'conversation_insight',
      6,
      { timestamp: new Date().toISOString(), characterId }
    );

    return insight;
  } catch (error) {
    console.error('Error extracting conversation insights:', error);
    return null;
  }
};

/**
 * Enriches the campaign context with relevant memories
 */
export const enrichCampaignContext = async (campaignId, campaignContext) => {
  try {
    // Get all memories for the GM
    const memories = await getCharacterMemories('GM');
    
    // Filter for campaign-specific memories
    const campaignMemories = memories.filter(memory => 
      memory.content && memory.content.includes(`[Campaign: ${campaignId}]`)
    );
    
    // Format the memories as a string
    const memoryText = campaignMemories
      .sort((a, b) => (b.metadata?.importance || 0) - (a.metadata?.importance || 0))
      .slice(0, 5)
      .map(memory => {
        const content = memory.content.replace(`[Campaign: ${campaignId}]`, '').trim();
        return `- ${content} (${memory.metadata?.type || 'memory'})`;
      })
      .join('\n');
    
    // Add memories to the context
    return {
      ...campaignContext,
      importantMemories: memoryText
    };
  } catch (error) {
    console.error('Error enriching campaign context:', error);
    return campaignContext;
  }
};

/**
 * Processes a campaign interaction to store it as a memory
 */
export const processCampaignInteraction = async (campaignId, characterId, characterName, messageText, participantIds) => {
  try {
    const content = `[Campaign: ${campaignId}] Interaction by ${characterName}: ${messageText}`;
    await addMemory(
      characterId,
      content,
      'campaign_interaction',
      7,
      { timestamp: new Date().toISOString(), characterId, campaignId, participants: participantIds }
    );
    return true;
  } catch (error) {
    console.error('Error processing campaign interaction:', error);
    return false;
  }
};