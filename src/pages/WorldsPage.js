// src/pages/WorldsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import WorldForm from '../components/worlds/WorldForm';
import { loadWorlds, saveWorlds, deleteWorld } from '../utils/storageExports';
import { useStorage } from '../contexts/StorageContext';
import debounce from 'lodash/debounce';
import {  ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
function WorldsPage() {
  const [worlds, setWorlds] = useState([]);
  const [editingWorld, setEditingWorld] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWorlds, setFilteredWorlds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useStorage();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftWorld, setDraftWorld] = useState(null);

  const cleanForFirestore = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => cleanForFirestore(item));
    }

    const cleaned = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value === undefined) {
        continue;
      }
      if (typeof value === 'object') {
        cleaned[key] = cleanForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };

  const autoSave = useCallback(debounce(async (worldData) => {
    if (!currentUser || !worldData.name) return;
    
    try {
      const worldToSave = cleanForFirestore({
        ...worldData,
        userId: currentUser.uid,
        isDraft: true,
        updated: new Date().toISOString()
      });
      
      if (!draftWorld) {
        worldToSave.id = Date.now();
        await saveWorlds([worldToSave]);
        setDraftWorld(worldToSave);
      } else {
        const updatedWorld = cleanForFirestore({ ...draftWorld, ...worldToSave, userId: currentUser.uid });
        await saveWorlds([updatedWorld]);
        setDraftWorld(updatedWorld);
      }
    } catch (error) {
      console.error('Error auto-saving world:', { message: error.message, code: error.code, stack: error.stack });
      setError(`Failed to auto-save world: ${error.message}`);
    }
  }, 1000), [currentUser, draftWorld]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load worlds on component mount
  useEffect(() => {
    const fetchWorlds = async () => {
      setIsLoading(true);
      try {
        const savedWorlds = await loadWorlds();
        setWorlds(savedWorlds);
        setFilteredWorlds(savedWorlds);
      } catch (error) {
        console.error("Error loading worlds:", { message: error.message, code: error.code, stack: error.stack });
        setError("Failed to load worlds. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentUser) {
      fetchWorlds();
    }
  }, [currentUser]);
  
  // Save worlds whenever they change
  useEffect(() => {
    const saveData = async () => {
      if (worlds.length > 0 && currentUser) {
        setSaving(true);
        try {
          const worldsToSave = worlds.map(world => cleanForFirestore({
            ...world,
            userId: currentUser.uid
          }));
          await saveWorlds(worldsToSave);
        } catch (error) {
          console.error("Error saving worlds:", { message: error.message, code: error.code, stack: error.stack });
          setError(`Failed to save changes: ${error.message}`);
        } finally {
          setSaving(false);
        }
      }
    };
    
    saveData();
  }, [worlds, currentUser]);
  
  // Filter worlds based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredWorlds(worlds);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = worlds.filter(world => 
        world.name.toLowerCase().includes(query) || 
        (world.description && world.description.toLowerCase().includes(query))
      );
      setFilteredWorlds(filtered);
    }
  }, [searchQuery, worlds]);

  const saveWorld = async (newWorld) => {
    try {
      setIsLoading(true);
      
      // Process image upload if there's a file
      let imageUrl = newWorld.imageUrl || '';
      if (newWorld.imageFile) {
        try {
          const userId = currentUser.uid;
          const imageId = Date.now().toString();
          const storageRef = ref(storage, `users/${userId}/worlds/${imageId}`);
          await uploadBytes(storageRef, newWorld.imageFile);
          imageUrl = await getDownloadURL(storageRef);
        } catch (imageError) {
          console.error("Error uploading world image:", imageError);
          // Continue saving without the image
        }
      }
      
      if (editingWorld) {
        const updatedWorlds = worlds.map(world => 
          world.id === editingWorld.id 
            ? { 
                ...newWorld, 
                id: world.id, 
                imageUrl, // Use the uploaded URL
                imageFile: null, // Don't store the file in Firestore
                created: world.created, 
                updated: new Date().toISOString(),
                userId: currentUser.uid
              }
            : world
        );
        setWorlds(updatedWorlds);
        setEditingWorld(null);
      } else {
        const newWorldWithId = { 
          ...newWorld, 
          imageUrl, // Use the uploaded URL
          imageFile: null, // Don't store the file in Firestore
          id: Date.now(),
          created: new Date().toISOString(),
          environmentIds: newWorld.environmentIds || [],
          characterIds: newWorld.characterIds || [],
          campaignIds: [],
          userId: currentUser.uid
        };
        setWorlds(prevWorlds => [...prevWorlds, newWorldWithId]);
      }
    } catch (error) {
      console.error("Error saving world:", error);
      setError(`Failed to save world: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const startEditing = (world) => {
    setEditingWorld(world);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const cancelEditing = () => {
    setEditingWorld(null);
  };
  
  const handleDeleteWorld = async (id) => {
    try {
      if (editingWorld && editingWorld.id === id) {
        setEditingWorld(null);
      }
      
      await deleteWorld(id);
      setWorlds(prevWorlds => prevWorlds.filter(world => world.id !== id));
    } catch (error) {
      console.error("Error deleting world:", { message: error.message, code: error.code, stack: error.stack });
      setError("Failed to delete world. Please try again.");
    }
  };

  const getWorldStats = (world) => {
    const characterCount = world.characterIds?.length || 0;
    const environmentCount = world.environmentIds?.length || 0;
    const campaignCount = world.campaignIds?.length || 0;
    
    return { characterCount, environmentCount, campaignCount };
  };

  if (isLoading) {
    return <div className="loading">Loading worlds...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="worlds-page">
      <h1>Worlds</h1>
      {saving && <div className="saving-message">Saving...</div>}
      
      <div className="page-content">
        <div className="form-section">
          <WorldForm 
            onSave={saveWorld} 
            initialWorld={editingWorld}
            onCancel={cancelEditing}
            isEditing={!!editingWorld}
          />
        </div>
        
        <div className="worlds-list">
          <div className="list-header">
            <h2>Your Worlds ({worlds.length})</h2>
            <div className="search-worlds">
              <input
                type="text"
                placeholder="Search worlds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="clear-search" 
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>
          </div>
          
          {filteredWorlds.length === 0 ? (
            searchQuery ? (
              <p className="no-results">No worlds found matching "{searchQuery}"</p>
            ) : (
              <p className="no-worlds">No worlds created yet.</p>
            )
          ) : (
            <ul className="world-cards">
              {filteredWorlds.map(world => {
                const { characterCount, environmentCount, campaignCount } = getWorldStats(world);
                
                return (
                  <li key={world.id} className="world-card">
                    <div className="card-header">
                      {world.imageUrl ? (
                        <div className="world-image">
                          <img src={world.imageUrl} alt={world.name} />
                        </div>
                      ) : (
                        <div className="world-initial">
                          {world.name ? world.name[0].toUpperCase() : '?'}
                        </div>
                      )}
                      <h3>{world.name}</h3>
                    </div>
                    
                    <div className="card-content">
                      {world.description && (
                        <p className="description">
                          {world.description.length > 100 
                            ? `${world.description.substring(0, 100)}...` 
                            : world.description
                          }
                        </p>
                      )}
                      
                      <div className="world-stats">
                        <span>{characterCount} Character{characterCount !== 1 ? 's' : ''}</span>
                        <span>{environmentCount} Environment{environmentCount !== 1 ? 's' : ''}</span>
                        <span>{campaignCount} Campaign{campaignCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    <div className="card-actions">
                      <button 
                        onClick={() => startEditing(world)}
                        className="edit-button"
                      >
                        Edit
                      </button>
                      <Link 
                        to={`/worlds/${world.id}/campaigns`}
                        className="campaigns-button"
                      >
                        Campaigns
                      </Link>
                      <button 
                        onClick={() => handleDeleteWorld(world.id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorldsPage;