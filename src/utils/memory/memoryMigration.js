// src/utils/memory/memoryMigration.js
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

/**
 * Migrate memories from localStorage to Firebase
 */
export const migrateMemoriesToFirebase = async (characterId) => {
  try {
    // Get memories from localStorage
    const storageKey = `memory-${characterId}`;
    const localMemoriesJSON = localStorage.getItem(storageKey);
    
    if (!localMemoriesJSON) {
      console.log(`No local memories found for character ${characterId}`);
      return { migrated: 0, character: characterId };
    }
    
    let localMemories;
    try {
      localMemories = JSON.parse(localMemoriesJSON);
      if (!Array.isArray(localMemories)) {
        console.warn(`Invalid memories format for character ${characterId}`);
        return { migrated: 0, character: characterId, error: 'Invalid format' };
      }
    } catch (parseError) {
      console.error('Error parsing local memories:', parseError);
      return { migrated: 0, character: characterId, error: 'Parse error' };
    }
    
    if (localMemories.length === 0) {
      console.log(`No local memories found for character ${characterId}`);
      return { migrated: 0, character: characterId };
    }
    
    // Check if memories already exist in Firebase
    const memoriesQuery = query(
      collection(db, 'memories'),
      where('characterId', '==', characterId)
    );
    
    const existingSnapshot = await getDocs(memoriesQuery);
    if (!existingSnapshot.empty) {
      console.log(`Found ${existingSnapshot.size} existing memories for character ${characterId} in Firebase`);
    }
    
    // For each local memory, add to Firebase if not already there
    let migratedCount = 0;
    for (const memory of localMemories) {
      // Convert memory to string and store in Firebase
      const memoryData = {
        characterId,
        content: String(memory.content || memory.text || ''),
        metadata: {
          type: memory.type || memory.metadata?.type || 'general',
          timestamp: memory.timestamp || memory.metadata?.timestamp || new Date().toISOString(),
          importance: memory.importance || memory.metadata?.importance || 5
        }
      };
      
      await addDoc(collection(db, 'memories'), memoryData);
      migratedCount++;
    }
    
    console.log(`Migrated ${migratedCount} memories for character ${characterId} to Firebase`);
    
    // Consider clearing local storage after successful migration
    if (migratedCount > 0) {
      localStorage.removeItem(storageKey);
    }
    
    return { migrated: migratedCount, character: characterId };
  } catch (error) {
    console.error('Error migrating memories to Firebase:', error);
    return { 
      migrated: 0, 
      character: characterId, 
      error: error.message
    };
  }
};

/**
 * Migrate memories for all characters
 */
export const migrateAllMemories = async (characterIds) => {
  const results = [];
  
  for (const characterId of characterIds) {
    const result = await migrateMemoriesToFirebase(characterId);
    results.push(result);
  }
  
  return results;
};

/**
 * Migrate all memories from localStorage
 * (searches for all memory keys in localStorage)
 */
export const migrateAllLocalMemories = async () => {
  const characterIds = [];
  
  // Find all memory keys in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('memory-')) {
      const characterId = key.replace('memory-', '');
      characterIds.push(characterId);
    }
  }
  
  console.log(`Found memory data for ${characterIds.length} characters`);
  return await migrateAllMemories(characterIds);
};