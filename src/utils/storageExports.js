import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const auth = getAuth();

const ensureAuthenticated = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    const user = auth.currentUser;
    if (user) {
      return user.uid;
    }
    if (i < retries - 1) {
      console.log(`Auth not ready, retry ${i+1}/${retries}...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error('User not authenticated after retries');
};

// Utility function to deep clean an object for Firestore
const deepCleanForFirestore = (obj) => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    console.warn('deepCleanForFirestore received invalid input:', obj);
    return null;
  }

  if (Array.isArray(obj)) {
    return obj
      .map(item => deepCleanForFirestore(item))
      .filter(item => item !== null && item !== undefined);
  }

  const cleaned = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'userImpl') {
      console.log(`Found userImpl object in field '${key}':`, value);
      continue;
    }

    if (key === 'user') {
      console.log(`Removing 'user' field with value:`, value);
      continue;
    }

    if (value === undefined) {
      console.log(`Removing undefined field '${key}'`);
      continue;
    }

    if (typeof value === 'object') {
      const cleanedValue = deepCleanForFirestore(value);
      if (cleanedValue !== null && cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    } else {
      cleaned[key] = value;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : null;
};

// World functions
export const loadWorlds = async (userId = null) => {
  try {
    let userIdToUse = userId;
    if (!userIdToUse) {
      const user = await ensureAuthenticated();
      userIdToUse = user;
    }
    if (!userIdToUse) {
      console.error('No user ID available for query');
      return [];
    }
    const worldsQuery = query(collection(db, 'worlds'), where('userId', '==', userIdToUse));
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
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const worldDoc = await getDoc(doc(db, 'worlds', worldId.toString()));
    if (worldDoc.exists()) {
      const worldData = {
        id: worldDoc.id,
        ...worldDoc.data()
      };
      if (worldData.userId !== userIdToUse) {
        throw new Error('Unauthorized access to world');
      }
      return worldData;
    } else {
      console.error(`World with ID ${worldId} not found`);
      return null;
    }
  } catch (error) {
    console.error('Error loading world from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const saveWorlds = async (worlds, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    for (const world of worlds) {
      const worldToSave = deepCleanForFirestore({ ...world, userId: userIdToUse });
      if (!worldToSave) {
        console.error('Failed to clean world data:', world);
        continue;
      }
      await setDoc(doc(db, 'worlds', world.id.toString()), worldToSave);
    }
    return true;
  } catch (error) {
    console.error('Error saving worlds to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const deleteWorld = async (worldId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const worldDoc = await getDoc(doc(db, 'worlds', worldId.toString()));
    if (worldDoc.exists() && worldDoc.data().userId === userIdToUse) {
      await deleteDoc(doc(db, 'worlds', worldId.toString()));
      return true;
    } else {
      throw new Error('Unauthorized or world not found');
    }
  } catch (error) {
    console.error('Error deleting world from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

// Campaign functions
export const loadWorldCampaigns = async (worldId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const campaignsQuery = query(
      collection(db, 'campaigns'),
      where('worldId', '==', parseInt(worldId)),
      where('userId', '==', userIdToUse)
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
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    console.log(`Attempting to load campaign with ID: ${campaignId} for user: ${userIdToUse}`);
    const campaignRef = doc(db, 'campaigns', campaignId);
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
    if (campaignData.userId !== userIdToUse) {
      console.error(`Unauthorized access: campaign userId (${campaignData.userId}) does not match authenticated user (${userIdToUse})`);
      throw new Error(`Unauthorized access to campaign with ID ${campaignId}`);
    }
    return campaignData;
  } catch (error) {
    console.error('Error loading campaign from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const saveCampaign = async (campaign, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    console.log(`Saving campaign ${campaign.id} for user ${userIdToUse}`);
    console.log(`Campaign has ${campaign.sessions?.length || 0} sessions`);
    const campaignToSave = deepCleanForFirestore({ ...campaign, userId: userIdToUse });
    if (!campaignToSave) {
      throw new Error('Failed to clean campaign data');
    }
    await setDoc(doc(db, 'campaigns', campaign.id.toString()), campaignToSave);
    console.log(`Campaign saved successfully`);
    return true;
  } catch (error) {
    console.error('Error saving campaign to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const updateCampaign = async (campaign, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    console.log(`Updating campaign ${campaign.id} for user ${userIdToUse}`);
    const campaignToSave = deepCleanForFirestore({ ...campaign, userId: userIdToUse });
    if (!campaignToSave) {
      throw new Error('Failed to clean campaign data for update');
    }
    await setDoc(doc(db, 'campaigns', campaign.id.toString()), campaignToSave);
    console.log(`Campaign updated successfully`);
    return true;
  } catch (error) {
    console.error('Error updating campaign in Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const deleteCampaign = async (campaignId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId.toString()));
    if (campaignDoc.exists() && campaignDoc.data().userId === userIdToUse) {
      await deleteDoc(doc(db, 'campaigns', campaignId.toString()));
      return true;
    } else {
      throw new Error('Unauthorized or campaign not found');
    }
  } catch (error) {
    console.error('Error deleting campaign from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

// Character functions
export const loadCharacters = async (userId = null, projectId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const constraints = [where('userId', '==', userIdToUse)];
    if (projectId) {
      constraints.push(where('projectId', '==', projectId));
    }
    const charactersQuery = query(
      collection(db, 'characters'),
      ...constraints
    );
    const charactersSnapshot = await getDocs(charactersQuery);
    if (!charactersSnapshot || !charactersSnapshot.docs) {
      console.warn('No valid snapshot or docs returned');
      return [];
    }
    const characters = charactersSnapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data
      };
    }).filter(char => char);
    return characters;
  } catch (error) {
    console.error('Error loading characters from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    return [];
  }
};

export const saveCharacter = async (character, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const characterToSave = deepCleanForFirestore({ ...character, userId: userIdToUse });
    if (!characterToSave) {
      throw new Error('Failed to clean character data');
    }
    await setDoc(doc(db, 'characters', character.id.toString()), characterToSave);
    return true;
  } catch (error) {
    console.error('Error saving character to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const saveCharacters = async (characters, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    for (const character of characters) {
      const characterToSave = deepCleanForFirestore({ ...character, userId: userIdToUse });
      if (!characterToSave) {
        console.error('Failed to clean character data:', character);
        continue;
      }
      await setDoc(doc(db, 'characters', character.id.toString()), characterToSave);
    }
    return true;
  } catch (error) {
    console.error('Error saving characters to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const deleteCharacter = async (characterId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const characterDoc = await getDoc(doc(db, 'characters', characterId.toString()));
    if (characterDoc.exists() && characterDoc.data().userId === userIdToUse) {
      await deleteDoc(doc(db, 'characters', characterId.toString()));
      return true;
    } else {
      throw new Error('Unauthorized or character not found');
    }
  } catch (error) {
    console.error('Error deleting character from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

// Environment functions
export const loadEnvironments = async (userId = null, projectId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const constraints = [where('userId', '==', userIdToUse)];
    if (projectId) {
      constraints.push(where('projectId', '==', projectId));
    }
    const environmentsQuery = query(
      collection(db, 'environments'),
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

export const saveEnvironments = async (environments, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    for (const environment of environments) {
      const environmentToSave = deepCleanForFirestore({ ...environment, userId: userIdToUse });
      if (!environmentToSave) {
        console.error('Failed to clean environment data:', environment);
        continue;
      }
      await setDoc(doc(db, 'environments', environment.id.toString()), environmentToSave);
    }
    return true;
  } catch (error) {
    console.error('Error saving environments to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const deleteEnvironment = async (environmentId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const environmentDoc = await getDoc(doc(db, 'environments', environmentId.toString()));
    if (environmentDoc.exists() && environmentDoc.data().userId === userIdToUse) {
      await deleteDoc(doc(db, 'environments', environmentId.toString()));
      return true;
    } else {
      throw new Error('Unauthorized or environment not found');
    }
  } catch (error) {
    console.error('Error deleting environment from Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

// Map functions
export const loadMapData = async (userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const mapDoc = await getDoc(doc(db, 'maps', userIdToUse));
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
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const mapToSave = deepCleanForFirestore({
      ...mapData,
      userId: userIdToUse,
      imageUrl: mapData.imageUrl || ''
    });
    if (!mapToSave) {
      throw new Error('Failed to clean map data');
    }
    await setDoc(doc(db, 'maps', userIdToUse), mapToSave);
    return true;
  } catch (error) {
    console.error('Error saving map data to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

// Timeline functions
export const loadTimelineData = async (userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const timelineDoc = await getDoc(doc(db, 'timelines', userIdToUse));
    if (timelineDoc.exists()) {
      const timelineData = timelineDoc.data();
      if (timelineData.userId !== userIdToUse) {
        throw new Error('Unauthorized access to timeline');
      }
      return timelineData;
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
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const timelineToSave = deepCleanForFirestore({ ...timelineData, userId: userIdToUse });
    if (!timelineToSave) {
      throw new Error('Failed to clean timeline data');
    }
    await setDoc(doc(db, 'timelines', userIdToUse), timelineToSave);
    return true;
  } catch (error) {
    console.error('Error saving timeline data to Firestore:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

// Export/Import functions
export const exportAllData = async (options = {}) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = user;
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
    if (options.memories) {
      data.memories = {};
    }
    if (options.chats) {
      data.chatData = {};
    }
    return data;
  } catch (error) {
    console.error('Error exporting data:', { message: error.message, code: error.code, stack: error.stack });
    throw error;
  }
};

export const importAllData = async (data, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user;
    const results = [];
    if (data.characters && Array.isArray(data.characters)) {
      results.push(await saveCharacters(data.characters, userIdToUse));
    }
    if (data.environments && Array.isArray(data.environments)) {
      results.push(await saveEnvironments(data.environments, userIdToUse));
    }
    if (data.worlds && Array.isArray(data.worlds)) {
      results.push(await saveWorlds(data.worlds, userIdToUse));
    }
    if (data.campaigns && Array.isArray(data.campaigns)) {
      for (const campaign of data.campaigns) {
        results.push(await saveCampaign(campaign, userIdToUse));
      }
    }
    if (data.mapData) {
      results.push(await saveMapData(userIdToUse, data.mapData));
    }
    if (data.timelineData) {
      results.push(await saveTimelineData(userIdToUse, data.timelineData));
    }
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
    const worldsQuery = query(collection(db, 'worlds'), where('userId', '==', user.uid));
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