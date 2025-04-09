/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import CharacterForm from '../components/characters/CharacterForm';
import { testStorage } from '../utils/storage';
import { Link } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import { trace } from 'firebase/performance'
import { perf } from '../firebase';
import { migrateToFirestore } from '../utils/migrateToFirestore';
function CharactersPage() {
  const [characters, setCharacters] = useState([]);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [storageStatus, setStorageStatus] = useState({ tested: false, working: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCharacters, setFilteredCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { 
    currentUser, 
    getCharacters, 
    saveOneCharacter, 
    removeCharacter,
    saveAllCharacters 
  } = useStorage();
  
  // Test localStorage on component mount
  useEffect(() => {
    const test = testStorage();
    setStorageStatus({ tested: true, working: test.success });
  }, []);
  
  // Load characters on component mount with performance tracking
  const loadCharacterData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create custom trace for performance monitoring
      const t = trace(perf, 'load_characters');
      t.start();
      
      const characterData = await getCharacters(true); // Force refresh
      setCharacters(characterData || []);
      setFilteredCharacters(characterData || []);
      
      t.stop();
    } catch (error) {
      console.error("Error loading characters:", error);
      setError("Failed to load characters. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, getCharacters]);
  
  useEffect(() => {
    loadCharacterData();
  }, [loadCharacterData]);
  
  // Filter characters based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCharacters(characters);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = characters.filter(char => 
        (char.name && char.name.toLowerCase().includes(query)) || 
        (char.traits && char.traits.toLowerCase().includes(query)) ||
        (char.personality && char.personality.toLowerCase().includes(query))
      );
      setFilteredCharacters(filtered);
    }
  }, [searchQuery, characters]);

  const handleSaveCharacter = async (newCharacter) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      // Ensure imageUrl is properly preserved
      const imageUrl = newCharacter.imageUrl || '';
      let updatedCharacter;
      
      if (editingCharacter) {
        // Update existing character
        updatedCharacter = { 
          ...newCharacter, 
          id: editingCharacter.id, 
          imageUrl, 
          created: editingCharacter.created,
          updated: new Date().toISOString(),
          userId: currentUser.uid
        };
      } else {
        // Create new character
        updatedCharacter = { 
          ...newCharacter, 
          imageUrl,
          id: `char_${Date.now()}`,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          userId: currentUser.uid
        };
      }
      
      // Save to storage
      await saveOneCharacter(updatedCharacter);
      
      // Update local state
      if (editingCharacter) {
        setCharacters(prevChars => 
          prevChars.map(char => char.id === editingCharacter.id ? updatedCharacter : char)
        );
      } else {
        setCharacters(prevChars => [...prevChars, updatedCharacter]);
      }
      
      setEditingCharacter(null);
    } catch (error) {
      console.error("Error saving character:", error);
      setError("Failed to save character. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const startEditing = (character) => {
    setEditingCharacter(character);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const cancelEditing = () => {
    setEditingCharacter(null);
  };
  
  const handleDeleteCharacter = async (id) => {
    if (!currentUser) return;
    
    if (window.confirm("Are you sure you want to delete this character?")) {
      try {
        setIsLoading(true);
        
        // Delete from storage
        await removeCharacter(id);
        
        // Update local state
        if (editingCharacter && editingCharacter.id === id) {
          setEditingCharacter(null);
        }
        setCharacters(prevChars => prevChars.filter(char => char.id !== id));
      } catch (error) {
        console.error("Error deleting character:", error);
        setError("Failed to delete character. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Add bulk save functionality
  const handleBulkSave = async () => {
    if (!currentUser || !characters.length) return;
    
    try {
      setIsLoading(true);
      await saveAllCharacters(characters);
      setError(null);
    } catch (error) {
      console.error("Error saving all characters:", error);
      setError("Failed to save all characters. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // UI rendering with loading and error states
  return (
    <div className="characters-page">
      <h1>Characters</h1>
      
      {!storageStatus.working && storageStatus.tested && (
        <div className="storage-warning">
          <p>Warning: Local storage is not working. Your characters won't be saved between sessions.</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadCharacterData}>Try Again</button>
        </div>
      )}
      
      <div className="page-content">
        <div className="form-section">
          <h2>{editingCharacter ? 'Edit Character' : 'Create New Character'}</h2>
          <CharacterForm 
            onSave={handleSaveCharacter} 
            initialCharacter={editingCharacter}
            onCancel={cancelEditing}
            isEditing={!!editingCharacter}
            isSubmitting={isLoading}
          />
        </div>
        
        <div className="characters-list">
          <div className="list-header">
            <h2>Your Characters ({characters.length})</h2>
            <div className="search-characters">
              <input
                type="text"
                placeholder="Search characters..."
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
          
          {isLoading && characters.length === 0 ? (
            <div className="loading-indicator">Loading characters...</div>
          ) : filteredCharacters.length === 0 ? (
            searchQuery ? (
              <p className="no-results">No characters found matching "{searchQuery}"</p>
            ) : (
              <p className="no-characters">No characters created yet.</p>
            )
          ) : (
            <ul className="character-cards">
              {filteredCharacters.map(char => (
                <li key={char.id} className="character-card">
                  <div className="card-header">
                    {char.imageUrl ? (
                      <div className="character-image">
                        <img src={char.imageUrl} alt={char.name} />
                      </div>
                    ) : (
                      <div className="character-initial">
                        {char.name ? char.name[0].toUpperCase() : '?'}
                      </div>
                    )}
                    <h3>{char.name}</h3>
                  </div>
                  
                  <div className="card-content">
                    {char.traits && <p className="traits"><strong>Traits:</strong> {char.traits}</p>}
                    {char.personality && <p className="personality"><strong>Personality:</strong> {char.personality}</p>}
                    {char.background && (
                      <p className="background">
                        <strong>Background:</strong> 
                        {(char.background || '').length > 100 
                          ? `${(char.background || '').substring(0, 100)}...` 
                          : char.background || ''
                        }
                      </p>
                    )}
                  </div>
                  
                  <div className="card-actions">
                    <button 
                      onClick={() => startEditing(char)}
                      className="edit-button"
                      disabled={isLoading}
                    >
                      Edit
                    </button>
                    <Link 
                      to={`/characters/${char.id}/memories`}
                      className="memories-button"
                    >
                      Memories
                    </Link>
                    <button 
                      onClick={() => handleDeleteCharacter(char.id)}
                      className="delete-button"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          // Add this to the render method of CampaignsPage.js, just below the "Create New Campaign" button
<button 
  className="migrate-button"
  onClick={async () => {
    await migrateToFirestore();
    alert('Migration to Firestore completed. Check the console for details.');
  }}
>
  Migrate Data to Firestore
</button>
        </div>
        
      </div>
    
    </div>
  );
}

export default CharactersPage;