// src/utils/memory/memoryStorage.js
import { loadCharacters } from '../storage';

// Load memories from localStorage
export const loadMemories = (characterId) => {
  try {
    const memories = localStorage.getItem('worldbuilding-memories');
    if (!memories) return [];
    
    const parsedMemories = JSON.parse(memories);
    
    // If characterId is provided, filter to just that character's memories
    if (characterId) {
      return parsedMemories.filter(memory => memory.characterId === characterId);
    }
    
    return parsedMemories;
  } catch (error) {
    console.error('Error loading memories:', error);
    return [];
  }
};

// Save memories to localStorage
export const saveMemories = (memories) => {
  try {
    localStorage.setItem('worldbuilding-memories', JSON.stringify(memories));
    return true;
  } catch (error) {
    console.error('Error saving memories:', error);
    return false;
  }
};

// Add a new memory
export const addMemory = (characterId, content, type = 'event', importance = 5) => {
  const memories = loadMemories();
  
  const newMemory = {
    id: Date.now(),
    characterId,
    content,
    type,
    importance,
    timestamp: new Date().toISOString(),
    // We'll add basic keywords for searching
    keywords: content.toLowerCase().split(' ')
  };
  
  memories.push(newMemory);
  saveMemories(memories);
  
  return newMemory;
};

// A simple similarity function
const calculateSimilarity = (text1, text2) => {
  // Convert both texts to lowercase and split into words
  const words1 = text1.toLowerCase().split(/\W+/);
  const words2 = text2.toLowerCase().split(/\W+/);
  
  // Count matching words
  let matches = 0;
  words1.forEach(word => {
    if (words2.includes(word) && word.length > 2) {
      matches++;
    }
  });
  
  // Calculate similarity score (0-1)
  return matches / Math.max(words1.length, words2.length);
};

// Find relevant memories
export const findRelevantMemories = (characterId, context, limit = 5) => {
  const memories = loadMemories(characterId);
  
  // Add a similarity score to each memory
  const scoredMemories = memories.map(memory => ({
    ...memory,
    similarity: calculateSimilarity(memory.content, context)
  }));
  
  // Sort by similarity and return the top results
  const relevantMemories = scoredMemories
    .sort((a, b) => b.similarity - a.similarity)
    .filter(memory => memory.similarity > 0.1)  // Only include somewhat relevant memories
    .slice(0, limit);
    
  return relevantMemories;
};