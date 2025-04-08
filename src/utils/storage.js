// src/utils/storage.js
import { query, collection, where, getDocs, doc, setDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  saveEnvironments,
  saveEnvironment,
  deleteEnvironment,
  
  loadWorlds,
  saveWorlds,
  saveWorld,
  deleteWorld,
  
  loadCampaign,
  saveCampaign,
  loadWorldCampaigns,
  
  loadMapData,
  saveMapData,
  loadWorldById,
  loadWorldTimeline, 
  
  loadTimelineData,
  saveTimelineData,
  
  testStorage
} from './firebaseStorage';

const validateUser = () => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');
  return currentUser.uid;
};

// Environment-related functions
export const loadEnvironments = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const environmentsRef = collection(db, 'environments');
    const q = query(environmentsRef, where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    
    const environments = [];
    querySnapshot.forEach((doc) => {
      environments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return environments;
  } catch (error) {
    console.error('Error loading environments:', error);
    return [];
  }
};

// Character-related functions
export const loadCharacters = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const charactersRef = collection(db, 'characters');
    const q = query(charactersRef, where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    
    const characters = [];
    querySnapshot.forEach((doc) => {
      characters.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return characters;
  } catch (error) {
    console.error('Error loading characters:', error);
    return [];
  }
};

export const loadCharacter = async (characterId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const characterRef = doc(db, 'characters', characterId);
    const characterDoc = await getDoc(characterRef);
    
    if (!characterDoc.exists()) {
      throw new Error('Character not found');
    }

    const characterData = characterDoc.data();
    if (characterData.userId !== user.uid) {
      throw new Error('Unauthorized: You can only access your own characters');
    }
    
    return {
      id: characterDoc.id,
      ...characterData
    };
  } catch (error) {
    console.error('Error loading character:', error);
    throw error;
  }
};

export const saveCharacter = async (character) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Ensure we have a valid user ID
    const userId = user.uid;
    if (!userId) {
      throw new Error('Invalid user ID');
    }

    const characterWithUserId = {
      ...character,
      userId: userId,
      updatedAt: new Date().toISOString()
    };

    if (character.id) {
      // Ensure ID is a string
      const characterId = String(character.id);
      const characterRef = doc(db, 'characters', characterId);
      
      // First check if the document exists and belongs to the user
      const docSnap = await getDoc(characterRef);
      if (docSnap.exists() && docSnap.data().userId !== userId) {
        throw new Error('Unauthorized: You can only edit your own characters');
      }
      
      await setDoc(characterRef, characterWithUserId, { merge: true });
      return characterId;
    } else {
      const newCharacterRef = doc(collection(db, 'characters'));
      await setDoc(newCharacterRef, {
        ...characterWithUserId,
        createdAt: new Date().toISOString()
      });
      return newCharacterRef.id;
    }
  } catch (error) {
    console.error('Error saving character:', error);
    throw error;
  }
};

export const saveCharacters = async (characters) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const batch = writeBatch(db);
    const charactersWithUserId = characters.map(character => ({
      ...character,
      userId: user.uid
    }));

    for (const character of charactersWithUserId) {
      if (character.id) {
        const characterRef = doc(db, 'characters', character.id);
        batch.set(characterRef, character, { merge: true });
      } else {
        const newCharacterRef = doc(collection(db, 'characters'));
        batch.set(newCharacterRef, character);
      }
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error saving characters:', error);
    throw error;
  }
};

export const deleteCharacter = async (characterId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const characterRef = doc(db, 'characters', characterId);
    await deleteDoc(characterRef);
    return true;
  } catch (error) {
    console.error('Error deleting character:', error);
    throw error;
  }
};

// Re-export all the Firebase implementations
export {
  saveEnvironments,
  saveEnvironment,
  deleteEnvironment,
  
  loadWorlds,
  saveWorlds,
  saveWorld,
  deleteWorld,

  loadCampaign,
  saveCampaign,
  loadWorldCampaigns,
  loadWorldById,
  
  loadMapData,
  saveMapData,

  loadWorldTimeline,
  loadTimelineData,
  saveTimelineData,
  
  testStorage
};

// Any additional utilities that might still be needed:
export const getStorageUsage = () => {
  // This becomes less relevant with Firebase, but you could track document counts
  return {
    used: 0, // No longer relevant with Firebase
    usedMB: '0', // No longer relevant with Firebase
    limit: 'Unlimited', // Firebase has generous limits
    percentUsed: '0' // No longer relevant
  };
};
// src/utils/storage.js - enhance the export/import functions

export const exportAllData = async (options = {}) => {
  try {
    const userId = validateUser();
    
    // Initialize export data object
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        userId,
        version: '2.0'
      }
    };
    
    // Include each data type based on options
    if (options.characters !== false) {
      exportData.characters = await loadCharacters();
    }
    
    if (options.environments !== false) {
      exportData.environments = await loadEnvironments();
    }
    
    if (options.worlds !== false) {
      exportData.worlds = await loadWorlds();
    }
    
    if (options.campaigns !== false) {
      // Load all campaigns from all worlds
      const worlds = await loadWorlds();
      const allCampaigns = [];
      
      for (const world of worlds) {
        if (world.campaignIds && world.campaignIds.length > 0) {
          const worldCampaigns = await loadWorldCampaigns(world.id);
          allCampaigns.push(...worldCampaigns);
        }
      }
      
      exportData.campaigns = allCampaigns;
    }
    
    if (options.map !== false) {
      exportData.mapData = await loadMapData();
    }
    
    if (options.timeline !== false) {
      exportData.timelineData = await loadTimelineData();
    }
    
    // Export chat messages from localStorage
    if (options.chats !== false) {
      const chatData = {};
      
      // Get all keys from localStorage that start with "chat-messages-"
      const chatKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('chat-messages-')
      );
      
      // Extract each chat history
      chatKeys.forEach(key => {
        const characterId = key.replace('chat-messages-', '');
        try {
          chatData[characterId] = JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
          console.warn(`Failed to parse chat data for ${key}`);
        }
      });
      
      exportData.chatData = chatData;
    }
    
    // Export character memories from localStorage
    if (options.memories !== false) {
      const memories = {};
      
      // Get all keys from localStorage that start with "memory-"
      const memoryKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('memory-')
      );
      
      // Extract each memory set
      memoryKeys.forEach(key => {
        const characterId = key.replace('memory-', '');
        try {
          memories[characterId] = JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
          console.warn(`Failed to parse memory data for ${key}`);
        }
      });
      
      exportData.memories = memories;
    }
    
    return exportData;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

export const importAllData = async (importData) => {
  try {
    validateUser();
    
    // Track import stats
    const stats = {
      characters: 0,
      environments: 0,
      worlds: 0,
      campaigns: 0,
      mapUpdated: false,
      timelineUpdated: false,
      chatsUpdated: 0,
      memoriesUpdated: 0
    };
    
    // Import characters
    if (importData.characters && Array.isArray(importData.characters) && importData.characters.length > 0) {
      await saveCharacters(importData.characters);
      stats.characters = importData.characters.length;
    }
    
    // Import environments
    if (importData.environments && Array.isArray(importData.environments) && importData.environments.length > 0) {
      await saveEnvironments(importData.environments);
      stats.environments = importData.environments.length;
    }
    
    // Import worlds
    if (importData.worlds && Array.isArray(importData.worlds) && importData.worlds.length > 0) {
      await saveWorlds(importData.worlds);
      stats.worlds = importData.worlds.length;
    }
    
    // Import campaigns
    if (importData.campaigns && Array.isArray(importData.campaigns) && importData.campaigns.length > 0) {
      // Save each campaign individually
      for (const campaign of importData.campaigns) {
        await saveCampaign(campaign);
      }
      stats.campaigns = importData.campaigns.length;
      
      // Make sure campaign IDs are properly linked to their worlds
      if (importData.worlds && Array.isArray(importData.worlds)) {
        const worldsToUpdate = [];
        
        for (const world of importData.worlds) {
          const campaignsForWorld = importData.campaigns.filter(c => c.worldId === world.id);
          if (campaignsForWorld.length > 0) {
            world.campaignIds = campaignsForWorld.map(c => c.id);
            worldsToUpdate.push(world);
          }
        }
        
        if (worldsToUpdate.length > 0) {
          await saveWorlds(worldsToUpdate);
        }
      }
    }
    
    // Import map data
    if (importData.mapData) {
      await saveMapData(importData.mapData);
      stats.mapUpdated = true;
    }
    
    // Import timeline data
    if (importData.timelineData) {
      await saveTimelineData(importData.timelineData);
      stats.timelineUpdated = true;
    }
    
    // Import chat data
    if (importData.chatData && typeof importData.chatData === 'object') {
      // Loop through each character's chat data
      Object.entries(importData.chatData).forEach(([characterId, messages]) => {
        if (Array.isArray(messages) && messages.length > 0) {
          // Save to localStorage
          localStorage.setItem(`chat-messages-${characterId}`, JSON.stringify(messages));
          stats.chatsUpdated++;
        }
      });
    }
    
    // Import memory data
    if (importData.memories && typeof importData.memories === 'object') {
      // Loop through each character's memories
      Object.entries(importData.memories).forEach(([characterId, memories]) => {
        if (Array.isArray(memories) && memories.length > 0) {
          // Save to localStorage
          localStorage.setItem(`memory-${characterId}`, JSON.stringify(memories));
          stats.memoriesUpdated++;
        }
      });
    }
    
    return { success: true, stats };
  } catch (error) {
    console.error('Error importing data:', error);
    return { success: false, error: error.message };
  }
};

// Add a new function to load all campaigns
export const loadCampaigns = async () => {
  try {
    const userId = validateUser();
    const campaigns = [];
    const q = query(collection(db, 'campaigns'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      campaigns.push({ id: doc.id, ...doc.data() });
    });
    
    return campaigns;
  } catch (error) {
    console.error('Error loading campaigns:', error);
    return [];
  }
};