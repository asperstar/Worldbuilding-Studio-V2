// src/utils/memory/memoryManager.js
import { storeMemory, retrieveMemories, deleteMemory, getAllMemories } from './vectorDb';

// Types of memories we'll store
export const MEMORY_TYPES = {
  FACT: 'fact',          // Something the character learned
  EVENT: 'event',        // Something that happened
  PREFERENCE: 'preference', // User likes/dislikes
  RELATIONSHIP: 'relationship', // How characters relate to each other
  CONVERSATION: 'conversation'  // Snippet of past conversation
};

/**
 * Store a new memory for a character
 */
export async function addMemory(characterId, content, type, importance = 5) {
  return await storeMemory(characterId, content, {
    type,
    importance,
    timestamp: new Date().toISOString()
  });
}
export async function getRelevantMemoriesByType(characterId, currentContext, types = []) {
  // Get all relevant memories
  const allMemories = await retrieveMemories(characterId, currentContext);
  
  // If no type filter, return all memories
  if (!types || types.length === 0) {
    return allMemories;
  }
  
  // Filter memories by requested types
  const typesUppercase = types.map(t => t.toUpperCase());
  const filteredMemories = allMemories.filter(memory => 
    typesUppercase.includes(memory.type?.toUpperCase())
  );
  
  return filteredMemories;
}

/**
 * Process and extract important information from character interactions
 */
export async function processCharacterInteraction(characterId, interaction) {
  if (!interaction || !interaction.content) return;
  
  const content = interaction.content;
  const lowercaseContent = content.toLowerCase();
  
  // Extract potential facts, preferences, or relationship info
  
  // Check for character opinions
  if (lowercaseContent.includes('think') || 
      lowercaseContent.includes('feel') || 
      lowercaseContent.includes('opinion')) {
    // Extract potential opinion
    await addMemory(
      characterId,
      `Opinion expressed: ${content}`,
      MEMORY_TYPES.PREFERENCE,
      7
    );
  }
  if (lowercaseContent.includes('always') || 
      lowercaseContent.includes('never') || 
      lowercaseContent.includes('usually')) {
    // Extract potential trait
    await addMemory(
      characterId,
      `Potential trait/pattern: ${content}`,
      MEMORY_TYPES.FACT,
      6
    );
  }
  
  // Check for relationships
  if (lowercaseContent.includes('friend') || 
      lowercaseContent.includes('enemy') || 
      lowercaseContent.includes('ally') ||
      lowercaseContent.includes('hate') ||
      lowercaseContent.includes('love')) {
    // Extract potential relationship
    await addMemory(
      characterId,
      `Relationship note: ${content}`,
      MEMORY_TYPES.RELATIONSHIP,
      8
    );
  }
}

export async function getPersonalityMemories(characterId) {
  const personalityContext = "personality traits behavior patterns opinions preferences";
  
  // Retrieve memories related to personality
  const memories = await retrieveMemories(characterId, personalityContext);
  
  // Prioritize PREFERENCE and RELATIONSHIP memories
  const sortedMemories = memories.sort((a, b) => {
    // Prioritize by type
    const typeOrder = {
      'PREFERENCE': 1,
      'RELATIONSHIP': 2,
      'FACT': 3,
      'EVENT': 4,
      'CONVERSATION': 5
    };
    
    const aTypeOrder = typeOrder[a.type] || 99;
    const bTypeOrder = typeOrder[b.type] || 99;
    
    if (aTypeOrder !== bTypeOrder) {
      return aTypeOrder - bTypeOrder;
    }
    
    // If same type, prioritize by importance
    return (b.importance || 0) - (a.importance || 0);
  });
  
  return sortedMemories;
}



/**
 * Get relevant memories for the current conversation
 */
export async function getRelevantMemories(characterId, currentContext) {
  try {
    const memories = await retrieveMemories(characterId, currentContext);
    
    if (!Array.isArray(memories)) {
      console.warn(`Retrieved memories is not an array for character ${characterId}.`);
      return "";
    }
    
    if (memories.length === 0) return "";
    
    // Format memories into a string for the prompt
    const formattedMemories = memories.map(memory => {
      const timeAgo = getTimeAgo(memory.timestamp);
      return `- (${memory.type}, ${timeAgo}) ${memory.content}`;
    }).join('\n');
    
    return formattedMemories;
  } catch (error) {
    console.error(`Error retrieving memories for character ${characterId}:`, error);
    return "";
  }
}
/**
 * Extract and store important information from a conversation
 */
export async function processConversation(characterId, conversation) {
  if (!conversation || conversation.length < 2) return;
  
  // Store the most recent exchange
  const lastUserMessage = conversation
    .filter(msg => msg.sender === 'user')
    .pop();
  
  const lastCharacterMessage = conversation
    .filter(msg => msg.sender === 'character')
    .pop();
  
  if (lastUserMessage) {
    // Store the user's message
    await addMemory(
      characterId,
      `User said: "${lastUserMessage.text}"`,
      MEMORY_TYPES.CONVERSATION,
      4
    );
  }
  
  if (lastCharacterMessage) {
    // Store the character's response
    await addMemory(
      characterId,
      `I responded: "${lastCharacterMessage.text}"`,
      MEMORY_TYPES.CONVERSATION,
      3
    );
  }
  
  // For a real implementation, use an AI model to extract facts, preferences, etc.
  // Here's a simple keyword-based approach as a placeholder
  const allText = conversation.map(msg => msg.text).join(' ').toLowerCase();
  
  // Extract preferences (very simplistic)
  if (allText.includes('like') || allText.includes('love') || allText.includes('enjoy')) {
    const userMsg = lastUserMessage?.text.toLowerCase() || '';
    if (userMsg.includes('like') || userMsg.includes('love') || userMsg.includes('enjoy')) {
      // Very naive extraction - in a real app, use AI to extract this properly
      await addMemory(
        characterId,
        `User might like ${userMsg.split(/like|love|enjoy/)[1]?.trim() || "something"}`,
        MEMORY_TYPES.PREFERENCE,
        6
      );
    }
  }
}

/**
 * Get a readable time difference
 */
export function getTimeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} days ago`;
  if (hours > 0) return `${hours} hours ago`;
  if (minutes > 0) return `${minutes} minutes ago`;
  return 'just now';
}

/**
 * Delete a specific memory
 */
export async function removeMemory(characterId, memoryId) {
  return await deleteMemory(characterId, memoryId);
}

/**
 * Get all memories for management
 */
export async function getCharacterMemories(characterId) {
  return await getAllMemories(characterId);
}