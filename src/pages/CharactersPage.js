// src/pages/CharactersPage.js
import React, { useState, useEffect, useCallback } from 'react';
import CharacterForm from '../components/characters/CharacterForm';
import { saveCharacter, deleteCharacter, testStorage } from '../utils/storageExports';
import { Link } from 'react-router-dom';
import { trace } from 'firebase/performance';
import { perf } from '../firebase';
import { useStorage } from '../contexts/StorageContext';
import debounce from 'lodash/debounce';
import { useNavigate } from 'react-router-dom';

// Create debounced save function
const debouncedSaveCharacter = debounce(async (characterData, userId) => {
  try {
    await saveCharacter(characterData, userId);
    return true;
  } catch (error) {
    console.error("Error in debounced save:", error);
    return false;
  }
}, 300); // 300ms debounce

function CharactersPage() {
  const navigate = useNavigate();
  const { currentUser, getAllCharacters, testStorage } = useStorage();
  const [characters, setCharacters] = useState([]);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [storageStatus, setStorageStatus] = useState({ tested: false, working: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCharacters, setFilteredCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;
  const [draftCharacter, setDraftCharacter] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    traits: '',
    personality: '',
    background: '',
    imageUrl: ''
  });

  useEffect(() => {
    const checkStorage = async () => {
      try {
        const test = await testStorage();
        setStorageStatus({ tested: true, working: test.success });
        if (!test.success) {
          if (test.error.includes('not authenticated')) {
            setError('User not authenticated. Please log in to save characters.');
          } else if (test.errorCode === 'unavailable') {
            setError('Network error: Unable to connect to Firestore. Please check your internet connection.');
          } else {
            setError(`Unable to connect to Firestore: ${test.error}`);
          }
        } else {
          setError(null);
        }
      } catch (err) {
        setStorageStatus({ tested: true, working: false });
        setError(`Failed to connect to Firestore: ${err.message}`);
      }
    };
    checkStorage();
  }, [testStorage]);

  const loadCharacterData = useCallback(async (pageNum) => {
    setIsLoading(true);
    setError(null);
    try {
      const t = trace(perf, 'load_characters');
      t.start();
      const allCharacters = await getAllCharacters();
      const startIndex = (pageNum - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const newCharacters = allCharacters.slice(startIndex, endIndex);

      if (pageNum === 1) {
        setCharacters(newCharacters);
        setFilteredCharacters(newCharacters);
      } else {
        setCharacters(prev => {
          const combined = [...prev, ...newCharacters];
          const uniqueCharacters = Array.from(
            new Map(combined.map(char => [char.id, char])).values()
          );
          return uniqueCharacters;
        });
        setFilteredCharacters(prev => {
          const combined = [...prev, ...newCharacters];
          const uniqueCharacters = Array.from(
            new Map(combined.map(char => [char.id, char])).values()
          );
          return uniqueCharacters;
        });
      }

      setHasMore(endIndex < allCharacters.length);
      t.stop();
    } catch (error) {
      console.error("Error loading characters:", error);
      setError("Failed to load characters. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [getAllCharacters, pageSize]);

  useEffect(() => {
    if (currentUser) {
      loadCharacterData(page);
    }
  }, [loadCharacterData, page, currentUser]);

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

  const autoSave = debounce(async (characterData) => {
    if (!currentUser || !characterData.name) return;
  
    try {
      const characterToSave = {
        ...characterData,
        userId: currentUser.uid,
        isDraft: true,
        created: draftCharacter ? draftCharacter.created : new Date().toISOString(),
        updated: new Date().toISOString(),
      };
  
      if (!draftCharacter) {
        characterToSave.id = `char_${Date.now()}`;
        await saveCharacter(characterToSave, currentUser.uid);
        setDraftCharacter(characterToSave);
      } else {
        const updatedCharacter = { ...draftCharacter, ...characterToSave };
        await saveCharacter(updatedCharacter, currentUser.uid);
        setDraftCharacter(updatedCharacter);
      }
    } catch (error) {
      console.error('Error auto-saving character:', error);
      if (error.message.includes('User not authenticated')) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError('Failed to auto-save character.');
      }
    }
  }, 1000);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      setHasUnsavedChanges(true);
      autoSave(updated);
      return updated;
    });
  };

  // src/pages/CharactersPage.js
  const handleSaveCharacter = async (newCharacter) => {
    try {
      setIsLoading(true);
      setSaveError(null);
      
      // Check if character already exists with similar data to prevent duplicates
      if (!editingCharacter && characters.some(c => c.name === newCharacter.name)) {
        setSaveError(`A character named "${newCharacter.name}" already exists. Please use a different name.`);
        setIsLoading(false);
        return;
      }
      
      // Process image if present
      let imageUrl = newCharacter.imageUrl || '';
      if (newCharacter.imageFile) {
        try {
          const userId = currentUser.uid;
          const imageId = Date.now().toString();
          const storageRef = ref(storage, `users/${userId}/characters/${imageId}`);
          await uploadBytes(storageRef, newCharacter.imageFile);
          imageUrl = await getDownloadURL(storageRef);
        } catch (imageError) {
          console.error("Error uploading image:", imageError);
          setSaveError("Image upload failed, but character will be saved without image");
        }
      }
  
      let updatedCharacter;
      const characterId = editingCharacter ? 
        editingCharacter.id.toString() : 
        `char_${Date.now()}`;
        
      updatedCharacter = {
        ...newCharacter,
        id: characterId,
        imageUrl, // Use the uploaded URL
        imageFile: null, // Don't store file in Firestore
        created: editingCharacter ? editingCharacter.created : new Date().toISOString(),
        updated: new Date().toISOString(),
        userId: currentUser.uid,
        isDraft: false,
      };
  
      // Save character
      const saveResult = await debouncedSaveCharacter(updatedCharacter, currentUser.uid);
      
      if (saveResult) {
        // Update UI state
        if (editingCharacter) {
          setCharacters(prevChars =>
            prevChars.map(char => (char.id === editingCharacter.id ? updatedCharacter : char))
          );
        } else {
          setCharacters(prevChars => {
            // Ensure we're not adding a duplicate
            if (prevChars.some(c => c.id === characterId)) {
              return prevChars;
            }
            return [...prevChars, updatedCharacter];
          });
        }
        
        // Reset form state
        setEditingCharacter(null);
        setDraftCharacter(null);
        setHasUnsavedChanges(false);
        setFormData({
          name: '',
          traits: '',
          personality: '',
          background: '',
          imageUrl: '',
        });
      }
    } catch (error) {
      console.error("Error saving character:", error);
      setSaveError(`Failed to save character: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  
  const startEditing = (character) => {
    setEditingCharacter(character);
    setFormData({
      name: character.name || '',
      traits: character.traits || '',
      personality: character.personality || '',
      background: character.background || '',
      imageUrl: character.imageUrl || ''
    });
    setDraftCharacter(null);
    setHasUnsavedChanges(false);
  };

  const cancelEditing = () => {
    setEditingCharacter(null);
    setDraftCharacter(null);
    setHasUnsavedChanges(false);
    setFormData({
      name: '',
      traits: '',
      personality: '',
      background: '',
      imageUrl: ''
    });
  };

  // src/pages/CharactersPage.js
const handleDeleteCharacter = async (characterId) => {
  if (window.confirm('Are you sure you want to delete this character?')) {
    try {
      setIsLoading(true);
      setError(null);
      await deleteCharacter(characterId, currentUser.uid); // Pass userId
      setCharacters(prevChars => prevChars.filter(char => char.id !== characterId));
    } catch (error) {
      console.error("Error deleting character:", error);
      setError(`Failed to delete character: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }
};

  const loadMoreCharacters = () => {
    setPage(prev => prev + 1);
  };

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

  return (
    <div className="characters-page">
      <h1>Characters</h1>
      {storageStatus.tested && !storageStatus.working && error && (
        <div className="error-message" style={{ backgroundColor: 'red', color: 'white', padding: '10px' }}>
          {error}
        </div>
      )}
      {saveError && (
        <div className="save-error-message" style={{ backgroundColor: 'orange', color: 'white', padding: '10px' }}>
          {saveError}
        </div>
      )}
      <div className="page-content">
        <div className="form-section">
          <h2>{editingCharacter ? 'Edit Character' : 'Create New Character'}</h2>
          <CharacterForm
            onSave={handleSaveCharacter}
            initialCharacter={editingCharacter || formData}
            onCancel={cancelEditing}
            isEditing={!!editingCharacter}
            onChange={handleFormChange}
            isSubmitting={isLoading}
          />
        </div>
        <div className="characters-list">
          <div className="list-header">
            <h2>Your Characters ({characters.length})</h2>
            <input
              type="text"
              placeholder="Search characters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          {isLoading && page === 1 ? (
            <div>Loading characters...</div>
          ) : filteredCharacters.length === 0 ? (
            searchQuery ? (
              <p className="no-results">No characters found matching "{searchQuery}"</p>
            ) : (
              <p className="no-characters">No characters created yet.</p>
            )
          ) : (
            <>
              <ul className="character-cards">
                {filteredCharacters.map(char => (
                  <li key={char.id} className="character-card">
                    <div className="card-header">
                      {char.imageUrl ? (
                        <div className="character-image">
                          <img src={char.imageUrl} alt={char.name} />
                        </div>
                      ) : (
                        <div className="character-icon">
                          <span className="icon-text">{char.name ? char.name[0].toUpperCase() : 'C'}</span>
                        </div>
                      )}
                      <h3>{char.name || 'Unnamed Character'}</h3>
                    </div>
                    <div className="card-content">
                      {char.personality && (
                        <p className="personality">
                          <strong>Personality:</strong> {char.personality}
                        </p>
                      )}
                      {char.background && (
                        <p className="background">
                          <strong>Background:</strong>{' '}
                          {char.background.length > 100
                            ? `${char.background.substring(0, 100)}...`
                            : char.background}
                        </p>
                      )}
                    </div>
                    <div className="card-actions">
                      <Link to={`/chat?characterId=${char.id}`}>
                        <button className="chat-button">Chat</button>
                      </Link>
                      <button
                        className="edit-button"
                        onClick={() => startEditing(char)}
                      >
                        Edit
                      </button>
                      <button
                        className="memories-button"
                        onClick={() => alert('Memories feature coming soon!')}
                      >
                        Memories
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteCharacter(char.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <button
                  onClick={loadMoreCharacters}
                  disabled={isLoading}
                  className="load-more-button"
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CharactersPage;