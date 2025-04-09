// src/utils/storage.js
import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
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

export const saveCampaign = async (campaign) => {
  try {
    await setDoc(doc(db, 'campaigns', campaign.id.toString()), campaign);
  } catch (error) {
    console.error('Error saving campaign to Firestore:', error);
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

export const deleteCampaign = async (campaignId) => {
  try {
    await deleteDoc(doc(db, 'campaigns', campaignId.toString()));
  } catch (error) {
    console.error('Error deleting campaign from Firestore:', error);
    throw error;
  }
};

// Export saveMapData
export { saveMapData, loadCampaign, saveWorld};