// src/utils/storageExports.js

// This file serves as a barrel export to centralize all storage functionality
import {
  loadCharacters,
  saveCharacter,
  saveCharacters,
  deleteCharacter,
  loadEnvironments,
  saveEnvironments,
  deleteEnvironment,
  loadWorlds,
  loadWorldById,
  saveWorlds,
  deleteWorld,
  loadMapData,
  saveMapData,
  loadTimelineData,
  saveTimelineData,
  loadWorldCampaigns,
  loadCampaign,
  loadCampaigns,
  saveCampaign,
  deleteCampaign,
  exportAllData,
  importAllData,
  testStorage
} from './storage';

// Re-export all functions
export {
  loadCharacters,
  saveCharacter,
  saveCharacters,
  deleteCharacter,
  loadEnvironments,
  saveEnvironments,
  deleteEnvironment,
  loadWorlds,
  loadWorldById,
  saveWorlds,
  deleteWorld,
  loadMapData,
  saveMapData,
  loadTimelineData,
  saveTimelineData,
  loadWorldCampaigns,
  loadCampaign,
  loadCampaigns,
  saveCampaign,
  deleteCampaign,
  exportAllData,
  importAllData,
  testStorage
};