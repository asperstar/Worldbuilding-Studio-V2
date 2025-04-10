/* eslint-disable no-undef*/

import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc } from 'firebase/firestore'; // Added updateDoc
import { db } from '../firebase';

import {
  loadCharacters,
  saveCharacter,
  saveCharacters,
  deleteCharacter,
  loadEnvironments,
  saveEnvironments,
  loadWorlds,
  saveMapData,
  loadMapData,
  loadTimelineData,
  saveTimelineData,
  loadCampaign,
  saveCampaign,
  loadWorldCampaigns,
  testStorage
} from '../utils/storageExports';

const StorageContext = createContext();

export function StorageProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [firebaseStatus, setFirebaseStatus] = useState({ tested: false, working: false });
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
    // Auth state listener
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log('onAuthStateChanged: User state:', user); // Debug log
        setCurrentUser(user);
        setIsLoading(false);
      },
      (authError) => {
        console.error('onAuthStateChanged error:', authError); // Debug log
        setError(authError.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const testFirebaseConnection = async () => {
    try {
      const result = await testStorage();
      // Update state in a safer way
      setFirebaseStatus((prev) => ({
        ...prev,
        tested: true,
        working: result.success
      }));
  
      if (!result.success) {
        console.error('Firebase connection test failed:', result.error);
        setError(`Firebase connection error: ${result.error}`);
      } else {
        setError(null);
      }
      return result.success;
    } catch (err) {
      console.error('Error during Firebase connection test:', err);
      setFirebaseStatus((prev) => ({
        ...prev,
        tested: true,
        working: false
      }));
      setError(`Failed to test Firebase connection: ${err.message}`);
      return false;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      await testFirebaseConnection();
      return true;
    } catch (error) {
      let errorMessage = 'Authentication failed';
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        default:
          errorMessage = error.message || 'Authentication failed';
      }
      setError(errorMessage);
      return false;
    }
  };

  const signup = async (email, password) => {
    try {
      setError(null);
      await createUserWithEmailAndPassword(auth, email, password);
      await testFirebaseConnection();
      return true;
    } catch (error) {
      let errorMessage = 'Registration failed';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already in use.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use at least 6 characters.';
          break;
        default:
          errorMessage = error.message || 'Registration failed';
      }
      setError(errorMessage);
      return false;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setCachedData({
        characters: null,
        environments: null,
        worlds: null,
        lastFetched: {
          characters: null,
          environments: null,
          worlds: null
        }
      });
      return true;
    } catch (error) {
      setError(`Logout error: ${error.message}`);
      return false;
    }
  };

  const sendPasswordReset = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      let errorMessage = 'Failed to send password reset email';
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        default:
          errorMessage = error.message || 'Failed to send password reset email';
      }
      setError(errorMessage);
      return false;
    }
  };

  const getCharacters = async (projectId, forceRefresh = false) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return [];
    }

    const now = new Date();
    const cacheExpiry = 5 * 60 * 1000;

    if (
      !forceRefresh &&
      cachedData.characters &&
      cachedData.lastFetched.characters &&
      now - cachedData.lastFetched.characters < cacheExpiry
    ) {
      return cachedData.characters;
    }

    try {
      const characters = await loadCharacters(currentUser.uid, projectId || null);
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
      console.error('Error fetching characters:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else if (error.code === 'unavailable') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to fetch characters. Please try again.');
      }
      return [];
    }
  };

  const getAllCharacters = async (forceRefresh = false) => {
    return getCharacters(null, forceRefresh);
  };

  const saveAllCharacters = async (characters) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return false;
    }
    try {
      await saveCharacters(characters, currentUser.uid); // Pass UID instead of currentUser
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
      console.error('Error saving characters:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to save characters. Please try again.');
      }
      return false;
    }
  };

  const saveOneCharacter = async (character) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      console.error('saveOneCharacter: No authenticated user');
      return false;
    }
    try {
      console.log('saveOneCharacter: Saving character with data:', character);
      console.log('saveOneCharacter: Authenticated user UID:', currentUser.uid);
      await saveCharacter(character, currentUser.uid);
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
      console.error('Error saving character:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to save character. Please try again.');
      }
      return false;
    }
  };

  const removeCharacter = async (characterId) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return false;
    }
    try {
      await deleteCharacter(characterId);
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
      console.error('Error deleting character:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to delete character. Please try again.');
      }
      return false;
    }
  };

  const getEnvironments = async (projectId, forceRefresh = false) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return [];
    }

    const now = new Date();
    const cacheExpiry = 5 * 60 * 1000;

    if (
      !forceRefresh &&
      cachedData.environments &&
      cachedData.lastFetched.environments &&
      now - cachedData.lastFetched.environments < cacheExpiry
    ) {
      return cachedData.environments;
    }

    try {
      const environments = await loadEnvironments(currentUser.uid, projectId || null);
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
      console.error('Error fetching environments:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else if (error.code === 'unavailable') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to fetch environments. Please try again.');
      }
      return [];
    }
  };

  const getAllEnvironments = async (forceRefresh = false) => {
    return getEnvironments(null, forceRefresh);
  };

  const saveAllEnvironments = async (environments) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return false;
    }
    try {
      await saveEnvironments(environments, currentUser.uid); // Pass UID instead of currentUser
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
      console.error('Error saving environments:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to save environments. Please try again.');
      }
      return false;
    }
  };

  const getWorldById = async (worldId) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return null;
    }
    try {
      const worldRef = doc(db, 'worlds', worldId);
      const worldSnap = await getDoc(worldRef);
      if (worldSnap.exists()) {
        return { id: worldSnap.id, ...worldSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching world by ID:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to fetch world. Please try again.');
      }
      return null;
    }
  };

  const getWorlds = async (forceRefresh = false) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return [];
    }

    const now = new Date();
    const cacheExpiry = 5 * 60 * 1000;

    if (
      !forceRefresh &&
      cachedData.worlds &&
      cachedData.lastFetched.worlds &&
      now - cachedData.lastFetched.worlds < cacheExpiry
    ) {
      return cachedData.worlds;
    }

    try {
      const worlds = await loadWorlds();
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
      console.error('Error fetching worlds:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else if (error.code === 'unavailable') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to fetch worlds. Please try again.');
      }
      return [];
    }
  };

  const getMapData = async () => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return { nodes: [], edges: [] };
    }

    try {
      const mapData = await loadMapData();
      console.log('Map data fetched in getMapData:', mapData);
      return mapData;
    } catch (error) {
      console.error('Error loading map data:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to load map data. Please try again.');
      }
      return { nodes: [], edges: [], imageUrl: '' };
    }
  };

  const updateMapData = async (mapData) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return false;
    }

    try {
      return await saveMapData(currentUser.uid, mapData);
    } catch (error) {
      console.error('Error saving map data:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to save map data. Please try again.');
      }
      return false;
    }
  };

  const getTimelineData = async () => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return { events: [], sequences: ['Main Timeline'] };
    }

    try {
      return await loadTimelineData();
    } catch (error) {
      console.error('Error loading timeline data:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to load timeline data. Please try again.');
      }
      return { events: [], sequences: ['Main Timeline'] };
    }
  };

  const updateTimelineData = async (timelineData) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return false;
    }

    try {
      return await saveTimelineData(currentUser.uid, timelineData);
    } catch (error) {
      console.error('Error saving timeline data:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to save timeline data. Please try again.');
      }
      return false;
    }
  };

  const getCampaignById = async (campaignId) => { // Renamed to getCampaignById for consistency
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return null;
    }

    try {
      return await loadCampaign(campaignId);
    } catch (error) {
      console.error(`Error loading campaign ${campaignId}:`, error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to load campaign. Please try again.');
      }
      return null;
    }
  };

  const updateCampaign = async (campaign) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      console.error('updateCampaign: No authenticated user');
      return false;
    }
    try {
      console.log('updateCampaign: Saving campaign with data:', campaign);
      console.log('updateCampaign: Authenticated user UID:', currentUser.uid);
      const success = await saveCampaign(campaign, currentUser.uid);
      return success;
    } catch (error) {
      console.error('Error saving campaign:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to save campaign. Please try again.');
      }
      return false;
    }
  };

  const updateCampaignSession = async (campaignId, sessionMessages) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      console.error('updateCampaignSession: No authenticated user');
      return false;
    }
    try {
      console.log('updateCampaignSession: Updating campaign with ID:', campaignId);
      console.log('updateCampaignSession: Session messages:', sessionMessages);
      const campaignRef = doc(db, 'campaigns', campaignId);
      await updateDoc(campaignRef, {
        sessionMessages,
        updated: new Date().toISOString(),
        userId: currentUser.uid
      });
      console.log(`Campaign session ${campaignId} updated successfully`);
      return true;
    } catch (error) {
      console.error('Error updating campaign session:', error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to update campaign session. Please try again.');
      }
      return false;
    }
  };

  const getWorldCampaigns = async (worldId) => {
    if (!currentUser) {
      setError('User not authenticated. Please log in.');
      return [];
    }

    try {
      return await loadWorldCampaigns(worldId);
    } catch (error) {
      console.error(`Error loading campaigns for world ${worldId}:`, error);
      if (error.message.includes('not authenticated') || error.message.includes('Missing or insufficient permissions')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to load campaigns for world. Please try again.');
      }
      return [];
    }
  };

  const value = {
    currentUser,
    isLoading,
    error,
    firebaseStatus,
    testFirebaseConnection,
    login,
    signup,
    logout,
    sendPasswordReset,
    getCharacters,
    getAllCharacters,
    saveAllCharacters,
    saveOneCharacter,
    removeCharacter,
    getEnvironments,
    getAllEnvironments,
    saveAllEnvironments,
    getWorldById,
    getWorlds,
    getMapData,
    updateMapData,
    getTimelineData,
    updateTimelineData,
    getCampaignById, // Updated name
    updateCampaign,
    updateCampaignSession, // Added
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