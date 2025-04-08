// src/utils/storageExports.js

// Import all functions from storage.js
import * as StorageFunctions from './storage';

// Export everything from storage
export const {
  // Authentication/User functions
  testStorage,
  getStorageUsage,
  
  // Character functions
  loadCharacters,
  loadCharacter,
  saveCharacter,
  saveCharacters,
  deleteCharacter,
  
  // Environment functions
  loadEnvironments,
  saveEnvironment,
  saveEnvironments,
  deleteEnvironment,
  
  // World functions
  loadWorlds,
  loadWorldById,
  saveWorld,
  saveWorlds,
  deleteWorld,
  
  // Campaign functions
  loadCampaign,
  saveCampaign,
  loadCampaigns,
  loadWorldCampaigns,
  
  // Map functions
  loadMapData,
  saveMapData,
  
  // Timeline functions
  loadTimelineData,
  saveTimelineData,
  loadWorldTimeline,
  
  // Import/Export functions
  exportAllData,
  importAllData
} = StorageFunctions;