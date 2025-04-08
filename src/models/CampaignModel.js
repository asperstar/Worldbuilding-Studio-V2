// src/models/CampaignModel.js
export const createCampaignModel = (worldId, data = {}) => {
    return {
      id: Date.now(),
      worldId,
      name: data.name || 'New Campaign',
      description: data.description || '',
      gameMasterId: data.gameMasterId || null, // Character ID or null if user is GM
      participantIds: data.participantIds || [], // Character IDs
      scenes: data.scenes || [{
        id: Date.now(),
        title: 'Introduction',
        description: 'The beginning of your adventure',
        environmentId: null,
        characterIds: [],
        challenges: []
      }],
      currentSceneIndex: 0,
      status: 'planning', // planning, active, completed
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      sessions: []
    };
  };
  
  export const createSceneModel = (data = {}) => {
    return {
      id: Date.now(),
      title: data.title || 'New Scene',
      description: data.description || '',
      environmentId: data.environmentId || null,
      characterIds: data.characterIds || [], // Character IDs in this scene
      npcs: data.npcs || [], // Non-player character IDs
      challenges: data.challenges || [],
      notes: data.notes || '',
      imageUrl: data.imageUrl || ''
    };
  };
  
  export const createChallengeModel = (data = {}) => {
    return {
      id: Date.now(),
      title: data.title || 'New Challenge',
      description: data.description || '',
      type: data.type || 'obstacle', // obstacle, puzzle, combat, social
      difficulty: data.difficulty || 'medium', // easy, medium, hard
      status: 'active', // active, completed, failed
      rewards: data.rewards || '',
      created: new Date().toISOString()
    };
  };