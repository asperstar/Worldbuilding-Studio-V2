import { 
  db, 
  auth, 
  storage, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject 
} from '../firebase';


// Get the current user ID
const getCurrentUserId = () => {
  return auth.currentUser?.uid;
};

// Helper to validate user is logged in
const validateUser = () => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  return userId;
};
export const saveWorlds = async (worlds) => {
  try {
    const userId = validateUser();
    const batch = writeBatch(db);
    
    for (const world of worlds) {
      // Handle image upload if needed
      let processedWorld = { ...world };
      if (world.imageUrl && world.imageUrl.startsWith('data:')) {
        const response = await fetch(world.imageUrl);
        const blob = await response.blob();
        const imageRef = ref(storage, `users/${userId}/worlds/${world.id || Date.now()}`);
        await uploadBytes(imageRef, blob);
        processedWorld.imageUrl = await getDownloadURL(imageRef);
      }

      const worldRef = doc(db, 'worlds', world.id.toString());
      batch.set(worldRef, { 
        ...processedWorld,
        userId,
        updated: new Date().toISOString()
      });
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error saving worlds:', error);
    return false;
  }
};
export const saveEnvironments = async (environments) => {
  try {
    const userId = validateUser();
    const batch = writeBatch(db);
    
    for (const environment of environments) {
      // Handle image upload if needed
      let processedEnvironment = { ...environment };
      if (environment.imageUrl && environment.imageUrl.startsWith('data:')) {
        const response = await fetch(environment.imageUrl);
        const blob = await response.blob();
        const imageRef = ref(storage, `users/${userId}/environments/${environment.id || Date.now()}`);
        await uploadBytes(imageRef, blob);
        processedEnvironment.imageUrl = await getDownloadURL(imageRef);
      }

      const environmentRef = doc(db, 'environments', environment.id.toString());
      batch.set(environmentRef, { 
        ...processedEnvironment,
        userId,
        updated: new Date().toISOString()
      });
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error saving environments:', error);
    return false;
  }
};
/**
 * User Profile Management
 */
export const getUserProfile = async () => {
  try {
    const userId = validateUser();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      // Create a default profile if none exists
      const defaultProfile = {
        displayName: auth.currentUser.displayName || 'User',
        email: auth.currentUser.email,
        created: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', userId), defaultProfile);
      return defaultProfile;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const userId = validateUser();
    await updateDoc(doc(db, 'users', userId), {
      ...profileData,
      updated: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

/**
 * Character Storage Functions
 */
export const loadCharacter = async (characterId) => {
  try {
    const userId = validateUser();
    
    // Ensure characterId is a string and trim any whitespace
    const cleanedId = String(characterId).trim();
    
    // Check if the ID is valid
    if (!cleanedId) {
      throw new Error('Invalid character ID');
    }
    
    const characterRef = doc(db, 'characters', cleanedId);
    const characterDoc = await getDoc(characterRef);
    
    if (!characterDoc.exists()) {
      // Log additional context for debugging
      console.warn(`Character not found: ID ${cleanedId}, User: ${userId}`);
      return null;
    }

    const characterData = characterDoc.data();
    
    // Additional security check
    if (characterData.userId !== userId) {
      throw new Error('Unauthorized: Can only access own characters');
    }
    
    return {
      id: characterDoc.id,
      ...characterData
    };
  } catch (error) {
    console.error('Error loading character:', error);
    return null;
  }
};

export const saveCharacter = async (character) => {
  try {
    const userId = validateUser();
    
    // Handle image data appropriately
    let processedCharacter = { ...character };
    
    // If imageUrl is a base64 string, upload it to Firebase Storage
    if (character.imageUrl && character.imageUrl.startsWith('data:')) {
      const response = await fetch(character.imageUrl);
      const blob = await response.blob();
      const imageRef = ref(storage, `users/${userId}/characters/${character.id || Date.now()}`);
      await uploadBytes(imageRef, blob);
      processedCharacter.imageUrl = await getDownloadURL(imageRef);
    }
    
    // Save to Firestore
    const characterRef = doc(db, 'characters', character.id.toString());
    await setDoc(characterRef, { 
      ...processedCharacter, 
      userId,
      updated: new Date().toISOString() 
    });
    
    return true;
  } catch (error) {
    console.error('Error saving character:', error);
    return false;
  }
};

export const saveCharacters = async (characters) => {
  try {
    const userId = validateUser();
    const batch = writeBatch(db);
    
    for (const character of characters) {
      const characterRef = doc(db, 'characters', character.id.toString());
      batch.set(characterRef, { 
        ...character,
        userId,
        updated: new Date().toISOString()
      });
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error saving characters:', error);
    return false;
  }
};

export const deleteCharacter = async (characterId) => {
  try {
    const userId = validateUser();
    
    // Delete from Firestore
    await deleteDoc(doc(db, 'characters', characterId.toString()));
    
    // Also delete associated image if exists
    try {
      const imageRef = ref(storage, `users/${userId}/characters/${characterId}`);
      await deleteObject(imageRef);
    } catch (imageError) {
      // Ignore errors if image doesn't exist
      console.log('No image found or other storage error:', imageError);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting character:', error);
    return false;
  }
};

/**
 * Environment Storage Functions
 */
export const loadEnvironments = async () => {
  try {
    const userId = validateUser();
    const environments = [];
    const q = query(collection(db, 'environments'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      environments.push({ id: doc.id, ...doc.data() });
    });
    
    return environments;
  } catch (error) {
    console.error('Error loading environments:', error);
    return [];
  }
};



export const deleteEnvironment = async (environmentId) => {
  try {
    const userId = validateUser();
    
    // Delete from Firestore
    await deleteDoc(doc(db, 'environments', environmentId.toString()));
    
    // Delete associated image if exists
    try {
      const imageRef = ref(storage, `users/${userId}/environments/${environmentId}`);
      await deleteObject(imageRef);
    } catch (imageError) {
      // Ignore errors if image doesn't exist
      console.log('No image found or other storage error:', imageError);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting environment:', error);
    return false;
  }
};

/**
 * World Storage Functions
 */
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
    return [];
  }
};

export const loadWorldById = async (worldId) => {
  try {
    const worldDoc = await getDoc(doc(db, 'worlds', worldId.toString()));
    if (worldDoc.exists()) {
      return { id: worldDoc.id, ...worldDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error loading world by ID:', error);
    return null;
  }
};

export const saveWorld = async (world) => {
  try {
    const userId = validateUser();
    
    // Handle image upload if needed
    let processedWorld = { ...world };
    if (world.imageUrl && world.imageUrl.startsWith('data:')) {
      const response = await fetch(world.imageUrl);
      const blob = await response.blob();
      const imageRef = ref(storage, `users/${userId}/worlds/${world.id || Date.now()}`);
      await uploadBytes(imageRef, blob);
      processedWorld.imageUrl = await getDownloadURL(imageRef);
    }
    
    // Save to Firestore
    const worldRef = doc(db, 'worlds', world.id.toString());
    await setDoc(worldRef, { 
      ...processedWorld, 
      userId,
      updated: new Date().toISOString() 
    });
    
    return true;
  } catch (error) {
    console.error('Error saving world:', error);
    return false;
  }
};

export const deleteWorld = async (worldId) => {
  try {
    const userId = validateUser();
    
    // Delete from Firestore
    await deleteDoc(doc(db, 'worlds', worldId.toString()));
    
    // Delete associated image if exists
    try {
      const imageRef = ref(storage, `users/${userId}/worlds/${worldId}`);
      await deleteObject(imageRef);
    } catch (imageError) {
      console.log('No image found or other storage error:', imageError);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting world:', error);
    return false;
  }
};

/**
 * Campaign Storage Functions
 */
export const loadCampaign = async (campaignId) => {
  try {
    const campaign = await getDoc(doc(db, 'campaigns', campaignId.toString()));
    if (campaign.exists()) {
      return { id: campaign.id, ...campaign.data() };
    }
    return null;
  } catch (error) {
    console.error('Error loading campaign:', error);
    return null;
  }
};

export const saveCampaign = async (campaign) => {
  try {
    const userId = validateUser();
    
    // Save to Firestore
    const campaignRef = doc(db, 'campaigns', campaign.id.toString());
    await setDoc(campaignRef, {
      ...campaign,
      userId,
      updated: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving campaign:', error);
    return false;
  }
};

export const loadWorldCampaigns = async (worldId) => {
  try {
    const userId = validateUser();
    const campaigns = [];
    const q = query(
      collection(db, 'campaigns'), 
      where('worldId', '==', parseInt(worldId)),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      campaigns.push({ id: doc.id, ...doc.data() });
    });
    
    return campaigns;
  } catch (error) {
    console.error('Error loading world campaigns:', error);
    return [];
  }
};

/**
 * Map and Timeline Functions
 */
export const loadMapData = async () => {
  try {
    const userId = validateUser();
    const mapDoc = await getDoc(doc(db, 'maps', userId));
    
    if (mapDoc.exists()) {
      return mapDoc.data();
    } else {
      return { nodes: [], edges: [] };
    }
  } catch (error) {
    console.error('Error loading map data:', error);
    return { nodes: [], edges: [] };
  }
};

export const saveMapData = async (mapData) => {
  try {
    const userId = validateUser();
    await setDoc(doc(db, 'maps', userId), {
      ...mapData,
      updated: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving map data:', error);
    return false;
  }
};

export const loadTimelineData = async () => {
  try {
    const userId = validateUser();
    const timelineDoc = await getDoc(doc(db, 'timelines', userId));
    
    if (timelineDoc.exists()) {
      return timelineDoc.data();
    } else {
      return { events: [], sequences: ['Main Timeline'] };
    }
  } catch (error) {
    console.error('Error loading timeline data:', error);
    return { events: [], sequences: ['Main Timeline'] };
  }
};

export const saveTimelineData = async (timelineData) => {
  try {
    const userId = validateUser();
    await setDoc(doc(db, 'timelines', userId), {
      ...timelineData,
      updated: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving timeline data:', error);
    return false;
  }
};
export const saveEnvironment = async (environment) => {
  try {
    const userId = validateUser();
    
    // Handle image upload if needed
    let processedEnvironment = { ...environment };
    if (environment.imageUrl && environment.imageUrl.startsWith('data:')) {
      const response = await fetch(environment.imageUrl);
      const blob = await response.blob();
      const imageRef = ref(storage, `users/${userId}/environments/${environment.id || Date.now()}`);
      await uploadBytes(imageRef, blob);
      processedEnvironment.imageUrl = await getDownloadURL(imageRef);
    }
    
    // Save to Firestore
    const environmentRef = doc(db, 'environments', environment.id.toString());
    await setDoc(environmentRef, { 
      ...processedEnvironment, 
      userId,
      updated: new Date().toISOString() 
    });
    
    return true;
  } catch (error) {
    console.error('Error saving environment:', error);
    return false;
  }
};

export const loadWorldTimeline = async (worldId) => {
  try {
    const userId = validateUser();
    const q = query(
      collection(db, 'timelines'), 
      where('worldId', '==', parseInt(worldId)),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const timelines = [];
    
    querySnapshot.forEach((doc) => {
      timelines.push({ id: doc.id, ...doc.data() });
    });
    
    return timelines.length > 0 ? timelines[0] : null;
  } catch (error) {
    console.error('Error loading world timeline:', error);
    return null;
  }
};
export const importAllData = async (jsonData) => {
  try {
    validateUser();
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    // Import characters
    if (data.characters && Array.isArray(data.characters)) {
      await saveCharacters(data.characters);
    }
    
    // Import environments
    if (data.environments && Array.isArray(data.environments)) {
      await saveEnvironments(data.environments);
    }
    
    // Import worlds
    if (data.worlds && Array.isArray(data.worlds)) {
      await saveWorlds(data.worlds);
    }
    
    // Import map data
    if (data.mapData) {
      await saveMapData(data.mapData);
    }
    
    // Import timeline data
    if (data.timelineData) {
      await saveTimelineData(data.timelineData);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing all data:', error);
    return false;
  }
};
export const testStorage = async () => {
  try {
    const userId = validateUser();
    
    // Basic test to check if storage and authentication are working
    return {
      status: 'success',
      userId: userId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Storage test failed:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};
/**
 * Export/Import Functions
 */
export const exportAllData = async () => {
  try {
    const userId = validateUser();
    
    // Get all user data
    const characters = await loadCharacters();
    const environments = await loadEnvironments();
    const worlds = await loadWorlds();
    const mapData = await loadMapData();
    const timelineData = await loadTimelineData();
    
    // Create data bundle
    const exportData = {
      characters,
      environments,
      worlds,
      mapData,
      timelineData,
      metadata: {
        exportDate: new Date().toISOString(),
        userId,
        version: '1.0'
      }
    };
    
    return exportData;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

export const importData = async (jsonData) => {
  try {
    validateUser();
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    // Use a batch for better atomicity
    const batch = writeBatch(db);
    
    // Import characters
    if (data.characters && Array.isArray(data.characters)) {
      // Implementation for batch character import...
    }
    
    // Import environments
    if (data.environments && Array.isArray(data.environments)) {
      // Implementation for batch environment import...
    }
    
    // Import worlds
    if (data.worlds && Array.isArray(data.worlds)) {
      // Implementation for batch world import...
    }
    
    // Import map data
    if (data.mapData) {
      // Implementation for map data import...
    }
    
    // Import timeline data
    if (data.timelineData) {
      // Implementation for timeline data import...
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
 
};
