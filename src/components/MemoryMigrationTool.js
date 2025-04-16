// src/components/MemoryMigrationTool.js
import React, { useState, useEffect } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { migrateMemoriesToFirebase, migrateAllLocalMemories } from '../utils/memory/memoryMigration';

function MemoryMigrationTool() {
  const { getAllCharacters } = useStorage();
  const [characters, setCharacters] = useState([]);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [migrationResults, setMigrationResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const loadCharacters = async () => {
      try {
        const loadedCharacters = await getAllCharacters();
        setCharacters(loadedCharacters || []);
      } catch (error) {
        console.error('Error loading characters:', error);
        setStatusMessage('Error loading characters');
      }
    };

    loadCharacters();
  }, [getAllCharacters]);

  const handleMigrateOne = async (characterId) => {
    try {
      setLoading(true);
      setStatusMessage(`Migrating memories for ${characterId}...`);
      const result = await migrateMemoriesToFirebase(characterId);
      setMigrationResults(prev => [...prev, result]);
      setStatusMessage(`Successfully migrated ${result.migrated} memories for character`);
    } catch (error) {
      console.error('Migration error:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateAll = async () => {
    try {
      setLoading(true);
      setStatusMessage('Migrating all memories from local storage...');
      const results = await migrateAllLocalMemories();
      setMigrationResults(results);
      
      const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
      setStatusMessage(`Successfully migrated ${totalMigrated} memories for ${results.length} characters`);
    } catch (error) {
      console.error('Migration error:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="memory-migration-tool">
      <h2>Memory Migration Tool</h2>
      <p>This tool helps migrate character memories from localStorage to Firebase.</p>
      
      {statusMessage && (
        <div className={`status-message ${loading ? 'loading' : ''}`}>
          {statusMessage}
        </div>
      )}
      
      <div className="action-buttons">
        <button 
          onClick={handleMigrateAll} 
          disabled={loading}
          className="migrate-all-button"
        >
          Migrate All Memories
        </button>
      </div>
      
      <h3>Characters</h3>
      <div className="character-list">
        {characters.map(character => (
          <div key={character.id} className="character-item">
            <span className="character-name">{character.name}</span>
            <button 
              onClick={() => handleMigrateOne(character.id)}
              disabled={loading}
              className="migrate-one-button"
            >
              Migrate Memories
            </button>
          </div>
        ))}
      </div>
      
      {migrationResults.length > 0 && (
        <div className="migration-results">
          <h3>Migration Results</h3>
          <ul>
            {migrationResults.map((result, index) => (
              <li key={index}>
                Character {result.character}: 
                {result.error ? (
                  <span className="error-message">Error: {result.error}</span>
                ) : (
                  <span className="success-message">Migrated {result.migrated} memories</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MemoryMigrationTool;