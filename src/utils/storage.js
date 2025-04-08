// src/utils/storage.js
import { 
  query, 
  collection, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  getDoc,
  limit,
  startAfter
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// Attempt to import firebaseStorage with multiple potential paths
import * as firebaseStorage from './firebaseStorage';

// Fallback function creator
const createFallbackFunction = (name) => {
  return (...args) => {
    console.warn(`Fallback function for ${name} called. This might not work as expected.`);
    return Promise.resolve(null);
  };
};

// Custom error class for more detailed error handling
export class StorageError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'StorageError';
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

// Utility function to validate and get current user
const validateUser = () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new StorageError('User not authenticated');
  }
  return currentUser.uid;
};

// Generic function to fetch user-specific collection
const fetchUserCollection = async (collectionName, additionalQuery = null) => {
  try {
    const userId = validateUser();
    const baseQuery = query(
      collection(db, collectionName), 
      where('userId', '==', userId)
    );

    const finalQuery = additionalQuery 
      ? query(baseQuery, ...additionalQuery) 
      : baseQuery;

    const querySnapshot = await getDocs(finalQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    throw new StorageError(`Failed to fetch ${collectionName}`, error);
  }
};

// Specific collection loading functions
export const loadCharacters = async () => {
  try {
    const userId = validateUser();
    const characters = [];
    const q = query(collection(db, 'characters'), where('userId', '==', userId));
    
    try {
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const characterData = doc.data();
        // Additional validation
        if (characterData && typeof characterData === 'object') {
          characters.push({ 
            id: doc.id, 
            ...characterData 
          });
        }
      });
    } catch (snapshotError) {
      console.error('Error in query snapshot:', snapshotError);
      throw snapshotError;
    }
    
    return characters;
  } catch (error) {
    console.error('Detailed error loading characters:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return []; // Return empty array instead of throwing
  }
};

export const loadEnvironments = () => fetchUserCollection('environments');
export const loadCampaigns = () => fetchUserCollection('campaigns');

// Direct exports with fallback functions
export const loadCharacter = firebaseStorage.loadCharacter || createFallbackFunction('loadCharacter');
export const saveCharacter = firebaseStorage.saveCharacter || createFallbackFunction('saveCharacter');
export const saveCharacters = firebaseStorage.saveCharacters || createFallbackFunction('saveCharacters');
export const deleteCharacter = firebaseStorage.deleteCharacter || createFallbackFunction('deleteCharacter');

export const saveEnvironment = firebaseStorage.saveEnvironment || createFallbackFunction('saveEnvironment');
export const saveEnvironments = firebaseStorage.saveEnvironments || createFallbackFunction('saveEnvironments');
export const deleteEnvironment = firebaseStorage.deleteEnvironment || createFallbackFunction('deleteEnvironment');

export const saveWorld = firebaseStorage.saveWorld || createFallbackFunction('saveWorld');
export const saveWorlds = firebaseStorage.saveWorlds || createFallbackFunction('saveWorlds');
export const deleteWorld = firebaseStorage.deleteWorld || createFallbackFunction('deleteWorld');

export const saveCampaign = firebaseStorage.saveCampaign || createFallbackFunction('saveCampaign');
export const loadWorldCampaigns = firebaseStorage.loadWorldCampaigns || createFallbackFunction('loadWorldCampaigns');

export const loadWorlds = async () => {
  try {
    const userId = validateUser();
    const worlds = [];
    const q = query(collection(db, 'worlds'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      worlds.push({ id: doc.id, ...doc.data() });
    });
    
    return worlds;
  } catch (error) {
    console.error('Error loading worlds:', error);
    return []; // Return an empty array instead of throwing
  }
};

// Pagination utility
export const fetchPaginatedCollection = async (
  collectionName, 
  pageSize = 20, 
  startAfterDoc = null, 
  additionalQuery = null
) => {
  try {
    const userId = validateUser();
    
    let baseQuery = query(
      collection(db, collectionName), 
      where('userId', '==', userId),
      limit(pageSize)
    );

    // Add any additional query conditions
    if (additionalQuery) {
      baseQuery = query(baseQuery, ...additionalQuery);
    }

    // If we have a pagination cursor, start after that document
    if (startAfterDoc) {
      baseQuery = query(baseQuery, startAfter(startAfterDoc));
    }

    const querySnapshot = await getDocs(baseQuery);
    
    return {
      items: querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1]
    };
  } catch (error) {
    console.error(`Error fetching paginated ${collectionName}:`, error);
    throw new StorageError(`Failed to fetch paginated ${collectionName}`, error);
  }
};

// Batch update utility
export const batchUpdate = async (collectionName, updates) => {
  try {
    const userId = validateUser();
    const batch = writeBatch(db);

    updates.forEach(update => {
      const docRef = doc(db, collectionName, update.id);
      batch.update(docRef, {
        ...update.data,
        userId,
        updatedAt: new Date().toISOString()
      });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error(`Error in batch update for ${collectionName}:`, error);
    throw new StorageError(`Failed to perform batch update on ${collectionName}`, error);
  }
};

// Re-export Firebase Storage utility functions with fallbacks
export const {
  // User profile
  getUserProfile = createFallbackFunction('getUserProfile'),
  updateUserProfile = createFallbackFunction('updateUserProfile'),

  // Timeline and Map
  loadTimelineData = createFallbackFunction('loadTimelineData'),
  saveTimelineData = createFallbackFunction('saveTimelineData'),
  loadMapData = createFallbackFunction('loadMapData'),
  saveMapData = createFallbackFunction('saveMapData'),
  loadWorldById = createFallbackFunction('loadWorldById'),
  loadWorldTimeline = createFallbackFunction('loadWorldTimeline'),

  // Export/Import
  exportAllData = createFallbackFunction('exportAllData'),
  importAllData = createFallbackFunction('importAllData'),
  testStorage = createFallbackFunction('testStorage'),

  // Performance tracing (if available)
  trace = createFallbackFunction('trace'),
  perf = createFallbackFunction('perf'),

  // Campaign
  loadCampaign = createFallbackFunction('loadCampaign')
} = firebaseStorage || {};

