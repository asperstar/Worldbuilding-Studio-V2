/* eslint-disable no-undef*/
import React, { useState, useEffect, useCallback } from 'react';
import CharacterForm from '../components/characters/CharacterForm';
import { saveCharacter, deleteCharacter } from '../utils/storageExports';
import { Link } from 'react-router-dom';
import { trace } from 'firebase/performance';
import { perf } from '../firebase';
import { useStorage } from '../contexts/StorageContext';

function CharactersPage() {
  const { getAllCharacters } = useStorage();
  const [characters, setCharacters] = useState([]);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [storageStatus, setStorageStatus] = useState({ tested: false, working: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCharacters, setFilteredCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1); // Add pagination state
  const [hasMore, setHasMore] = useState(true); // Track if there are more characters to load
  const pageSize = 10; // Number of characters per page

  // Test Firestore connectivity on component mount
  useEffect(() => {
    const checkStorage = async () => {
      try {
        const test = await testStorage();
        setStorageStatus({ tested: true, working: test.success });
        if (!test.success) {
          setError('Unable to connect to Firestore: ' + test.error);
        }
      } catch (err) {
        setStorageStatus({ tested: true, working: false });
        setError('Failed to connect to Firestore: ' + err.message);
      }
    };
    checkStorage();
  }, []);

  // Load characters with pagination
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
        setCharacters(prev => [...prev, ...newCharacters]);
        setFilteredCharacters(prev => [...prev, ...newCharacters]);
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
    loadCharacterData(page);
  }, [loadCharacterData, page]);

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
    try {
      setIsLoading(true);
      setError(null);
      let updatedCharacter;
      if (editingCharacter) {
        updatedCharacter = {
          ...newCharacter,
          id: editingCharacter.id.toString(),
          imageUrl: newCharacter.imageUrl || editingCharacter.imageUrl || '',
          created: editingCharacter.created,
          updated: new Date().toISOString()
        };
      } else {
        updatedCharacter = {
          ...newCharacter,
          imageUrl: newCharacter.imageUrl || '',
          id: `char_${Date.now()}`,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        };
      }
      console.log("Saving character:", updatedCharacter);
      await saveCharacter(updatedCharacter);
      if (editingCharacter) {
        setCharacters(prevChars =>
          prevChars.map(char => (char.id === editingCharacter.id ? updatedCharacter : char))
        );
      } else {
        setCharacters(prevChars => [...prevChars, updatedCharacter]);
      }
      setEditingCharacter(null);
    } catch (error) {
      console.error("Error saving character:", error);
      setError(`Failed to save character: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (character) => {
    setEditingCharacter(character);
  };

  const cancelEditing = () => {
    setEditingCharacter(null);
  };

  const handleDeleteCharacter = async (characterId) => {
    if (window.confirm('Are you sure you want to delete this character?')) {
      try {
        setIsLoading(true);
        setError(null);
        await deleteCharacter(characterId);
        setCharacters(prevChars => prevChars.filter(char => char.id !== characterId));
      } catch (error) {
        console.error("Error deleting character:", error);
        setError(`Failed to delete character: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBulkSave = async (updatedCharacters) => {
    try {
      setIsLoading(true);
      setError(null);
      await saveCharacters(updatedCharacters);
      setCharacters(updatedCharacters);
    } catch (error) {
      console.error("Error bulk saving characters:", error);
      setError(`Failed to bulk save characters: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreCharacters = () => {
    setPage(prev => prev + 1);
  };

  return (
    <div className="characters-page">
      <h1>Characters</h1>
      {error && <div className="error-message">{error}</div>}
      {!storageStatus.working && storageStatus.tested && (
        <div className="warning-message">
          Warning: Unable to connect to Firestore. Your characters won't be saved.
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