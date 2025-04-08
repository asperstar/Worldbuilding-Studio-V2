// src/models/WorldModel.js
export const createWorldModel = (data = {}) => {
    return {
      id: Date.now(),
      name: data.name || 'New World',
      description: data.description || '',
      rules: data.rules || '',
      lore: data.lore || '',
      imageUrl: data.imageUrl || '',
      environmentIds: data.environmentIds || [],
      characterIds: data.characterIds || [],
      campaignIds: data.campaignIds || [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
  };