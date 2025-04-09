// src/utils/storage.js
import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const auth = getAuth();

// Helper function to ensure user is authenticated
const ensureAuthenticated = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
};

// World functions
export const loadWorlds = async () => {
  try {
    ensureAuthenticated();
    const worldsSnapshot = await getDocs(collection(db, 'worlds'));
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

export const loadWorldById = async (worldId) => {
  try {
    ensureAuthenticated();
    const worldDoc = await getDoc(doc(db, 'worlds', worldId.toString()));
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
    console.error('Error loading world from Firestore:', error);
    throw error;
  }
};

export const saveWorlds = async (worlds) => {
  try {
    ensureAuthenticated();
    for (const world of worlds) {
      await setDoc(doc(db, 'worlds', world.id.toString()), world);
    }
    return true;
  } catch (error) {
    console.error('Error saving worlds to Firestore:', error);
    throw error;
  }
};

export const deleteWorld = async (worldId) => {
  try {
    ensureAuthenticated();
    await deleteDoc(doc(db, 'worlds', worldId.toString()));
    return true;
  } catch (error) {
    console.error('Error deleting world from Firestore:', error);
    throw error;
  }
};

// Campaign functions
export const loadWorldCampaigns = async (worldId) => {
  try {
    ensureAuthenticated();
    const campaignsQuery = query(
      collection(db, 'campaigns'),
      where('worldId', '==', parseInt(worldId))
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

export const loadCampaigns = async () => {
  try {
    ensureAuthenticated();
    const campaignsSnapshot = await getDocs(collection(db, 'campaigns'));
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

export const loadCampaign = async (campaignId) => {
  try {
    ensureAuthenticated();
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId.toString()));
    if (campaignDoc.exists()) {
      return {
        id: campaignDoc.id,
        ...campaignDoc.data()
      };
    } else {
      console.error(`Campaign with ID ${campaignId} not found`);
      return null;
    }
  } catch (error) {
    console.error('Error loading campaign from Firestore:', error);
    throw error;
  }
};

export const saveCampaign = async (campaign) => {
  try {
    ensureAuthenticated();
    await setDoc(doc(db, 'campaigns', campaign.id.toString()), campaign);
    return true;
  } catch (error) {
    console.error('Error saving campaign to Firestore:', error);
    throw error;
  }
};

export const deleteCampaign = async (campaignId) => {
  try {
    ensureAuthenticated();
    await deleteDoc(doc(db, 'campaigns', campaignId.toString()));
    return true;
  } catch (error) {
    console.error('Error deleting campaign from Firestore:', error);
    throw error;
  }
};

// Character functions
export const loadCharacters = async () => {
  try {
    ensureAuthenticated();
    const charactersSnapshot = await getDocs(collection(db, 'characters'));
    const characters = charactersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return characters;
  } catch (error) {
    console.error('Error loading characters from Firestore:', error);
    throw error;
  }
};

export const loadCharacter = async (characterId) => {
  try {
    ensureAuthenticated();
    const characterDoc = await getDoc(doc(db, 'characters', characterId.toString()));
    if (characterDoc.exists()) {
      return {
        id: characterDoc.id,
        ...characterDoc.data()
      };
    } else {
      console.error(`Character with ID ${characterId} not found`);
      return null;
    }
  } catch (error) {
    console.error('Error loading character from Firestore:', error);
    throw error;
  }
};

export const saveCharacter = async (character) => {
  try {
    ensureAuthenticated();
    await setDoc(doc(db, 'characters', character.id.toString()), character);
    return true;
  } catch (error) {
    console.error('Error saving character to Firestore:', error);
    throw error;
  }
};

export const saveCharacters = async (characters) => {
  try {
    ensureAuthenticated();
    for (const character of characters) {
      await setDoc(doc(db, 'characters', character.id.toString()), character);
    }
    return true;
  } catch (error) {
    console.error('Error saving characters to Firestore:', error);
    throw error;
  }
};

export const deleteCharacter = async (characterId) => {
  try {
    ensureAuthenticated();
    await deleteDoc(doc(db, 'characters', characterId.toString()));
    return true;
  } catch (error) {
    console.error('Error deleting character from Firestore:', error);
    throw error;
  }
};

// Environment functions
export const loadEnvironments = async () => {
  try {
    ensureAuthenticated();
    const environmentsSnapshot = await getDocs(collection(db, 'environments'));
    const environments = environmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return environments;
  } catch (error) {
    console.error('Error loading environments from Firestore:', error);
    throw error;
  }
};

export const saveEnvironments = async (environments) => {
  try {
    ensureAuthenticated();
    for (const environment of environments) {
      await setDoc(doc(db, 'environments', environment.id.toString()), environment);
    }
    return true;
  } catch (error) {
    console.error('Error saving environments to Firestore:', error);
    throw error;
  }
};

export const deleteEnvironment = async (environmentId) => {
  try {
    ensureAuthenticated();
    await deleteDoc(doc(db, 'environments', environmentId.toString()));
    return true;
  } catch (error) {
    console.error('Error deleting environment from Firestore:', error);
    throw error;
  }
};

// Map functions
export const loadMapData = async () => {
  try {
    ensureAuthenticated();
    const mapDoc = await getDoc(doc(db, 'maps', 'default'));
    if (mapDoc.exists()) {
      return mapDoc.data();
    } else {
      console.log('No map data found, returning empty default');
      return { nodes: [], edges: [] };
    }
  } catch (error) {
    console.error('Error loading map data from Firestore:', error);
    throw error;
  }
};

export const saveMapData = async (mapData) => {
  try {
    const user = ensureAuthenticated();
    const mapToSave = {
      ...mapData,
      imageUrl: mapData.imageUrl || '',
      userId: user.uid // Add userId to scope the data
    };
    await setDoc(doc(db, 'maps', 'default'), mapToSave);
    return true;
  } catch (error) {
    console.error('Error saving map data to Firestore:', error);
    throw error;
  }
};

// Timeline functions
export const loadTimelineData = async () => {
  try {
    ensureAuthenticated();
    const timelineDoc = await getDoc(doc(db, 'timelines', 'default'));
    if (timelineDoc.exists()) {
      return timelineDoc.data();
    } else {
      return { events: [], sequences: ['Main Timeline'] };
    }
  } catch (error) {
    console.error('Error loading timeline data from Firestore:', error);
    throw error;
  }
};

export const saveTimelineData = async (timelineData) => {
  try {
    ensureAuthenticated();
    await setDoc(doc(db, 'timelines', 'default'), timelineData);
    return true;
  } catch (error) {
    console.error('Error saving timeline data to Firestore:', error);
    throw error;
  }
};

// Helper functions
export const loadWorldTimeline = async (worldId) => {
  try {
    ensureAuthenticated();
    const timelineDoc = await getDoc(doc(db, 'timelines', `world_${worldId}`));
    if (timelineDoc.exists()) {
      return timelineDoc.data();
    } else {
      return { events: [], sequences: ['Main Timeline'] };
    }
  } catch (error) {
    console.error('Error loading world timeline data from Firestore:', error);
    throw error;
  }
};

export const getCharacterById = async (characterId) => {
  return await loadCharacter(characterId);
};

export const getWorldById = async (worldId) => {
  return await loadWorldById(worldId);
};

export const getEnvironmentById = async (environmentId) => {
  try {
    ensureAuthenticated();
    const environmentDoc = await getDoc(doc(db, 'environments', environmentId.toString()));
    if (environmentDoc.exists()) {
      return {
        id: environmentDoc.id,
        ...environmentDoc.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error loading environment from Firestore:', error);
    throw error;
  }
};

export const getCampaignById = async (campaignId) => {
  return await loadCampaign(campaignId);
};

export const getCharacterRelationships = async (characterId) => {
  try {
    ensureAuthenticated();
    const characterDoc = await loadCharacter(characterId);
    return characterDoc?.relationships || [];
  } catch (error) {
    console.error('Error loading character relationships from Firestore:', error);
    return [];
  }
};

export const testStorage = async () => {
  try {
    await getDocs(collection(db, 'worlds'));
    return { success: true, message: 'Firebase connection successful' };
  } catch (error) {
    console.error('Firestore connectivity test failed:', error);
    return { success: false, error: error.message };
  }
};

// Export all methods used throughout your app
export const exportAllData = async (options = {}) => {
  try {
    ensureAuthenticated();
    const data = {};
    
    if (options.characters) {
      data.characters = await loadCharacters();
    }
    
    if (options.environments) {
      data.environments = await loadEnvironments();
    }
    
    if (options.worlds) {
      data.worlds = await loadWorlds();
    }
    
    if (options.campaigns) {
      data.campaigns = await loadCampaigns();
    }
    
    if (options.map) {
      data.mapData = await loadMapData();
    }
    
    if (options.timeline) {
      data.timelineData = await loadTimelineData();
    }
    
    return data;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

export const importAllData = async (data) => {
  try {
    ensureAuthenticated();
    const results = [];
    
    if (data.characters) {
      results.push(await saveCharacters(data.characters));
    }
    
    if (data.environments) {
      results.push(await saveEnvironments(data.environments));
    }
    
    if (data.worlds) {
      results.push(await saveWorlds(data.worlds));
    }
    
    if (data.campaigns) {
      for (const campaign of data.campaigns) {
        results.push(await saveCampaign(campaign));
      }
    }
    
    if (data.mapData) {
      results.push(await saveMapData(data.mapData));
    }
    
    if (data.timelineData) {
      results.push(await saveTimelineData(data.timelineData));
    }
    
    return results.every(result => result === true);
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
};