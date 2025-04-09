// src/utils/storage.js
import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { saveMapData } from './storageExports';

export const loadWorlds = async () => {
  try {
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

export const saveWorlds = async (worlds) => {
  try {
    for (const world of worlds) {
      await setDoc(doc(db, 'worlds', world.id.toString()), world);
    }
  } catch (error) {
    console.error('Error saving worlds to Firestore:', error);
    throw error;
  }
};

export const deleteWorld = async (worldId) => {
  try {
    await deleteDoc(doc(db, 'worlds', worldId.toString()));
  } catch (error) {
    console.error('Error deleting world from Firestore:', error);
    throw error;
  }
};

export const loadWorldCampaigns = async (worldId) => {
  try {
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

export const loadCampaign = async (campaignId) => {
  try {
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
    await setDoc(doc(db, 'campaigns', campaign.id.toString()), campaign);
  } catch (error) {
    console.error('Error saving campaign to Firestore:', error);
    throw error;
  }
};

export const deleteCampaign = async (campaignId) => {
  try {
    await deleteDoc(doc(db, 'campaigns', campaignId.toString()));
  } catch (error) {
    console.error('Error deleting campaign from Firestore:', error);
    throw error;
  }
};

export const loadCharacters = async () => {
  try {
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

export const saveCharacter = async (character) => {
  try {
    await setDoc(doc(db, 'characters', character.id.toString()), character);
  } catch (error) {
    console.error('Error saving character to Firestore:', error);
    throw error;
  }
};

export const deleteCharacter = async (characterId) => {
  try {
    await deleteDoc(doc(db, 'characters', characterId.toString()));
  } catch (error) {
    console.error('Error deleting character from Firestore:', error);
    throw error;
  }
};

export const loadMapData = async (mapId) => {
  try {
    const mapDoc = await getDoc(doc(db, 'maps', mapId.toString()));
    if (mapDoc.exists()) {
      return {
        id: mapDoc.id,
        ...mapDoc.data()
      };
    } else {
      console.error(`Map with ID ${mapId} not found`);
      return null;
    }
  } catch (error) {
    console.error('Error loading map data from Firestore:', error);
    throw error;
  }
};

// Export saveMapData
export { saveMapData };