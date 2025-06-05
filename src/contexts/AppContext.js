// src/contexts/AppContext.js - NEW FILE (replaces StorageContext)
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import * as storage from '../services/storage';

const AppContext = createContext();

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auth functions
  const login = async (email, password) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err) {
      const message = getAuthErrorMessage(err.code);
      setError(message);
      return { success: false, error: message };
    }
  };

  const signup = async (email, password) => {
    try {
      setError(null);
      await createUserWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err) {
      const message = getAuthErrorMessage(err.code);
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Helper function for better error messages
  const getAuthErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'Email already in use.';
      case 'auth/weak-password':
        return 'Password too weak. Use at least 6 characters.';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  // Simple data operations with error handling
  const withErrorHandling = (operation, context) => async (...args) => {
    try {
      setError(null);
      return await operation(...args);
    } catch (err) {
      const message = `Failed to ${context}: ${err.message}`;
      setError(message);
      throw new Error(message);
    }
  };

  const value = {
    // Auth state
    currentUser,
    loading,
    error,
    
    // Auth functions
    login,
    signup,
    logout,
    
    // Data operations (wrapped with error handling)
    characters: {
      getAll: withErrorHandling(storage.characters.getAll, 'load characters'),
      getById: withErrorHandling(storage.characters.getById, 'load character'),
      save: withErrorHandling(storage.characters.save, 'save character'),
      delete: withErrorHandling(storage.characters.delete, 'delete character'),
    },
    
    worlds: {
      getAll: withErrorHandling(storage.worlds.getAll, 'load worlds'),
      getById: withErrorHandling(storage.worlds.getById, 'load world'),
      save: withErrorHandling(storage.worlds.save, 'save world'),
      delete: withErrorHandling(storage.worlds.delete, 'delete world'),
    },
    
    environments: {
      getAll: withErrorHandling(storage.environments.getAll, 'load environments'),
      save: withErrorHandling(storage.environments.save, 'save environment'),
      delete: withErrorHandling(storage.environments.delete, 'delete environment'),
    },
    
    campaigns: {
      getByWorldId: withErrorHandling(storage.campaigns.getByWorldId, 'load campaigns'),
      getById: withErrorHandling(storage.campaigns.getById, 'load campaign'),
      save: withErrorHandling(storage.campaigns.save, 'save campaign'),
      delete: withErrorHandling(storage.campaigns.delete, 'delete campaign'),
    },
    
    // Utility
    testConnection: withErrorHandling(storage.testConnection, 'test connection'),
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}