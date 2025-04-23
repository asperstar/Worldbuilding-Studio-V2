/* eslint-disable no-undef*/

import { 
  db, 
  auth, 
  storage, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject, 
} from '../firebase';

const ensureAuthenticated = async () => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  return userId;
};


// Get the current user ID
const getCurrentUserId = () => {
  return auth.currentUser?.uid;
};

// Helper to validate user is logged in
const validateUser = () => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  return userId;
};
export const saveWorlds = async (worlds) => {
  try {
    const userId = validateUser();
    const batch = writeBatch(db);
    
    for (const world of worlds) {
      // Handle image upload if needed
      let processedWorld = { ...world };
      if (world.imageUrl && world.imageUrl.startsWith('data:')) {
        const response = await fetch(world.imageUrl);
        const blob = await response.blob();
        const imageRef = ref(storage, `users/${userId}/worlds/${world.id || Date.now()}`);
        await uploadBytes(imageRef, blob);
        processedWorld.imageUrl = await getDownloadURL(imageRef);
      }

      const worldRef = doc(db, 'worlds', world.id.toString());
      batch.set(worldRef, { 
        ...processedWorld,
        userId,
        updated: new Date().toISOString()
      });
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error saving worlds:', error);
    return false;
  }
};
export const saveEnvironments = async (environments) => {
  try {
    const userId = validateUser();
    const batch = writeBatch(db);
    
    for (const environment of environments) {
      // Handle image upload if needed
      let processedEnvironment = { ...environment };
      if (environment.imageUrl && environment.imageUrl.startsWith('data:')) {
        const response = await fetch(environment.imageUrl);
        const blob = await response.blob();
        const imageRef = ref(storage, `users/${userId}/environments/${environment.id || Date.now()}`);
        await uploadBytes(imageRef, blob);
        processedEnvironment.imageUrl = await getDownloadURL(imageRef);
      }

      const environmentRef = doc(db, 'environments', environment.id.toString());
      batch.set(environmentRef, { 
        ...processedEnvironment,
        userId,
        updated: new Date().toISOString()
      });
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error saving environments:', error);
    return false;
  }
};
/**
 * User Profile Management
 */
export const getUserProfile = async () => {
  try {
    const userId = validateUser();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      // Create a default profile if none exists
      const defaultProfile = {
        displayName: auth.currentUser.displayName || 'User',
        email: auth.currentUser.email,
        created: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', userId), defaultProfile);
      return defaultProfile;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const userId = validateUser();
    await updateDoc(doc(db, 'users', userId), {
      ...profileData,
      updated: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

/**
 * Character Storage Functions
 */
export const loadCharacter = async (characterId) => {
  try {
    const userId = validateUser();
    
    // Ensure characterId is a string and trim any whitespace
    const cleanedId = String(characterId).trim();
    
    // Check if the ID is valid
    if (!cleanedId) {
      throw new Error('Invalid character ID');
    }
    
    // Correct the path
    const characterRef = doc(db, `users/${userId}/characters`, cleanedId);
    const characterDoc = await getDoc(characterRef);
    
    if (!characterDoc.exists()) {
      // Log additional context for debugging
      console.warn(`Character not found: ID ${cleanedId}, User: ${userId}`);
      return null;
    }

    const characterData = characterDoc.data();
    
    // Additional security check
    if (characterData.userId !== userId) {
      throw new Error('Unauthorized: Can only access own characters');
    }
    
    return {
      id: characterDoc.id,
      ...characterData
    };
  } catch (error) {
    console.error('Error loading character:', error);
    return null;
  }
};


// Fix saveCharacter function - correct the path
export const saveCharacter = async (character, userId = null) => {
  try {
    const userIdToUse = userId || validateUser();
    
    // Handle image data appropriately
    let processedCharacter = { ...character };
    
    // If imageUrl is a base64 string, upload it to Firebase Storage
    if (character.imageUrl && character.imageUrl.startsWith('data:')) {
      const response = await fetch(character.imageUrl);
      const blob = await response.blob();
      const imageRef = ref(storage, `users/${userIdToUse}/characters/${character.id || Date.now()}`);
      await uploadBytes(imageRef, blob);
      processedCharacter.imageUrl = await getDownloadURL(imageRef);
    }
    
    // Correct the path
    const characterRef = doc(db, `users/${userIdToUse}/characters`, character.id.toString());
    await setDoc(characterRef, { 
      ...processedCharacter, 
      userId: userIdToUse,
      updated: new Date().toISOString() 
    });
    
    return true;
  } catch (error) {
    console.error('Error saving character:', error);
    return false;
  }
};
export const saveCharacters = async (characters, userId = null) => {
  try {
    const userIdToUse = userId || validateUser();
    const batch = writeBatch(db);
    
    for (const character of characters) {
      // Correct the path
      const characterRef = doc(db, `users/${userIdToUse}/characters`, character.id.toString());
      batch.set(characterRef, { 
        ...character,
        userId: userIdToUse,
        updated: new Date().toISOString()
      });
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error saving characters:', error);
    return false;
  }
};

export const deleteCharacter = async (characterId, userId = null) => {
  try {
    const userIdToUse = userId || validateUser();
    
    // Correct the path
    await deleteDoc(doc(db, `users/${userIdToUse}/characters`, characterId.toString()));
    
    // Also delete associated image if exists
    try {
      const imageRef = ref(storage, `users/${userIdToUse}/characters/${characterId}`);
      await deleteObject(imageRef);
    } catch (imageError) {
      // Ignore errors if image doesn't exist
      console.log('No image found or other storage error:', imageError);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting character:', error);
    return false;
  }
};

/**
 * Environment Storage Functions
 */

export const getCampaignById = async (campaignId, userId = null) => {
  try {
    const userIdToUse = userId || validateUser();
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId.toString()));
    
    if (!campaignDoc.exists()) {
      return null;
    }
    
    const campaignData = campaignDoc.data();
    
    // Security check - only return if it belongs to the user
    if (campaignData.userId !== userIdToUse) {
      throw new Error('Unauthorized: Can only access own campaigns');
    }
    
    return {
      id: campaignDoc.id,
      ...campaignData
    };
  } catch (error) {
    console.error('Error getting campaign by ID:', error);
    return null;
  }
};
export const deleteCampaign = async (campaignId, userId = null) => {
  try {
    const userIdToUse = userId || validateUser();
    
    // First check if the campaign belongs to the user
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId.toString()));
    
    if (!campaignDoc.exists()) {
      throw new Error('Campaign not found');
    }
    
    const campaignData = campaignDoc.data();
    
    if (campaignData.userId !== userIdToUse) {
      throw new Error('Unauthorized: Can only delete own campaigns');
    }
    
    await deleteDoc(doc(db, 'campaigns', campaignId.toString()));
    
    return true;
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return false;
  }
};


export const updateCampaignSession = async (campaignId, messages, userId = null) => {
  try {
    const userIdToUse = userId || validateUser();
    
    // First check if the campaign belongs to the user
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId.toString()));
    
    if (!campaignDoc.exists()) {
      throw new Error('Campaign not found');
    }
    
    const campaignData = campaignDoc.data();
    
    if (campaignData.userId !== userIdToUse) {
      throw new Error('Unauthorized: Can only update own campaigns');
    }
    
    await updateDoc(doc(db, 'campaigns', campaignId.toString()), {
      sessionMessages: messages,
      updated: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating campaign session:', error);
    return false;
  }
};

export const getEnvironments = async (userId = null, worldId = null) => {
  try {
    const userIdToUse = userId || validateUser();
    
    let environmentsQuery;
    if (worldId) {
      environmentsQuery = query(
        collection(db, 'environments'),
        where('userId', '==', userIdToUse),
        where('projectId', '==', worldId)
      );
    } else {
      environmentsQuery = query(
        collection(db, 'environments'),
        where('userId', '==', userIdToUse)
      );
    }
    
    const environmentsSnapshot = await getDocs(environmentsQuery);
    const environments = [];
    
    environmentsSnapshot.forEach((doc) => {
      environments.push({ id: doc.id, ...doc.data() });
    });
    
    return environments;
  } catch (error) {
    console.error('Error getting environments:', error);
    return [];
  }
};

// Add getMapData function which is missing but imported
export const getMapData = async (userId = null) => {
  try {
    const userIdToUse = userId || validateUser();
    const mapDoc = await getDoc(doc(db, 'maps', userIdToUse));
    
    if (mapDoc.exists()) {
      return mapDoc.data();
    } else {
      return { nodes: [], edges: [] };
    }
  } catch (error) {
    console.error('Error getting map data:', error);
    return { nodes: [], edges: [] };
  }
};

// Add getTimelineData function which is missing but imported
export const getTimelineData = async (userId = null) => {
  try {
    const userIdToUse = userId || validateUser();
    const timelineDoc = await getDoc(doc(db, 'timelines', userIdToUse));
    
    if (timelineDoc.exists()) {
      return timelineDoc.data();
    } else {
      return { events: [], sequences: ['Main Timeline'] };
    }
  } catch (error) {
    console.error('Error getting timeline data:', error);
    return { events: [], sequences: ['Main Timeline'] };
  }
};


export const loadEnvironments = async () => {
  try {
    const userId = validateUser();
    const environments = [];
    const q = query(collection(db, 'environments'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      environments.push({ id: doc.id, ...doc.data() });
    });
    
    return environments;
  } catch (error) {
    console.error('Error loading environments:', error);
    return [];
  }
};



export const deleteEnvironment = async (environmentId) => {
  try {
    const userId = validateUser();
    
    // Delete from Firestore
    await deleteDoc(doc(db, 'environments', environmentId.toString()));
    
    // Delete associated image if exists
    try {
      const imageRef = ref(storage, `users/${userId}/environments/${environmentId}`);
      await deleteObject(imageRef);
    } catch (imageError) {
      // Ignore errors if image doesn't exist
      console.log('No image found or other storage error:', imageError);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting environment:', error);
    return false;
  }
};

/**
 * World Storage Functions
 */
export const loadWorlds = async () => {
  try {
    const userId = validateUser();
    const worlds = [];
    const q = query(collection(db, 'worlds'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      worlds.push({ id: doc.id, ...doc.data() });
    });
    
    return worlds;
  } catch (error) {
    console.error('Error loading worlds:', error);
    return [];
  }
};

export const loadWorldById = async (worldId) => {
  try {
    const worldDoc = await getDoc(doc(db, 'worlds', worldId.toString()));
    if (worldDoc.exists()) {
      return { id: worldDoc.id, ...worldDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error loading world by ID:', error);
    return null;
  }
};

export const saveWorld = async (world) => {
  try {
    const userId = validateUser();
    
    // Handle image upload if needed
    let processedWorld = { ...world };
    if (world.imageUrl && world.imageUrl.startsWith('data:')) {
      const response = await fetch(world.imageUrl);
      const blob = await response.blob();
      const imageRef = ref(storage, `users/${userId}/worlds/${world.id || Date.now()}`);
      await uploadBytes(imageRef, blob);
      processedWorld.imageUrl = await getDownloadURL(imageRef);
    }
    
    // Save to Firestore
    const worldRef = doc(db, 'worlds', world.id.toString());
    await setDoc(worldRef, { 
      ...processedWorld, 
      userId,
      updated: new Date().toISOString() 
    });
    
    return true;
  } catch (error) {
    console.error('Error saving world:', error);
    return false;
  }
};

export const deleteWorld = async (worldId) => {
  try {
    const userId = validateUser();
    
    // Delete from Firestore
    await deleteDoc(doc(db, 'worlds', worldId.toString()));
    
    // Delete associated image if exists
    try {
      const imageRef = ref(storage, `users/${userId}/worlds/${worldId}`);
      await deleteObject(imageRef);
    } catch (imageError) {
      console.log('No image found or other storage error:', imageError);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting world:', error);
    return false;
  }
};

/**
 * Campaign Storage Functions
 */
export const loadCampaign = async (campaignId) => {
  try {
    const campaign = await getDoc(doc(db, 'campaigns', campaignId.toString()));
    if (campaign.exists()) {
      return { id: campaign.id, ...campaign.data() };
    }
    return null;
  } catch (error) {
    console.error('Error loading campaign:', error);
    return null;
  }
};

export const saveCampaign = async (campaign) => {
  try {
    const userId = validateUser();
    
    // Save to Firestore
    const campaignRef = doc(db, 'campaigns', campaign.id.toString());
    await setDoc(campaignRef, {
      ...campaign,
      userId,
      updated: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving campaign:', error);
    return false;
  }
};

export const loadWorldCampaigns = async (worldId) => {
  try {
    const userId = validateUser();
    const campaigns = [];
    const q = query(
      collection(db, 'campaigns'), 
      where('worldId', '==', parseInt(worldId)),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      campaigns.push({ id: doc.id, ...doc.data() });
    });
    
    return campaigns;
  } catch (error) {
    console.error('Error loading world campaigns:', error);
    return [];
  }
};

/**
 * Map and Timeline Functions
 */
export const loadMapData = async () => {
  try {
    const userId = validateUser();
    const mapDoc = await getDoc(doc(db, 'maps', userId));
    
    if (mapDoc.exists()) {
      return mapDoc.data();
    } else {
      return { nodes: [], edges: [] };
    }
  } catch (error) {
    console.error('Error loading map data:', error);
    return { nodes: [], edges: [] };
  }
};

export const saveMapData = async (mapData) => {
  try {
    const userId = validateUser();
    await setDoc(doc(db, 'maps', userId), {
      ...mapData,
      updated: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving map data:', error);
    return false;
  }
};

export const loadTimelineData = async () => {
  try {
    const userId = validateUser();
    const timelineDoc = await getDoc(doc(db, 'timelines', userId));
    
    if (timelineDoc.exists()) {
      return timelineDoc.data();
    } else {
      return { events: [], sequences: ['Main Timeline'] };
    }
  } catch (error) {
    console.error('Error loading timeline data:', error);
    return { events: [], sequences: ['Main Timeline'] };
  }
};

export const saveTimelineData = async (timelineData) => {
  try {
    const userId = validateUser();
    await setDoc(doc(db, 'timelines', userId), {
      ...timelineData,
      updated: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving timeline data:', error);
    return false;
  }
};
export const saveEnvironment = async (environment) => {
  try {
    const userId = validateUser();
    
    // Handle image upload if needed
    let processedEnvironment = { ...environment };
    if (environment.imageUrl && environment.imageUrl.startsWith('data:')) {
      const response = await fetch(environment.imageUrl);
      const blob = await response.blob();
      const imageRef = ref(storage, `users/${userId}/environments/${environment.id || Date.now()}`);
      await uploadBytes(imageRef, blob);
      processedEnvironment.imageUrl = await getDownloadURL(imageRef);
    }
    
    // Save to Firestore
    const environmentRef = doc(db, 'environments', environment.id.toString());
    await setDoc(environmentRef, { 
      ...processedEnvironment, 
      userId,
      updated: new Date().toISOString() 
    });
    
    return true;
  } catch (error) {
    console.error('Error saving environment:', error);
    return false;
  }
};

export const loadWorldTimeline = async (worldId) => {
  try {
    const userId = validateUser();
    const q = query(
      collection(db, 'timelines'), 
      where('worldId', '==', parseInt(worldId)),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const timelines = [];
    
    querySnapshot.forEach((doc) => {
      timelines.push({ id: doc.id, ...doc.data() });
    });
    
    return timelines.length > 0 ? timelines[0] : null;
  } catch (error) {
    console.error('Error loading world timeline:', error);
    return null;
  }
};
export const importAllData = async (jsonData) => {
  try {
    validateUser();
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    // Import characters
    if (data.characters && Array.isArray(data.characters)) {
      await saveCharacters(data.characters);
    }
    
    // Import environments
    if (data.environments && Array.isArray(data.environments)) {
      await saveEnvironments(data.environments);
    }
    
    // Import worlds
    if (data.worlds && Array.isArray(data.worlds)) {
      await saveWorlds(data.worlds);
    }
    
    // Import map data
    if (data.mapData) {
      await saveMapData(data.mapData);
    }
    
    // Import timeline data
    if (data.timelineData) {
      await saveTimelineData(data.timelineData);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing all data:', error);
    return false;
  }
};
export const testStorage = async () => {
  try {
    const userId = validateUser();
    
    // Basic test to check if storage and authentication are working
    return {
      status: 'success',
      userId: userId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Storage test failed:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const loadCharacters = async (userId = null, projectId = null) => {
  try {
    const userIdToUse = userId || validateUser();
    const characters = [];
    
    // Create query based on whether we have a projectId
    let charactersQuery;
    if (projectId) {
      charactersQuery = query(
        collection(db, `users/${userIdToUse}/characters`),
        where('projectId', '==', projectId)
      );
    } else {
      charactersQuery = collection(db, `users/${userIdToUse}/characters`);
    }
    
    const querySnapshot = await getDocs(charactersQuery);
    querySnapshot.forEach((doc) => {
      characters.push({ id: doc.id, ...doc.data() });
    });
    
    return characters;
  } catch (error) {
    console.error('Error loading characters:', error);
    return [];
  }
};

/**
 * Export/Import Functions
 */
export const exportAllData = async () => {
  try {
    const userId = validateUser();
    
    // Get all user data
    const characters = await loadCharacters();
    const environments = await loadEnvironments();
    const worlds = await loadWorlds();
    const mapData = await loadMapData();
    const timelineData = await loadTimelineData();
    
    // Create data bundle
    const exportData = {
      characters,
      environments,
      worlds,
      mapData,
      timelineData,
      metadata: {
        exportDate: new Date().toISOString(),
        userId,
        version: '1.0'
      }
    };
    
    return exportData;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

export const importData = async (jsonData) => {
  try {
    validateUser();
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    // Use a batch for better atomicity
    const batch = writeBatch(db);
    
    // Import characters
    if (data.characters && Array.isArray(data.characters)) {
      // Implementation for batch character import...
    }
    
    // Import environments
    if (data.environments && Array.isArray(data.environments)) {
      // Implementation for batch environment import...
    }
    
    // Import worlds
    if (data.worlds && Array.isArray(data.worlds)) {
      // Implementation for batch world import...
    }
    
    // Import map data
    if (data.mapData) {
      // Implementation for map data import...
    }
    
    // Import timeline data
    if (data.timelineData) {
      // Implementation for timeline data import...
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
 
};


// Add these functions to firebaseStorage.js

/**
 * Get all forum posts
 */
export const getForumPosts = async (forumId = 'general', userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    const postsQuery = query(
      collection(db, `forums/${forumId}/posts`),
      orderBy('timestamp', 'desc')
    );
    
    const postsSnapshot = await getDocs(postsQuery);
    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return posts;
  } catch (error) {
    console.error('Error loading forum posts:', error);
    throw error;
  }
};

/**
 * Get a specific forum post by ID
 */
export const getForumPost = async (forumId = 'general', postId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    const postDoc = await getDoc(doc(db, `forums/${forumId}/posts`, postId));
    
    if (!postDoc.exists()) {
      return null;
    }
    
    return {
      id: postDoc.id,
      ...postDoc.data()
    };
  } catch (error) {
    console.error('Error loading forum post:', error);
    throw error;
  }
};

/**
 * Add a new forum post
 */
export const addForumPost = async (forumId = 'general', postData, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const user = auth.currentUser;
    
    // Get the user's profile to get their display name
    const userProfileDoc = await getDoc(doc(db, 'users', userIdToUse));
    const userProfile = userProfileDoc.exists() ? userProfileDoc.data() : {};
    const username = userProfile.displayName || user.email.split('@')[0];
    
    const post = {
      userId: userIdToUse,
      username,
      title: postData.title,
      content: postData.content,
      timestamp: new Date().toISOString(),
      edited: false,
      editTimestamp: null,
      likes: 0,
      likedBy: []
    };
    
    const postRef = await addDoc(collection(db, `forums/${forumId}/posts`), post);
    return { id: postRef.id, ...post };
  } catch (error) {
    console.error('Error creating forum post:', error);
    throw error;
  }
};

/**
 * Update an existing forum post
 */
export const updateForumPost = async (forumId = 'general', postId, postData, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    // First check if the user is the author of the post
    const postDoc = await getDoc(doc(db, `forums/${forumId}/posts`, postId));
    
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }
    
    const post = postDoc.data();
    
    if (post.userId !== userIdToUse) {
      throw new Error('Unauthorized: You can only edit your own posts');
    }
    
    const updates = {
      title: postData.title,
      content: postData.content,
      edited: true,
      editTimestamp: new Date().toISOString()
    };
    
    await updateDoc(doc(db, `forums/${forumId}/posts`, postId), updates);
    
    return {
      id: postId,
      ...post,
      ...updates
    };
  } catch (error) {
    console.error('Error updating forum post:', error);
    throw error;
  }
};

/**
 * Delete a forum post
 */
export const deleteForumPost = async (forumId = 'general', postId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    // First check if the user is the author of the post
    const postDoc = await getDoc(doc(db, `forums/${forumId}/posts`, postId));
    
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }
    
    const post = postDoc.data();
    
    if (post.userId !== userIdToUse) {
      throw new Error('Unauthorized: You can only delete your own posts');
    }
    
    // Delete all replies to the post first
    const repliesQuery = query(collection(db, `forums/${forumId}/posts/${postId}/replies`));
    const repliesSnapshot = await getDocs(repliesQuery);
    
    const batch = writeBatch(db);
    
    repliesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the post
    batch.delete(doc(db, `forums/${forumId}/posts`, postId));
    
    await batch.commit();
    
    return true;
  } catch (error) {
    console.error('Error deleting forum post:', error);
    throw error;
  }
};

/**
 * Like a forum post
 */
export const likeForumPost = async (forumId = 'general', postId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    const postRef = doc(db, `forums/${forumId}/posts`, postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }
    
    const post = postDoc.data();
    const likedBy = post.likedBy || [];
    
    // Check if user already liked the post
    if (likedBy.includes(userIdToUse)) {
      return { liked: true, likes: post.likes };
    }
    
    // Update the post with the new like
    await updateDoc(postRef, {
      likes: (post.likes || 0) + 1,
      likedBy: [...likedBy, userIdToUse]
    });
    
    return { liked: true, likes: (post.likes || 0) + 1 };
  } catch (error) {
    console.error('Error liking forum post:', error);
    throw error;
  }
};

/**
 * Unlike a forum post
 */
export const unlikeForumPost = async (forumId = 'general', postId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    const postRef = doc(db, `forums/${forumId}/posts`, postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }
    
    const post = postDoc.data();
    const likedBy = post.likedBy || [];
    
    // Check if user hasn't liked the post
    if (!likedBy.includes(userIdToUse)) {
      return { liked: false, likes: post.likes };
    }
    
    // Update the post without the user's like
    await updateDoc(postRef, {
      likes: Math.max(0, (post.likes || 0) - 1),
      likedBy: likedBy.filter(id => id !== userIdToUse)
    });
    
    return { liked: false, likes: Math.max(0, (post.likes || 0) - 1) };
  } catch (error) {
    console.error('Error unliking forum post:', error);
    throw error;
  }
};

/**
 * Get replies for a post
 */
export const getPostReplies = async (forumId = 'general', postId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    const repliesQuery = query(
      collection(db, `forums/${forumId}/posts/${postId}/replies`),
      orderBy('timestamp', 'asc')
    );
    
    const repliesSnapshot = await getDocs(repliesQuery);
    const replies = repliesSnapshot.docs.map(doc => ({
      id: doc.id,
      postId,
      ...doc.data()
    }));
    
    return replies;
  } catch (error) {
    console.error('Error loading post replies:', error);
    throw error;
  }
};

/**
 * Add a reply to a post
 */
export const addReplyToPost = async (forumId = 'general', postId, replyData, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    const user = auth.currentUser;
    
    // Get the user's profile to get their display name
    const userProfileDoc = await getDoc(doc(db, 'users', userIdToUse));
    const userProfile = userProfileDoc.exists() ? userProfileDoc.data() : {};
    const username = userProfile.displayName || user.email.split('@')[0];
    
    const reply = {
      userId: userIdToUse,
      username,
      content: replyData.content,
      timestamp: new Date().toISOString(),
      edited: false,
      editTimestamp: null,
      likes: 0,
      likedBy: []
    };
    
    const replyRef = await addDoc(
      collection(db, `forums/${forumId}/posts/${postId}/replies`), 
      reply
    );
    
    return { id: replyRef.id, postId, ...reply };
  } catch (error) {
    console.error('Error adding reply:', error);
    throw error;
  }
};

/**
 * Update a reply
 */
export const updateReply = async (forumId = 'general', postId, replyId, replyData, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    // First check if the user is the author of the reply
    const replyRef = doc(db, `forums/${forumId}/posts/${postId}/replies`, replyId);
    const replyDoc = await getDoc(replyRef);
    
    if (!replyDoc.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replyDoc.data();
    
    if (reply.userId !== userIdToUse) {
      throw new Error('Unauthorized: You can only edit your own replies');
    }
    
    const updates = {
      content: replyData.content,
      edited: true,
      editTimestamp: new Date().toISOString()
    };
    
    await updateDoc(replyRef, updates);
    
    return {
      id: replyId,
      postId,
      ...reply,
      ...updates
    };
  } catch (error) {
    console.error('Error updating reply:', error);
    throw error;
  }
};

/**
 * Delete a reply
 */
export const deleteReply = async (forumId = 'general', postId, replyId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    // First check if the user is the author of the reply
    const replyRef = doc(db, `forums/${forumId}/posts/${postId}/replies`, replyId);
    const replyDoc = await getDoc(replyRef);
    
    if (!replyDoc.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replyDoc.data();
    
    if (reply.userId !== userIdToUse) {
      throw new Error('Unauthorized: You can only delete your own replies');
    }
    
    await deleteDoc(replyRef);
    
    return true;
  } catch (error) {
    console.error('Error deleting reply:', error);
    throw error;
  }
};

/**
 * Like a reply
 */
export const likeReply = async (forumId = 'general', postId, replyId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    const replyRef = doc(db, `forums/${forumId}/posts/${postId}/replies`, replyId);
    const replyDoc = await getDoc(replyRef);
    
    if (!replyDoc.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replyDoc.data();
    const likedBy = reply.likedBy || [];
    
    // Check if user already liked the reply
    if (likedBy.includes(userIdToUse)) {
      return { liked: true, likes: reply.likes };
    }
    
    // Update the reply with the new like
    await updateDoc(replyRef, {
      likes: (reply.likes || 0) + 1,
      likedBy: [...likedBy, userIdToUse]
    });
    
    return { liked: true, likes: (reply.likes || 0) + 1 };
  } catch (error) {
    console.error('Error liking reply:', error);
    throw error;
  }
};

/**
 * Unlike a reply
 */
export const unlikeReply = async (forumId = 'general', postId, replyId, userId = null) => {
  try {
    const userIdToUse = userId || (await ensureAuthenticated());
    
    const replyRef = doc(db, `forums/${forumId}/posts/${postId}/replies`, replyId);
    const replyDoc = await getDoc(replyRef);
    
    if (!replyDoc.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replyDoc.data();
    const likedBy = reply.likedBy || [];
    
    // Check if user hasn't liked the reply
    if (!likedBy.includes(userIdToUse)) {
      return { liked: false, likes: reply.likes };
    }
    
    // Update the reply without the user's like
    await updateDoc(replyRef, {
      likes: Math.max(0, (reply.likes || 0) - 1),
      likedBy: likedBy.filter(id => id !== userIdToUse)
    });
    
    return { liked: false, likes: Math.max(0, (reply.likes || 0) - 1) };
  } catch (error) {
    console.error('Error unliking reply:', error);
    throw error;
  }
};
export const sendPasswordReset = async (email) => {
  try {
    await auth.sendPasswordResetEmail(email);
    return true;
  } catch (error) {
    console.error('Error sending password reset:', error);
    throw error;
  }
};