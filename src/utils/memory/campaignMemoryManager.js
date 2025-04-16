// src/utils/memory/memoryManager.js
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';

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

/**
 * Store a memory in Firebase
 */
export async function storeMemory(characterId, content, metadata = {}) {
  try {
    // Create the memory object with string content
    const memory = {
      characterId,
      content: String(content), // Ensure content is a string
      metadata: {
        ...metadata,
        timestamp: metadata.timestamp || new Date().toISOString(),
        type: metadata.type || 'general',
        importance: metadata.importance || 5
      }
    };

    // Add to Firebase
    const docRef = await addDoc(collection(db, 'memories'), memory);
    
    console.log(`Memory stored for character ${characterId} with ID: ${docRef.id}`);
    return { id: docRef.id, ...memory };
  } catch (error) {
    console.error('Error storing memory in Firebase:', error);
    throw error;
  }
}

/**
 * Get all memories for a character from Firebase
 */
export async function getCharacterMemories(characterId) {
  try {
    const memoriesQuery = query(
      collection(db, 'memories'),
      where('characterId', '==', characterId)
    );
    
    const memoriesSnapshot = await getDocs(memoriesQuery);
    const memories = [];
    
    memoriesSnapshot.forEach((doc) => {
      memories.push({ id: doc.id, ...doc.data() });
    });
    
    return memories;
  } catch (error) {
    console.error('Error retrieving memories from Firebase:', error);
    return [];
  }
}

/**
 * Delete a memory from Firebase
 */
export async function deleteMemory(characterId, memoryId) {
  try {
    await deleteDoc(doc(db, 'memories', memoryId));
    console.log(`Memory ${memoryId} deleted for character ${characterId}`);
    return true;
  } catch (error) {
    console.error('Error deleting memory from Firebase:', error);
    throw error;
  }
}

/**
 * Update a memory in Firebase
 */
export async function updateMemory(memoryId, updates) {
  try {
    const memoryRef = doc(db, 'memories', memoryId);
    await updateDoc(memoryRef, updates);
    console.log(`Memory ${memoryId} updated`);
    return true;
  } catch (error) {
    console.error('Error updating memory in Firebase:', error);
    throw error;
  }
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

/**
 * Get relevant memories for the current conversation
 */
export async function getRelevantMemories(characterId, currentContext) {
  try {
    const allMemories = await getCharacterMemories(characterId);
    
    if (!Array.isArray(allMemories)) {
      console.warn(`Retrieved memories is not an array for character ${characterId}.`);
      return "";
    }
    
    if (allMemories.length === 0) return "";
    
    // Simple relevance scoring - a real implementation would use embeddings
    const scoredMemories = allMemories.map(memory => {
      // Basic keyword match
      const content = memory.content || '';
      const contentLower = content.toLowerCase();
      const contextLower = (currentContext || '').toLowerCase();
      
      // Count matching words
      const contentWords = contentLower.split(/\W+/);
      const contextWords = contextLower.split(/\W+/);
      
      let matchCount = 0;
      contextWords.forEach(word => {
        if (word.length > 3 && contentWords.includes(word)) {
          matchCount++;
        }
      });
      
      // Calculate score (0-1)
      const score = contextWords.length > 0 
        ? matchCount / contextWords.length 
        : 0;
        
      return {
        ...memory,
        relevanceScore: score
      };
    });
    
    // Sort by relevance and importance
    const relevantMemories = scoredMemories
      .filter(memory => memory.relevanceScore > 0.1 || (memory.metadata?.importance || 0) > 7)
      .sort((a, b) => {
        // Combine relevance and importance
        const scoreA = a.relevanceScore * 0.6 + (a.metadata?.importance || 0) * 0.4 / 10;
        const scoreB = b.relevanceScore * 0.6 + (b.metadata?.importance || 0) * 0.4 / 10;
        return scoreB - scoreA;
      })
      .slice(0, 10); // Limit to 10 most relevant memories
    
    // Format memories into a string for the prompt
    const formattedMemories = relevantMemories.map(memory => {
      const timeAgo = getTimeAgo(memory.metadata?.timestamp);
      return `- (${memory.metadata?.type || 'memory'}, ${timeAgo}) ${memory.content}`;
    }).join('\n');
    
    return formattedMemories;
  } catch (error) {
    console.error(`Error retrieving memories for character ${characterId}:`, error);
    return "";
  }
}

/**
 * Get memories relevant to personality for a character
 */
export async function getPersonalityMemories(characterId) {
  try {
    const allMemories = await getCharacterMemories(characterId);
    
    // Filter memories related to personality
    const personalityMemories = allMemories.filter(memory => {
      const type = memory.metadata?.type?.toUpperCase() || '';
      return type === 'PREFERENCE' || type === 'RELATIONSHIP' || type === 'FACT';
    });
    
    // Sort by importance
    const sortedMemories = personalityMemories.sort((a, b) => {
      return (b.metadata?.importance || 0) - (a.metadata?.importance || 0);
    });
    
    return sortedMemories.slice(0, 7); // Return top 7
  } catch (error) {
    console.error(`Error retrieving personality memories for character ${characterId}:`, error);
    return [];
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
  if (!timestamp) return 'unknown time';
  
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
 * Alias for deleteMemory for backwards compatibility
 */
export async function removeMemory(characterId, memoryId) {
  return await deleteMemory(characterId, memoryId);
}

/**
 * Get memories by type
 */
export async function getRelevantMemoriesByType(characterId, currentContext, types = []) {
  try {
    const allMemories = await getCharacterMemories(characterId);
    
    // If no type filter, return all memories
    if (!types || types.length === 0) {
      return allMemories;
    }
    
    // Filter memories by requested types
    const typesUppercase = types.map(t => t.toUpperCase());
    const filteredMemories = allMemories.filter(memory => {
      const memoryType = memory.metadata?.type || memory.type;
      return typesUppercase.includes(memoryType?.toUpperCase());
    });
    
    return filteredMemories;
  } catch (error) {
    console.error(`Error retrieving memories by type for character ${characterId}:`, error);
    return [];
  }
}

/**
 * Alias for getCharacterMemories for backwards compatibility
 */
export async function getAllMemories(characterId) {
  return await getCharacterMemories(characterId);
}