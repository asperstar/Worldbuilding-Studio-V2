// src/utils/memory/vectorDb.js
import { v4 as uuidv4 } from 'uuid'; // You might need to install this dependency

// A simple vector database simulation using localStorage
// In a real app, you would use a proper vector database like Pinecone, Weaviate, etc.

// Function to create a very simple embedding (in a real app, you'd use a proper embedding model)
const createSimpleEmbedding = (text) => {
  // This is a very naive implementation - just for demonstration
  // In production, you'd use a proper embedding model or API
  const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 0);
  return words;
};

// Calculate similarity between two texts (very simplified)
const calculateSimilarity = (text1, text2) => {
  const embedding1 = createSimpleEmbedding(text1);
  const embedding2 = createSimpleEmbedding(text2);
  
  // Count common words
  const commonWords = embedding1.filter(word => embedding2.includes(word));
  
  // Calculate similarity score (Jaccard similarity)
  const union = new Set([...embedding1, ...embedding2]);
  return commonWords.length / union.size;
};

/**
 * Store a memory in localStorage with simple vector embeddings
 */
export async function storeMemory(characterId, content, metadata = {}) {
  try {
    const storageKey = `memory-${characterId}`;
    const memories = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const newMemory = {
      id: uuidv4(),
      content,
      metadata: {
        ...metadata,
        timestamp: metadata.timestamp || new Date().toISOString(),
        embedding: createSimpleEmbedding(content)
      }
    };
    
    memories.push(newMemory);
    localStorage.setItem(storageKey, JSON.stringify(memories));
    
    return newMemory;
  } catch (error) {
    console.error('Error storing memory:', error);
    return null;
  }
}

/**
 * Retrieve memories related to a given context
 */
export async function retrieveMemories(characterId, context, limit = 5, minSimilarity = 0.1) {
  try {
    const storageKey = `memory-${characterId}`;
    const memoriesJson = localStorage.getItem(storageKey);
    
    if (!memoriesJson) {
      console.log(`No memories found for character ${characterId}`);
      return [];
    }
    
    let memories;
    try {
      memories = JSON.parse(memoriesJson);
      if (!Array.isArray(memories)) {
        console.error(`Parsed memories is not an array for character ${characterId}. Type:`, typeof memories);
        return [];
      }
    } catch (parseError) {
      console.error(`Error parsing memories JSON for character ${characterId}:`, parseError);
      return [];
    }
    
    if (memories.length === 0) return [];
    
    // Calculate similarity scores for each memory
    const scoredMemories = memories.map(memory => ({
      ...memory,
      similarityScore: calculateSimilarity(context, memory.content)
    }));
    
    // Sort by similarity score and filter by minimum threshold
    return scoredMemories
      .filter(memory => memory.similarityScore >= minSimilarity)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit)
      .map(memory => ({
        content: memory.content,
        type: memory.metadata.type,
        timestamp: memory.metadata.timestamp,
        importance: memory.metadata.importance
      }));
  } catch (error) {
    console.error('Error retrieving memories:', error);
    return [];
  }
}

/**
 * Delete a specific memory by ID
 */
export async function deleteMemory(characterId, memoryId) {
  try {
    const storageKey = `memory-${characterId}`;
    const memories = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const updatedMemories = memories.filter(memory => memory.id !== memoryId);
    localStorage.setItem(storageKey, JSON.stringify(updatedMemories));
    
    return true;
  } catch (error) {
    console.error('Error deleting memory:', error);
    return false;
  }
}

/**
 * Get all memories for a character
 */
// In vectorDb.js, ensure getAllMemories is implemented
export async function getAllMemories(characterId) {
  try {
    const storageKey = `memory-${characterId}`;
    const memories = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return memories;
  } catch (error) {
    console.error('Error getting all memories:', error);
    return [];
  }
}

// In memoryManager.js, ensure this function is exported
export async function getCharacterMemories(characterId) {
  return await getAllMemories(characterId);
}