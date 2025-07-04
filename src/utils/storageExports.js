import { getAuth } from 'firebase/auth';
import { db, storage } from '../firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, query, where, getDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const auth = getAuth();

const ensureAuthenticated = () => {
  console.log('ensureAuthenticated: auth.currentUser:', auth.currentUser);
  if (!auth.currentUser) {
    throw new Error('User not authenticated. Please log in.');
  }
  return auth.currentUser.uid;
};

// Utility function to deep clean an object for Firestore
// Updated deepCleanForFirestore function
const deepCleanForFirestore = (obj, visited = new WeakSet()) => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  // Check for common non-serializable types
  if (
    obj instanceof File || 
    obj instanceof Blob || 
    typeof obj === 'function' || 
    (typeof obj === 'object' && obj !== null && 'auth' in obj)
  ) {
    console.log('Found non-serializable object, skipping:', obj);
    return null;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (visited.has(obj)) {
    console.warn('Circular reference detected in object, skipping:', obj);
    return null;
  }
  
  visited.add(obj);
  
  if (Array.isArray(obj)) {
    return obj
      .map(item => deepCleanForFirestore(item, visited))
      .filter(item => item !== null && item !== undefined);
  }
  
  const cleaned = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    
    // Skip common problematic fields
    if (['auth', 'user', 'userData', 'currentUser'].includes(key)) {
      console.log(`Removing potentially problematic field '${key}'`);
      continue;
    }
    
    if (value === undefined) {
      console.log(`Removing undefined field '${key}'`);
      continue;
    }
    
    if (typeof value === 'object') {
      const cleanedValue = deepCleanForFirestore(value, visited);
      if (cleanedValue !== null && cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    } else if (typeof value !== 'function') {
      cleaned[key] = value;
    } else {
      console.log(`Removing function in field '${key}'`);
    }
  }
  
  return Object.keys(cleaned).length > 0 ? cleaned : null;
};

// World functions
export const loadWorlds = async (userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const worldsQuery = query(collection(db, `users/${userIdToUse}/worlds`));
    const worldsSnapshot = await getDocs(worldsQuery);
    const worlds = worldsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return worlds;
  } catch (error) {
    console.error('Error loading worlds from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const loadWorldById = async (worldId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const worldDoc = await getDoc(doc(db, `users/${userIdToUse}/worlds`, worldId.toString()));
    if (worldDoc.exists()) {
      return {
        id: worldDoc.id,
        ...worldDoc.data()
      };
    } else {
      console.error(`World with ID ${worldId} not found`);
      return null;
    }
  } catch (error) {
    console.error('Error loading world from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const saveWorld = async (worldData, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    let imageUrl = worldData.imageUrl || '';
    if (worldData.imageFile) {
      const storageRef = ref(storage, `users/${userIdToUse}/worlds/${worldData.id || Date.now()}`);
      await uploadBytes(storageRef, worldData.imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }
    const { imageFile, ...worldDataWithoutImage } = worldData;
    const worldToSave = deepCleanForFirestore({
      ...worldDataWithoutImage,
      imageUrl,
      userId: userIdToUse,
      created: worldData.created || new Date().toISOString(),
      updated: new Date().toISOString(),
    });
    if (!worldToSave || !worldToSave.id) {
      throw new Error('Failed to clean world data');
    }
    await setDoc(doc(db, `users/${userIdToUse}/worlds`, worldToSave.id.toString()), worldToSave, { merge: true });
    return { id: worldToSave.id, ...worldToSave };
  } catch (error) {
    console.error('Error saving world:', error);
    throw error;
  }
};

export const saveWorlds = async (worlds, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    for (const world of worlds) {
      const worldToSave = deepCleanForFirestore({
        ...world,
        userId: userIdToUse,
        created: world.created || new Date().toISOString(),
        updated: new Date().toISOString(),
      });
      if (!worldToSave || !worldToSave.id) {
        console.error('Failed to clean world data:', world);
        continue;
      }
      await setDoc(doc(db, `users/${userIdToUse}/worlds`, worldToSave.id.toString()), worldToSave, { merge: true });
      console.log(`World ${worldToSave.id} saved successfully`);
    }
    return true;
  } catch (error) {
    console.error('Error saving worlds to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const deleteWorld = async (worldId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const worldRef = doc(db, `users/${userIdToUse}/worlds`, worldId);
    await deleteDoc(worldRef);
  } catch (error) {
    console.error('Error deleting world:', error);
    throw error;
  }
};

// Campaign functions
export const loadWorldCampaigns = async (worldId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const campaignsQuery = query(
      collection(db, `users/${userIdToUse}/campaigns`),
      where('worldId', '==', worldId)
    );
    const campaignsSnapshot = await getDocs(campaignsQuery);
    const campaigns = campaignsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return campaigns;
  } catch (error) {
    console.error('Error loading campaigns from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const loadCampaign = async (campaignId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    console.log(`Attempting to load campaign with ID: ${campaignId} for user: ${userIdToUse}`);
    const campaignRef = doc(db, `users/${userIdToUse}/campaigns`, campaignId);
    const campaignDoc = await getDoc(campaignRef);
    if (!campaignDoc.exists()) {
      console.error(`Campaign with ID ${campaignId} not found in Firestore`);
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }
    const campaignData = {
      id: campaignDoc.id,
      ...campaignDoc.data()
    };
    console.log(`Loaded campaign data:`, campaignData);
    return campaignData;
  } catch (error) {
    console.error('Error loading campaign from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const saveCampaign = async (campaign, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    // Make a copy of the campaign object to avoid modifying the original
    const campaignCopy = { ...campaign };
    
    // Explicitly remove problematic fields
    delete campaignCopy.user;
    delete campaignCopy.userData;
    delete campaignCopy.auth;
    delete campaignCopy.currentUser;
    
    // For safety, ensure participantIds is an array if it exists
    if (campaignCopy.participantIds && !Array.isArray(campaignCopy.participantIds)) {
      campaignCopy.participantIds = [];
    }
    
    const campaignToSave = deepCleanForFirestore({
      ...campaignCopy,
      userId: userIdToUse,
      updated: new Date().toISOString(),
    });
    
    if (!campaignToSave || !campaignToSave.id) {
      console.error('Failed to clean campaign data', campaignCopy);
      throw new Error('Failed to clean campaign data');
    }
    
    console.log('Clean campaign data to save:', campaignToSave);
    
    await setDoc(doc(db, `users/${userIdToUse}/campaigns`, campaignToSave.id.toString()), campaignToSave, { merge: true });
    console.log(`Campaign ${campaignToSave.id} saved successfully`);
    return true;
  } catch (error) {
    console.error('Error saving campaign to Firestore:', error);
    throw new Error(`Error saving campaign: ${error.message}`);
  }
};

export const updateCampaign = async (campaign, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    console.log('updateCampaign: Using userId:', userIdToUse);
    console.log(`Updating campaign ${campaign.id} for user ${userIdToUse}`);
    console.log('updateCampaign: Original campaign data:', campaign);
    const campaignToSave = deepCleanForFirestore({
      ...campaign,
      userId: userIdToUse,
      updated: new Date().toISOString(),
    });
    console.log('updateCampaign: Cleaned campaign data:', campaignToSave);
    if (!campaignToSave || !campaignToSave.id) {
      throw new Error('Failed to clean campaign data for update');
    }
    await setDoc(doc(db, `users/${userIdToUse}/campaigns`, campaignToSave.id.toString()), campaignToSave, { merge: true });
    console.log(`Campaign ${campaignToSave.id} updated successfully`);
    return true;
  } catch (error) {
    console.error('Error updating campaign in Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const deleteCampaign = async (campaignId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const campaignRef = doc(db, `users/${userIdToUse}/campaigns`, campaignId.toString());
    await deleteDoc(campaignRef);
    return true;
  } catch (error) {
    console.error('Error deleting campaign from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

// Character functions
export const loadCharacters = async (userId = null, projectId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    // Build query constraints
    const constraints = [where('userId', '==', userIdToUse)];
    
    // Exclude drafts from normal queries
    constraints.push(where('isDraft', '!=', true));
    
    if (projectId) {
      constraints.push(where('projectId', '==', projectId));
    }
    
    const charactersQuery = query(
      collection(db, `users/${userIdToUse}/characters`),
      ...constraints
    );
    
    const charactersSnapshot = await getDocs(charactersQuery);
    
    const characters = charactersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return characters;
  } catch (error) {
    console.error('Error loading characters:', error);
    return [];
  }
};

// In saveCharacter function (storageExports.js)
export const saveCharacter = async (character, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    if (!userIdToUse) {
      throw new Error('Cannot save character: no user ID provided');
    }
    
    // Generate a consistent ID if one doesn't exist
    const characterId = character.id || `char_${Date.now()}`;
    
    // ALWAYS use the same consistent path
    const characterRef = doc(db, `users/${userIdToUse}/characters`, characterId.toString());
    
    // Check for existing character with same name (excluding drafts)
    if (!character.isDraft) {
      const charactersQuery = query(
        collection(db, `users/${userIdToUse}/characters`),
        where('name', '==', character.name),
        where('isDraft', '==', false)
      );
      const existingCharacters = await getDocs(charactersQuery);
      
      // Filter out the current character if updating
      const duplicates = existingCharacters.docs.filter(doc => doc.id !== characterId);
      
      if (duplicates.length > 0) {
        throw new Error(`A character named "${character.name}" already exists`);
      }
    }
    
    // Handle image upload if needed
    let imageUrl = character.imageUrl || '';
    if (character.imageFile && character.imageFile instanceof File) {
      const storageRef = ref(storage, `users/${userIdToUse}/characters/${characterId}`);
      await uploadBytes(storageRef, character.imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }
    
    // Remove imageFile and ensure clean data
    const { imageFile, ...characterData } = character;
    
    const cleanedCharacter = {
      ...characterData,
      id: characterId,
      imageUrl,
      userId: userIdToUse,
      created: character.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      isDraft: character.isDraft || false
    };
    
    // Save with merge to handle updates
    await setDoc(characterRef, cleanedCharacter, { merge: true });
    
    // If this was a draft being finalized, clean up any duplicate drafts
    if (!character.isDraft && character.name) {
      const draftsQuery = query(
        collection(db, `users/${userIdToUse}/characters`),
        where('name', '==', character.name),
        where('isDraft', '==', true)
      );
      const draftDocs = await getDocs(draftsQuery);
      
      const batch = writeBatch(db);
      draftDocs.docs.forEach(doc => {
        if (doc.id !== characterId) {
          batch.delete(doc.ref);
        }
      });
      await batch.commit();
    }
    
    console.log(`Character ${characterId} saved successfully`);
    return { id: characterId, ...cleanedCharacter };
  } catch (error) {
    console.error(`Error saving character:`, error);
    throw error;
  }
};
export const saveCharacters = async (characters, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    console.log('saveCharacters: Using userId:', userIdToUse);
    for (const character of characters) {
      console.log('saveCharacters: Original character data:', character);
      const characterToSave = deepCleanForFirestore({
        ...character,
        userId: userIdToUse,
        created: character.created || new Date().toISOString(),
        updated: new Date().toISOString(),
      });
      console.log('saveCharacters: Cleaned character data:', characterToSave);
      if (!characterToSave || !characterToSave.id) {
        console.error('Failed to clean character data:', character);
        continue;
      }
      await setDoc(doc(db, `users/${userIdToUse}/characters`, characterToSave.id.toString()), characterToSave, { merge: true });
      console.log(`Character ${characterToSave.id} saved successfully`);
    }
    return true;
  } catch (error) {
    console.error('Error saving characters to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const deleteCharacter = async (characterId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const characterRef = doc(db, `users/${userIdToUse}/characters`, characterId);
    await deleteDoc(characterRef);
  } catch (error) {
    console.error('Error deleting character:', error);
    throw error;
  }
};

// Environment functions
export const loadEnvironments = async (userId = null, projectId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const constraints = [];
    if (projectId) {
      constraints.push(where('projectId', '==', projectId));
    }
    const environmentsQuery = query(
      collection(db, `users/${userIdToUse}/environments`),
      ...constraints
    );
    const environmentsSnapshot = await getDocs(environmentsQuery);
    const environments = environmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return environments;
  } catch (error) {
    console.error('Error loading environments from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    return [];
  }
};

export const saveEnvironment = async (environmentData, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    let imageUrl = environmentData.imageUrl || '';
    if (environmentData.imageFile) {
      const storageRef = ref(storage, `users/${userIdToUse}/environments/${environmentData.id || Date.now()}`);
      await uploadBytes(storageRef, environmentData.imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }
    const { imageFile, ...environmentDataWithoutImage } = environmentData;
    const environmentToSave = deepCleanForFirestore({
      ...environmentDataWithoutImage,
      imageUrl,
      userId: userIdToUse,
      created: environmentData.created || new Date().toISOString(),
      updated: new Date().toISOString(),
    });
    if (!environmentToSave || !environmentToSave.id) {
      throw new Error('Failed to clean environment data');
    }
    await setDoc(doc(db, `users/${userIdToUse}/environments`, environmentToSave.id.toString()), environmentToSave, { merge: true });
    return { id: environmentToSave.id, ...environmentToSave };
  } catch (error) {
    console.error('Error saving environment:', error);
    throw error;
  }
};

export const saveEnvironments = async (environments, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    for (const environment of environments) {
      // Log the raw environment data
      console.log('Saving environment with raw data:', environment);
      const environmentToSave = deepCleanForFirestore({
        ...environment,
        userId: userIdToUse,
        created: environment.created || new Date().toISOString(),
        updated: new Date().toISOString(),
      });
      if (!environmentToSave || !environmentToSave.id) {
        console.error('Failed to clean environment data:', environment);
        continue;
      }
      // Log the cleaned data before saving
      console.log('Cleaned environment data to save:', environmentToSave);
      // Check for undefined values in the cleaned data
      const hasUndefined = JSON.stringify(environmentToSave, (key, value) => {
        if (value === undefined) {
          throw new Error(`Undefined value found in field '${key}'`);
        }
        return value;
      });
      await setDoc(doc(db, `users/${userIdToUse}/environments`, environmentToSave.id.toString()), environmentToSave, { merge: true });
      console.log(`Environment ${environmentToSave.id} saved successfully`);
    }
    return true;
  } catch (error) {
    console.error('Error saving environments to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const deleteEnvironment = async (environmentId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const environmentRef = doc(db, `users/${userIdToUse}/environments`, environmentId);
    await deleteDoc(environmentRef);
  } catch (error) {
    console.error('Error deleting environment:', error);
    throw error;
  }
};

// Map functions
export const loadMapData = async (userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const mapDoc = await getDoc(doc(db, `users/${userIdToUse}/maps`, userIdToUse));
    if (mapDoc.exists()) {
      const mapData = mapDoc.data();
      return {
        ...mapData,
        imageUrl: mapData.imageUrl || ''
      };
    } else {
      console.log('No map data found, returning empty default');
      return { nodes: [], edges: [], imageUrl: '' };
    }
  } catch (error) {
    console.error('Error loading map data from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    return { nodes: [], edges: [], imageUrl: '' };
  }
};

export const saveMapData = async (userId, mapData) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    console.log('saveMapData: Using userId:', userIdToUse);
    console.log('saveMapData: Original map data:', mapData);
    const mapToSave = deepCleanForFirestore({
      ...mapData,
      userId: userIdToUse,
      imageUrl: mapData.imageUrl || ''
    });
    console.log('saveMapData: Cleaned map data:', mapToSave);
    if (!mapToSave) {
      throw new Error('Failed to clean map data');
    }
    await setDoc(doc(db, `users/${userIdToUse}/maps`, userIdToUse), mapToSave, { merge: true });
    console.log(`Map data for user ${userIdToUse} saved successfully`);
    return true;
  } catch (error) {
    console.error('Error saving map data to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

// Timeline functions
export const loadTimelineData = async (userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const timelineDoc = await getDoc(doc(db, `users/${userIdToUse}/timelines`, userIdToUse));
    if (timelineDoc.exists()) {
      return timelineDoc.data();
    } else {
      return { events: [], sequences: ['Main Timeline'], userId: userIdToUse };
    }
  } catch (error) {
    console.error('Error loading timeline data from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    return { events: [], sequences: ['Main Timeline'] };
  }
};

export const saveTimelineData = async (userId, timelineData) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    console.log('saveTimelineData: Using userId:', userIdToUse);
    console.log('saveTimelineData: Original timeline data:', timelineData);
    const timelineToSave = deepCleanForFirestore({ ...timelineData, userId: userIdToUse });
    console.log('saveTimelineData: Cleaned timeline data:', timelineToSave);
    if (!timelineToSave) {
      throw new Error('Failed to clean timeline data');
    }
    await setDoc(doc(db, `users/${userIdToUse}/timelines`, userIdToUse), timelineToSave, { merge: true });
    console.log(`Timeline data for user ${userIdToUse} saved successfully`);
    return true;
  } catch (error) {
    console.error('Error saving timeline data to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

// Export/Import functions
export const exportAllData = async (options = {}) => {
  try {
    const userIdToUse = await ensureAuthenticated();
    const data = {};
    if (options.characters) {
      data.characters = await loadCharacters(userIdToUse);
    }
    if (options.environments) {
      data.environments = await loadEnvironments(userIdToUse);
    }
    if (options.worlds) {
      data.worlds = await loadWorlds(userIdToUse);
    }
    if (options.campaigns) {
      const worlds = await loadWorlds(userIdToUse);
      let allCampaigns = [];
      for (const world of worlds) {
        const worldCampaigns = await loadWorldCampaigns(world.id, userIdToUse);
        allCampaigns = [...allCampaigns, ...worldCampaigns];
      }
      data.campaigns = allCampaigns;
    }
    if (options.map) {
      data.mapData = await loadMapData(userIdToUse);
    }
    if (options.timeline) {
      data.timelineData = await loadTimelineData(userIdToUse);
    }
    // TODO: Implement memories and chat data export in the future
    return data;
  } catch (error) {
    console.error('Error exporting data:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const importAllData = async (data, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    console.log('importAllData: Using userId:', userIdToUse);
    const results = [];
    if (data.characters && Array.isArray(data.characters)) {
      console.log('importAllData: Importing characters:', data.characters);
      results.push(await saveCharacters(data.characters, userIdToUse));
    }
    if (data.environments && Array.isArray(data.environments)) {
      console.log('importAllData: Importing environments:', data.environments);
      results.push(await saveEnvironments(data.environments, userIdToUse));
    }
    if (data.worlds && Array.isArray(data.worlds)) {
      console.log('importAllData: Importing worlds:', data.worlds);
      results.push(await saveWorlds(data.worlds, userIdToUse));
    }
    if (data.campaigns && Array.isArray(data.campaigns)) {
      console.log('importAllData: Importing campaigns:', data.campaigns);
      for (const campaign of data.campaigns) {
        results.push(await saveCampaign(campaign, userIdToUse));
      }
    }
    if (data.mapData) {
      console.log('importAllData: Importing map data:', data.mapData);
      results.push(await saveMapData(userIdToUse, data.mapData));
    }
    if (data.timelineData) {
      console.log('importAllData: Importing timeline data:', data.timelineData);
      results.push(await saveTimelineData(userIdToUse, data.timelineData));
    }
    console.log('importAllData: Import results:', results);
    return results.every(result => result === true);
  } catch (error) {
    console.error('Error importing data:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

// Test connection function
export const testStorage = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { 
        success: false, 
        error: 'User not authenticated', 
        authState: 'Not logged in' 
      };
    }
    const worldsQuery = query(collection(db, `users/${user.uid}/worlds`));
    const snapshot = await getDocs(worldsQuery);
    console.log(`Firestore connectivity test: Retrieved ${snapshot.size} worlds`);
    return { 
      success: true, 
      message: 'Firebase connection successful',
      userId: user.uid
    };
  } catch (error) {
    console.error('Firestore connectivity test failed:', { message: error.message, code: error.code });
    return { 
      success: false, 
      error: error.message,
      errorCode: error.code,
      authState: auth.currentUser ? 'Logged in' : 'Not logged in'
    };
  }
};