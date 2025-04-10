// src/pages/CharacterMemoriesPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getCharacterMemories, removeMemory, MEMORY_TYPES } from '../utils/memory/memoryManager';
import { loadCharacters } from '../utils/storageExports';

function CharacterMemoriesPage() {
  const { characterId } = useParams();
  const [character, setCharacter] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Load character - Convert to async/await since loadCharacters should return a Promise
        const characters = await loadCharacters();
        const foundCharacter = characters.find(c => c.id.toString() === characterId);
        setCharacter(foundCharacter);
        
        // Load memories only if we found a character
        if (foundCharacter) {
          const characterMemories = await getCharacterMemories(characterId);
          setMemories(characterMemories);
        }
      } catch (error) {
        console.error("Error loading character data:", error);
        // You could add error state handling here
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [characterId]);
  
  const handleDeleteMemory = async (memoryId) => {
    const confirmed = window.confirm('Are you sure you want to delete this memory?');
    if (confirmed) {
      try {
        await removeMemory(characterId, memoryId);
        setMemories(prevMemories => prevMemories.filter(memory => memory.id !== memoryId));
      } catch (error) {
        console.error("Error deleting memory:", error);
        // Add error handling for the user, like a toast notification
      }
    }
  };
  
  const getTypeLabel = (type) => {
    const labels = {
      [MEMORY_TYPES.FACT]: 'Fact',
      [MEMORY_TYPES.EVENT]: 'Event',
      [MEMORY_TYPES.PREFERENCE]: 'Preference',
      [MEMORY_TYPES.RELATIONSHIP]: 'Relationship',
      [MEMORY_TYPES.CONVERSATION]: 'Conversation'
    };
    return labels[type] || type;
  };
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!character) {
    return <div className="not-found">Character not found</div>;
  }
  
  return (
    <div className="memories-page">
      <h1>{character.name}'s Memories</h1>
      
      <div className="memories-container">
        {memories.length === 0 ? (
          <p className="no-memories">No memories stored yet. Chat with this character to create memories.</p>
        ) : (
          <div className="memories-list">
            {memories.map(memory => (
              <div key={memory.id} className={`memory-card ${memory?.type || 'unknown'}`}>
                <div className="memory-header">
                  <span className="memory-type">{getTypeLabel(memory?.type)}</span>
                  <span className="memory-timestamp">
                    {memory?.timestamp ? new Date(memory.timestamp).toLocaleString() : 'Unknown date'}
                  </span>
                  <button 
                    className="delete-memory" 
                    onClick={() => handleDeleteMemory(memory.id)}
                  >
                    Delete
                  </button>
                </div>
                <div className="memory-content">{memory?.content || 'No content'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterMemoriesPage;