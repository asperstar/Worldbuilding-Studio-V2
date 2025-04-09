// src/utils/migrateToFirestore.js
import { loadWorlds as loadWorldsLocal, loadWorldCampaigns as loadWorldCampaignsLocal, loadCharacters as loadCharactersLocal } from './storageLocal';
import { saveWorlds, saveCampaign, saveCharacter } from './storage';

export const migrateToFirestore = async () => {
  try {
    // Load data from localStorage
    const worlds = await loadWorldsLocal();
    const characters = await loadCharactersLocal();

    // Save worlds to Firestore
    if (worlds && worlds.length > 0) {
      await saveWorlds(worlds);
      console.log('Migrated worlds:', worlds);
    }

    // Load and save campaigns for each world
    for (const world of worlds) {
      const campaigns = await loadWorldCampaignsLocal(world.id);
      if (campaigns && campaigns.length > 0) {
        for (const campaign of campaigns) {
          await saveCampaign(campaign);
        }
        console.log(`Migrated campaigns for world ${world.id}:`, campaigns);
      }
    }

    // Save characters to Firestore
    if (characters && characters.length > 0) {
      for (const character of characters) {
        await saveCharacter(character);
      }
      console.log('Migrated characters:', characters);
    }

    console.log('Migration to Firestore completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  }
};