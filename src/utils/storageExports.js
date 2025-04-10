import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const auth = getAuth();

const ensureAuthenticated = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    const user = auth.currentUser;
    if (user) {
      return user;
    }
    
    if (i < retries - 1) {
      console.log(`Auth not ready, retry ${i+1}/${retries}...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  throw new Error('User not authenticated after retries');
};

// World functions
export const loadWorlds = async (userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const worldsQuery = query(collection(db, 'worlds'), where('userId', '==', userIdToUse));
    const worldsSnapshot = await getDocs(worldsQuery);
    const worlds = worldsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return worlds;
  } catch (error) {
    console.error('Error loading worlds from Firestore:', error);
    throw error;
  }
};

export const loadWorldById = async (worldId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
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
    console.error('Error loading world from Firestore:', error);
    throw error;
  }
};

export const saveWorlds = async (worlds, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    for (const world of worlds) {
      const worldToSave = { ...world, userId: userIdToUse };
      await setDoc(doc(db, 'worlds', world.id.toString()), worldToSave);
    }
    return true;
  } catch (error) {
    console.error('Error saving worlds to Firestore:', error);
    throw error;
  }
};

export const deleteWorld = async (worldId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const worldDoc = await getDoc(doc(db, 'worlds', worldId.toString()));
    if (worldDoc.exists() && worldDoc.data().userId === userIdToUse) {
      await deleteDoc(doc(db, 'worlds', worldId.toString()));
      return true;
    } else {
      throw new Error('Unauthorized or world not found');
    }
  } catch (error) {
    console.error('Error deleting world from Firestore:', error);
    throw error;
  }
};

// Campaign functions
export const loadWorldCampaigns = async (worldId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
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
    console.error('Error loading campaigns from Firestore:', error);
    throw error;
  }
};

export const loadCampaigns = async (userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const campaignsQuery = query(collection(db, 'campaigns'), where('userId', '==', userIdToUse));
    const campaignsSnapshot = await getDocs(campaignsQuery);
    const campaigns = campaignsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return campaigns;
  } catch (error) {
    console.error('Error loading campaigns from Firestore:', error);
    throw error;
  }
};

export const loadCampaign = async (campaignId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId.toString()));
    if (campaignDoc.exists()) {
      const campaignData = {
        id: campaignDoc.id,
        ...campaignDoc.data()
      };
      if (campaignData.userId !== userIdToUse) {
        throw new Error('Unauthorized access to campaign');
      }
      return campaignData;
    } else {
      console.error(`Campaign with ID ${campaignId} not found`);
      return null;
    }
  } catch (error) {
    console.error('Error loading campaign from Firestore:', error);
    throw error;
  }
};

export const saveCampaign = async (campaign, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const campaignToSave = { ...campaign, userId: userIdToUse };
    await setDoc(doc(db, 'campaigns', campaign.id.toString()), campaignToSave);
    return true;
  } catch (error) {
    console.error('Error saving campaign to Firestore:', error);
    throw error;
  }
};

export const deleteCampaign = async (campaignId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId.toString()));
    if (campaignDoc.exists() && campaignDoc.data().userId === userIdToUse) {
      await deleteDoc(doc(db, 'campaigns', campaignId.toString()));
      return true;
    } else {
      throw new Error('Unauthorized or campaign not found');
    }
  } catch (error) {
    console.error('Error deleting campaign from Firestore:', error);
    throw error;
  }
};


// Character functions
export const loadCharacters = async (userId = null, projectId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
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
    console.error('Error loading characters from Firestore:', error);
    return [];
  }
};

export const saveCharacter = async (character, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const characterToSave = { ...character, userId: userIdToUse };
    await setDoc(doc(db, 'characters', character.id.toString()), characterToSave);
    return true;
  } catch (error) {
    console.error('Error saving character to Firestore:', error);
    throw error;
  }
};

export const saveCharacters = async (characters, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    for (const character of characters) {
      const characterToSave = { ...character, userId: userIdToUse };
      await setDoc(doc(db, 'characters', character.id.toString()), characterToSave);
    }
    return true;
  } catch (error) {
    console.error('Error saving characters to Firestore:', error);
    throw error;
  }
};

export const deleteCharacter = async (characterId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const characterDoc = await getDoc(doc(db, 'characters', characterId.toString()));
    if (characterDoc.exists() && characterDoc.data().userId === userIdToUse) {
      await deleteDoc(doc(db, 'characters', characterId.toString()));
      return true;
    } else {
      throw new Error('Unauthorized or character not found');
    }
  } catch (error) {
    console.error('Error deleting character from Firestore:', error);
    throw error;
  }
};

// Environment functions
export const loadEnvironments = async (userId = null, projectId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
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
    console.error('Error loading environments from Firestore:', error);
    return [];
  }
};

export const saveEnvironments = async (environments, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    for (const environment of environments) {
      const environmentToSave = { ...environment, userId: userIdToUse };
      await setDoc(doc(db, 'environments', environment.id.toString()), environmentToSave);
    }
    return true;
  } catch (error) {
    console.error('Error saving environments to Firestore:', error);
    throw error;
  }
};

export const deleteEnvironment = async (environmentId, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const environmentDoc = await getDoc(doc(db, 'environments', environmentId.toString()));
    if (environmentDoc.exists() && environmentDoc.data().userId === userIdToUse) {
      await deleteDoc(doc(db, 'environments', environmentId.toString()));
      return true;
    } else {
      throw new Error('Unauthorized or environment not found');
    }
  } catch (error) {
    console.error('Error deleting environment from Firestore:', error);
    throw error;
  }
};

// Map functions
export const loadMapData = async (userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const mapDoc = await getDoc(doc(db, 'maps', userIdToUse));
    if (mapDoc.exists()) {
      const mapData = mapDoc.data();
      return {
        ...mapData,
        imageUrl: mapData.imageUrl || '' // Ensure imageUrl is always a string
      };
    } else {
      console.log('No map data found, returning empty default');
      return { nodes: [], edges: [], imageUrl: '' };
    }
  } catch (error) {
    console.error('Error loading map data from Firestore:', error);
    return { nodes: [], edges: [], imageUrl: '' }; // Return default on error
  }
};

export const saveMapData = async (userId, mapData) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const mapToSave = {
      ...mapData,
      userId: userIdToUse,
      imageUrl: mapData.imageUrl || ''
    };
    await setDoc(doc(db, 'maps', userIdToUse), mapToSave);
    return true;
  } catch (error) {
    console.error('Error saving map data to Firestore:', error);
    throw error;
  }
};

// Timeline functions
export const loadTimelineData = async (userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
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
    console.error('Error loading timeline data from Firestore:', error);
    return { events: [], sequences: ['Main Timeline'] };
  }
};

export const saveTimelineData = async (userId, timelineData) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
    const timelineToSave = { ...timelineData, userId: userIdToUse };
    await setDoc(doc(db, 'timelines', userIdToUse), timelineToSave);
    return true;
  } catch (error) {
    console.error('Error saving timeline data to Firestore:', error);
    throw error;
  }
};

// Export/Import functions
export const exportAllData = async (options = {}) => { // Remove userId since it's handled internally
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = user.uid;
    
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
    console.error('Error exporting data:', error);
    throw error;
  }
};

export const importAllData = async (data, userId = null) => {
  try {
    const user = await ensureAuthenticated();
    const userIdToUse = userId || user.uid;
    
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
    console.error('Error importing data:', error);
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
    
    await getDocs(query(collection(db, 'worlds'), where('userId', '==', user.uid)));
    return { 
      success: true, 
      message: 'Firebase connection successful',
      userId: user.uid
    };
  } catch (error) {
    console.error('Firestore connectivity test failed:', error);
    return { 
      success: false, 
      error: error.message,
      errorCode: error.code,
      authState: auth.currentUser ? 'Logged in' : 'Not logged in'
    };
  }
};