// src/contexts/StorageContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { 
  getForumPosts, 
  getForumPost, 
  addForumPost, 
  updateForumPost, 
  deleteForumPost, 
  likeForumPost, 
  unlikeForumPost, 
  getPostReplies, 
  addReplyToPost, 
  updateReply, 
  deleteReply, 
  likeReply, 
  unlikeReply,
  loadCharacters,
  saveCharacter,
  deleteCharacter, 
  saveCharacters,
  loadWorldById,
  loadWorlds,
  saveWorld,
  saveWorlds,
  deleteWorld,
  getEnvironments,
  loadEnvironments,
  saveEnvironment,
  saveEnvironments,
  deleteEnvironment,
  getMapData,
  saveMapData,
  getTimelineData,
  saveTimelineData,
  loadWorldCampaigns,
  getCampaignById,
  saveCampaign,
  deleteCampaign,
  updateCampaignSession,
  importAllData,
  exportAllData,
  testStorage,
  getUserProfile,
  updateUserProfile,
  sendPasswordReset
} from '../utils/firebaseStorage';

const StorageContext = createContext();

export function useStorage() {
  return useContext(StorageContext);
}

export function StorageProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Authentication functions
  const login = async (email, password) => {
    try {
      setError(null);
      await auth.signInWithEmailAndPassword(email, password);
      return true;
    } catch (err) {
      console.error("Login error:", err);
      setError(getAuthErrorMessage(err.code));
      return false;
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      return true;
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message);
      return false;
    }
  };

  const signup = async (email, password) => {
    try {
      setError(null);
      await auth.createUserWithEmailAndPassword(email, password);
      return true;
    } catch (err) {
      console.error("Signup error:", err);
      setError(getAuthErrorMessage(err.code));
      return false;
    }
  };

  // Helper function to get better error messages
  const getAuthErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'This email is already in use by another account.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return errorCode ? errorCode : 'An error occurred during authentication.';
    }
  };

  // Password reset function
  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordReset(email);
      return true;
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err.message);
      return false;
    }
  };

  // Character functions
  const getAllCharacters = async (forceRefresh = false) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      
      // Use the fixed loadCharacters function that excludes drafts
      const characters = await loadCharacters(currentUser.uid);
      
      // Additional deduplication check
      const uniqueCharacters = characters.reduce((acc, char) => {
        const existingIndex = acc.findIndex(c => c.name === char.name && !c.isDraft);
        if (existingIndex === -1) {
          acc.push(char);
        } else {
          // Keep the most recently updated one
          const existing = acc[existingIndex];
          if (new Date(char.updated) > new Date(existing.updated)) {
            acc[existingIndex] = char;
          }
        }
        return acc;
      }, []);
      
      return uniqueCharacters;
    } catch (err) {
      console.error('Error in getAllCharacters:', err);
      setError(err.message);
      return [];
    }
  };
  

  const getCharacters = async (userId = null, projectId = null) => {
    try {
      const userIdToUse = userId || (currentUser ? currentUser.uid : null);
      if (!userIdToUse) throw new Error('User not authenticated');
      return await loadCharacters(userIdToUse, projectId);
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

  const saveOneCharacter = async (character) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      
      // Use the fixed saveCharacter function
      const result = await saveCharacter(character, currentUser.uid);
      
      // Clear any error state on success
      setError(null);
      
      return result;
    } catch (err) {
      console.error('Error in saveOneCharacter:', err);
      setError(err.message);
      throw err;
    }
  };



  const deleteOneCharacter = async (characterId) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await deleteCharacter(characterId, currentUser.uid);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // World functions
  const getWorlds = async () => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await loadWorlds(currentUser.uid);
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

  const getWorldById = async (worldId) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await loadWorldById(worldId, currentUser.uid);
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const saveOneWorld = async (world) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await saveWorld(world, currentUser.uid);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteOneWorld = async (worldId) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await deleteWorld(worldId, currentUser.uid);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Environment functions
  const getAllEnvironments = async (forceRefresh = false) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await loadEnvironments(currentUser.uid);
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

  const getEnvironmentById = async (environmentId) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      const environments = await loadEnvironments(currentUser.uid);
      return environments.find(env => env.id === environmentId) || null;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const saveOneEnvironment = async (environment) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await saveEnvironment(environment, currentUser.uid);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteOneEnvironment = async (environmentId) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await deleteEnvironment(environmentId, currentUser.uid);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Campaign functions
  const getWorldCampaigns = async (worldId) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await loadWorldCampaigns(worldId, currentUser.uid);
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

  const getCampaign = async (campaignId) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await getCampaignById(campaignId, currentUser.uid);
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const updateCampaign = async (campaign) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await saveCampaign(campaign, currentUser.uid);
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const deleteCampaignById = async (campaignId) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await deleteCampaign(campaignId, currentUser.uid);
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const updateCampaignSessionMessages = async (campaignId, messages) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await updateCampaignSession(campaignId, messages, currentUser.uid);
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Map and Timeline functions
  const loadMapData = async () => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await getMapData(currentUser.uid);
    } catch (err) {
      setError(err.message);
      return { nodes: [], edges: [] };
    }
  };

  const saveMap = async (mapData) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await saveMapData(currentUser.uid, mapData);
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const loadTimelineData = async () => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await getTimelineData(currentUser.uid);
    } catch (err) {
      setError(err.message);
      return { events: [], sequences: ['Main Timeline'] };
    }
  };

  const saveTimeline = async (timelineData) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await saveTimelineData(currentUser.uid, timelineData);
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // User profile functions
  const getProfile = async () => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await getUserProfile(currentUser.uid);
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await updateUserProfile(profileData, currentUser.uid);
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Export/Import functions
  const exportData = async (options) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await exportAllData(options);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const importData = async (data) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      return await importAllData(data, currentUser.uid);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Diagnostics functions
  const testStorageConnection = async () => {
    try {
      return await testStorage();
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Forum functions
const getForumPostsFunc = async (forumId = 'general') => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await getForumPosts(forumId, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const getForumPostFunc = async (forumId = 'general', postId) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await getForumPost(forumId, postId, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const addForumPostFunc = async (forumId = 'general', postData) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await addForumPost(forumId, postData, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const updateForumPostFunc = async (forumId = 'general', postId, postData) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await updateForumPost(forumId, postId, postData, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const deleteForumPostFunc = async (forumId = 'general', postId) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await deleteForumPost(forumId, postId, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const likeForumPostFunc = async (forumId = 'general', postId) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await likeForumPost(forumId, postId, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const unlikeForumPostFunc = async (forumId = 'general', postId) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await unlikeForumPost(forumId, postId, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const getPostRepliesFunc = async (forumId = 'general', postId) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await getPostReplies(forumId, postId, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const addReplyToPostFunc = async (forumId = 'general', postId, replyData) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await addReplyToPost(forumId, postId, replyData, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const updateReplyFunc = async (forumId = 'general', postId, replyId, replyData) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await updateReply(forumId, postId, replyId, replyData, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const deleteReplyFunc = async (forumId = 'general', postId, replyId) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await deleteReply(forumId, postId, replyId, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const likeReplyFunc = async (forumId = 'general', postId, replyId) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await likeReply(forumId, postId, replyId, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};

const unlikeReplyFunc = async (forumId = 'general', postId, replyId) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    return await unlikeReply(forumId, postId, replyId, currentUser.uid);
  } catch (err) {
    setError(err.message);
    throw err;
  }
};
const contextValue = {
  currentUser,
  login,
  logout,
  signup,
  resetPassword,
  error,
  
  // Character functions
  getAllCharacters,
  getCharacters,
  saveOneCharacter,
  deleteOneCharacter,
  
  // World functions
  getWorlds,
  getWorldById,
  saveOneWorld,
  deleteOneWorld,
  
  // Environment functions
  getAllEnvironments,
  getEnvironmentById,
  saveOneEnvironment,
  deleteOneEnvironment,
  
  // Campaign functions
  getWorldCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaignById,
  updateCampaignSessionMessages,
  
  // Map and Timeline functions
  loadMapData,
  saveMap,
  loadTimelineData,
  saveTimeline,
  
  // User profile functions
  getProfile,
  updateProfile,
  
  // Export/Import functions
  exportData,
  importData,
  
  // Diagnostics functions
  testStorageConnection,
  
  // Forum functions
  getForumPosts: getForumPostsFunc,
  getForumPost: getForumPostFunc,
  addForumPost: addForumPostFunc,
  updateForumPost: updateForumPostFunc,
  deleteForumPost: deleteForumPostFunc,
  likeForumPost: likeForumPostFunc,
  unlikeForumPost: unlikeForumPostFunc,
  getPostReplies: getPostRepliesFunc,
  addReplyToPost: addReplyToPostFunc,
  updateReply: updateReplyFunc,
  deleteReply: deleteReplyFunc,
  likeReply: likeReplyFunc,
  unlikeReply: unlikeReplyFunc
};
  return (
    <StorageContext.Provider value={contextValue}>
      {!loading && children}
    </StorageContext.Provider>
  );
}