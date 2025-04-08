// src/components/maps/MapDescriptionPanel.js
import React, { useState } from 'react';
import { loadMapData, loadWorlds } from '../../utils/storage';

function MapDescriptionPanel({ mapId, worldId }) {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [descriptionType, setDescriptionType] = useState('overview');
  const [error, setError] = useState(null);
  
  const generateDescription = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Load map data
      const mapData = await loadMapData();
      if (!mapData || !mapData.nodes || !mapData.edges) {
        throw new Error('No map data available');
      }
      
      // Load world context if available
      let worldContext = '';
      if (worldId) {
        const worlds = await loadWorlds();
        const world = worlds.find(w => w.id === worldId);
        if (world) {
          worldContext = `World Name: ${world.name}\n`;
          if (world.description) worldContext += `Description: ${world.description}\n`;
          if (world.rules) worldContext += `Rules/Systems: ${world.rules}\n`;
          if (world.lore) worldContext += `Lore: ${world.lore}\n`;
        }
      }
      
      // Call the API to generate description
      const response = await fetch('/api/describe-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mapData,
          descriptionType,
          worldContext
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      setDescription(data.description);
      
    } catch (error) {
      console.error('Error generating map description:', error);
      setError(error.message || 'Failed to generate description');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="map-description-panel">
      <h3>Map Description</h3>
      
      <div className="description-type-selector">
        <label>Description Type:</label>
        <select 
          value={descriptionType} 
          onChange={(e) => setDescriptionType(e.target.value)}
          disabled={isGenerating}
        >
          <option value="overview">Overview</option>
          <option value="narrative">Narrative</option>
          <option value="travel">Travel Guide</option>
          <option value="detailed">Detailed</option>
        </select>
        
        <button 
          onClick={generateDescription}
          disabled={isGenerating}
          className="generate-button"
        >
          {isGenerating ? 'Generating...' : 'Generate Description'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {description ? (
        <div className="description-content">
          <div className="description-text">
            {description.split('\n').map((paragraph, index) => (
              paragraph.trim() ? <p key={index}>{paragraph}</p> : <br key={index} />
            ))}
          </div>
          
          <div className="description-actions">
            <button onClick={() => {
              // Copy to clipboard
              navigator.clipboard.writeText(description);
            }}>
              Copy to Clipboard
            </button>
            
            <button onClick={() => setDescription('')}>
              Clear
            </button>
          </div>
        </div>
      ) : !isGenerating && (
        <div className="no-description">
          <p>Generate a description to see how AI interprets your map.</p>
          <p className="tip">
            Tip: The more detailed your map nodes and connections, 
            the better the AI can understand and describe your world.
          </p>
        </div>
      )}
    </div>
  );
}

export default MapDescriptionPanel;

// Now update your MapPage.js to include this component
// Add this import to MapPage.js
import MapDescriptionPanel from '../components/maps/MapDescriptionPanel';

// Add inside the MapPage component, perhaps in a new UI section or sidebar
<div className="map-description-section">
  <MapDescriptionPanel worldId={selectedWorldId} />
</div>

// You'd need to add logic to track selectedWorldId in MapPage.js
// For example:
const [selectedWorldId, setSelectedWorldId] = useState(null);

// Then add a world selector dropdown:
<div className="world-selector">
  <label>Map World:</label>
  <select
    value={selectedWorldId || ''}
    onChange={(e) => setSelectedWorldId(e.target.value ? parseInt(e.target.value) : null)}
  >
    <option value="">-- No World Selected --</option>
    {availableWorlds.map(world => (
      <option key={world.id} value={world.id}>
        {world.name}
      </option>
    ))}
  </select>
</div>