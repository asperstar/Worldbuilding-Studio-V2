// src/utils/dataMigration.js
import { 
  saveCharacters, 
  saveEnvironments, 
  saveWorlds, 
  saveMapData, 
  saveTimelineData 
} from './firebaseStorage';

export const migrateLocalStorageToFirebase = async () => {
  try {
    // Load from localStorage
    const characters = JSON.parse(localStorage.getItem('worldbuilding-characters') || '[]');
    const environments = JSON.parse(localStorage.getItem('worldbuilding-environments') || '[]');
    const worlds = JSON.parse(localStorage.getItem('worldbuilding-worlds') || '[]');
    const mapData = JSON.parse(localStorage.getItem('worldbuilding-map') || '{"nodes":[],"edges":[]}');
    const timelineData = JSON.parse(localStorage.getItem('worldbuilding-timeline') || '{"events":[],"sequences":["Main Timeline"]}');
    
    // Save to Firebase
    const results = await Promise.all([
      saveCharacters(characters),
      saveEnvironments(environments),
      saveWorlds(worlds),
      saveMapData(mapData),
      saveTimelineData(timelineData)
    ]);
    
    // Check if all operations succeeded
    const success = results.every(result => result === true);
    
    return { 
      success, 
      migrated: {
        characters: characters.length,
        environments: environments.length,
        worlds: worlds.length,
        hasMapData: mapData.nodes.length > 0,
        hasTimelineData: timelineData.events.length > 0
      }
    };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error: error.message };
  }
};