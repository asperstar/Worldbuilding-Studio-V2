// src/utils/storageLocal.js
export const loadWorlds = () => {
    const worlds = localStorage.getItem('worldbuilding-worlds');
    return worlds ? JSON.parse(worlds) : [];
  };
  
  export const loadWorldCampaigns = (worldId) => {
    const campaigns = localStorage.getItem(`worldbuilding-campaigns-world-${worldId}`);
    return campaigns ? JSON.parse(campaigns) : [];
  };
  
  export const loadCharacters = () => {
    const characters = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('worldbuilding-character-')) {
        const character = JSON.parse(localStorage.getItem(key));
        characters.push(character);
      }
    }
    return characters;
  };