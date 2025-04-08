// src/contexts/StorageContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  auth, 
  signIn, 
  signUp, 
  logOut, 
  onAuthStateChanged 
} from '../utils/firebase';
import { 
  loadCharacters, 
  saveCharacter,
  saveCharacters, 
  deleteCharacter,
  loadEnvironments,
  saveEnvironments,
  loadWorlds,
  loadMapData,
  saveMapData,
  loadTimelineData,
  saveTimelineData,
  loadCampaign,
  saveCampaign,
  loadWorldCampaigns
} from '../utils/storage';

const StorageContext = createContext();

export function StorageProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cachedData, setCachedData] = useState({
    characters: null,
    environments: null,
    worlds: null,
    lastFetched: {
      characters: null,
      environments: null,
      worlds: null
    }
  });

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Auth functions
  const login = async (email, password) => {
    try {
      setError(null);
      await signIn(email, password);
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  const signup = async (email, password) => {
    try {
      setError(null);
      await signUp(email, password);
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await logOut();
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  // Character functions
  const getCharacters = async (forceRefresh = false) => {
    if (!currentUser) return [];
    
    // Check cache first
    const now = new Date();
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    if (!forceRefresh && 
        cachedData.characters && 
        cachedData.lastFetched.characters && 
        (now - cachedData.lastFetched.characters) < cacheExpiry) {
      return cachedData.characters;
    }
    
    try {
      // Fetch from Firestore
      const characters = await loadCharacters(currentUser.uid);
      
      // Update cache
      setCachedData(prev => ({
        ...prev,
        characters,
        lastFetched: {
          ...prev.lastFetched,
          characters: now
        }
      }));
      
      return characters;
    } catch (error) {
      console.error("Error fetching characters:", error);
      throw error;
    }
  };

  const saveAllCharacters = async (characters) => {
    if (!currentUser) return false;
    try {
      await saveCharacters(currentUser.uid, characters);
      
      // Update cache
      setCachedData(prev => ({
        ...prev,
        characters,
        lastFetched: {
          ...prev.lastFetched,
          characters: new Date()
        }
      }));
      
      return true;
    } catch (error) {
      console.error("Error saving characters:", error);
      throw error;
    }
  };

  const saveOneCharacter = async (character) => {
    if (!currentUser) return false;
    try {
      await saveCharacter(character);
      
      // Update the cache if it exists
      if (cachedData.characters) {
        const updatedCharacters = [...cachedData.characters];
        const index = updatedCharacters.findIndex(c => c.id === character.id);
        
        if (index >= 0) {
          updatedCharacters[index] = character;
        } else {
          updatedCharacters.push(character);
        }
        
        setCachedData(prev => ({
          ...prev,
          characters: updatedCharacters,
          lastFetched: {
            ...prev.lastFetched,
            characters: new Date()
          }
        }));
      }
      
      return true;
    } catch (error) {
      console.error("Error saving character:", error);
      throw error;
    }
  };

  const removeCharacter = async (characterId) => {
    if (!currentUser) return false;
    try {
      await deleteCharacter(characterId);
      
      // Update cache if it exists
      if (cachedData.characters) {
        setCachedData(prev => ({
          ...prev,
          characters: prev.characters.filter(c => c.id !== characterId),
          lastFetched: {
            ...prev.lastFetched,
            characters: new Date()
          }
        }));
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting character:", error);
      throw error;
    }
  };

  // Environment functions
  const getEnvironments = async (forceRefresh = false) => {
    if (!currentUser) return [];
    
    // Similar cache logic as characters
    const now = new Date();
    const cacheExpiry = 5 * 60 * 1000;
    
    if (!forceRefresh && 
        cachedData.environments && 
        cachedData.lastFetched.environments && 
        (now - cachedData.lastFetched.environments) < cacheExpiry) {
      return cachedData.environments;
    }
    
    try {
      const environments = await loadEnvironments(currentUser.uid);
      
      setCachedData(prev => ({
        ...prev,
        environments,
        lastFetched: {
          ...prev.lastFetched,
          environments: now
        }
      }));
      
      return environments;
    } catch (error) {
      console.error("Error fetching environments:", error);
      throw error;
    }
  };

  const saveAllEnvironments = async (environments) => {
    if (!currentUser) return false;
    try {
      await saveEnvironments(currentUser.uid, environments);
      
      setCachedData(prev => ({
        ...prev,
        environments,
        lastFetched: {
          ...prev.lastFetched,
          environments: new Date()
        }
      }));
      
      return true;
    } catch (error) {
      console.error("Error saving environments:", error);
      throw error;
    }
  };

  // World functions
  const getWorlds = async (forceRefresh = false) => {
    if (!currentUser) return [];
    
    // Cache check
    const now = new Date();
    const cacheExpiry = 5 * 60 * 1000;
    
    if (!forceRefresh && 
        cachedData.worlds && 
        cachedData.lastFetched.worlds && 
        (now - cachedData.lastFetched.worlds) < cacheExpiry) {
      return cachedData.worlds;
    }
    
    try {
      const worlds = await loadWorlds(currentUser.uid);
      
      setCachedData(prev => ({
        ...prev,
        worlds,
        lastFetched: {
          ...prev.lastFetched,
          worlds: now
        }
      }));
      
      return worlds;
    } catch (error) {
      console.error("Error fetching worlds:", error);
      throw error;
    }
  };

  // Map data functions
  const getMapData = async () => {
    if (!currentUser) return { nodes: [], edges: [] };
    
    try {
      return await loadMapData(currentUser.uid);
    } catch (error) {
      console.error("Error loading map data:", error);
      throw error;
    }
  };

  const updateMapData = async (mapData) => {
    if (!currentUser) return false;
    
    try {
      return await saveMapData(currentUser.uid, mapData);
    } catch (error) {
      console.error("Error saving map data:", error);
      throw error;
    }
  };

  // Timeline functions
  const getTimelineData = async () => {
    if (!currentUser) return { events: [], sequences: ['Main Timeline'] };
    
    try {
      return await loadTimelineData(currentUser.uid);
    } catch (error) {
      console.error("Error loading timeline data:", error);
      throw error;
    }
  };

  const updateTimelineData = async (timelineData) => {
    if (!currentUser) return false;
    
    try {
      return await saveTimelineData(currentUser.uid, timelineData);
    } catch (error) {
      console.error("Error saving timeline data:", error);
      throw error;
    }
  };

  // Campaign functions
  const getCampaign = async (campaignId) => {
    if (!currentUser) return null;
    
    try {
      return await loadCampaign(campaignId);
    } catch (error) {
      console.error(`Error loading campaign ${campaignId}:`, error);
      throw error;
    }
  };

  const updateCampaign = async (campaign) => {
    if (!currentUser) return false;
    
    try {
      return await saveCampaign(campaign);
    } catch (error) {
      console.error("Error saving campaign:", error);
      throw error;
    }
  };

  const getWorldCampaigns = async (worldId) => {
    if (!currentUser) return [];
    
    try {
      return await loadWorldCampaigns(worldId);
    } catch (error) {
      console.error(`Error loading campaigns for world ${worldId}:`, error);
      throw error;
    }
  };

  // Provide all functionality through the context
  const value = {
    currentUser,
    isLoading,
    error,
    login,
    signup,
    logout,
    getCharacters,
    saveAllCharacters,
    saveOneCharacter,
    removeCharacter,
    getEnvironments,
    saveAllEnvironments,
    getWorlds,
    getMapData,
    updateMapData,
    getTimelineData,
    updateTimelineData,
    getCampaign,
    updateCampaign,
    getWorldCampaigns
  };

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  return useContext(StorageContext);
}