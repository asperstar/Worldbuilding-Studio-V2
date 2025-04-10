// src/pages/WorldsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import WorldForm from '../components/worlds/WorldForm';
import { loadWorlds, saveWorlds, deleteWorld } from '../utils/storageExports';
import { useStorage } from '../contexts/StorageContext';

function WorldsPage() {
  const [worlds, setWorlds] = useState([]);
  const [editingWorld, setEditingWorld] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWorlds, setFilteredWorlds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { currentUser } = useStorage();
  
  // Load worlds on component mount
  useEffect(() => {
    const fetchWorlds = async () => {
      setIsLoading(true);
      try {
        const savedWorlds = await loadWorlds();
        setWorlds(savedWorlds);
        setFilteredWorlds(savedWorlds);
      } catch (error) {
        console.error("Error loading worlds:", error);
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
        try {
          await saveWorlds(worlds);
        } catch (error) {
          console.error("Error saving worlds:", error);
          setError("Failed to save changes. Please try again.");
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
      // Ensure imageUrl is properly preserved
      const imageUrl = newWorld.imageUrl || '';
      
      if (editingWorld) {
        const updatedWorlds = worlds.map(world => 
          world.id === editingWorld.id 
            ? { 
                ...newWorld, 
                id: world.id, 
                imageUrl, 
                created: world.created, 
                updated: new Date().toISOString(),
                userId: currentUser?.uid
              }
            : world
        );
        setWorlds(updatedWorlds);
        setEditingWorld(null);
      } else {
        const newWorldWithId = { 
          ...newWorld, 
          imageUrl,
          id: Date.now(),
          created: new Date().toISOString(),
          environmentIds: newWorld.environmentIds || [],
          characterIds: newWorld.characterIds || [],
          campaignIds: [],
          userId: currentUser?.uid
        };
        setWorlds(prevWorlds => [...prevWorlds, newWorldWithId]);
      }
    } catch (error) {
      console.error("Error saving world:", error);
      setError("Failed to save world. Please try again.");
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
      
      // Delete from Firestore first
      await deleteWorld(id);
      
      // Then update local state
      setWorlds(prevWorlds => prevWorlds.filter(world => world.id !== id));
    } catch (error) {
      console.error("Error deleting world:", error);
      setError("Failed to delete world. Please try again.");
    }
  };

  // Helper to count items in a world
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