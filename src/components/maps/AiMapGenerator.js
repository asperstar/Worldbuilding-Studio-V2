// src/components/maps/AiMapGenerator.js
import React, { useState, useRef } from 'react';
import { saveMapData } from '../../utils/storage';

function AiMapGenerator({ onMapGenerated }) {
  const [description, setDescription] = useState('');
  const [mapName, setMapName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMap, setGeneratedMap] = useState(null);
  const canvasRef = useRef(null);

  const generateMap = async () => {
    if (!description.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // Simple placeholder data for testing
      const mapData = {
        name: mapName || 'Fantasy Map',
        description: description,
        regions: [
          {
            name: "Northern Kingdom",
            description: "A cold mountainous region with hardy folk",
            color: "#8ca9d3",
            x: 100,
            y: 100,
            width: 150,
            height: 100
          },
          {
            name: "Eastern Forests",
            description: "Dense woodlands filled with ancient trees",
            color: "#2d6a4f",
            x: 300,
            y: 150,
            width: 120,
            height: 130
          }
        ],
        locations: [
          {
            name: "Capital City",
            description: "The bustling center of the realm",
            type: "city",
            x: 150,
            y: 120
          }
        ]
      };
      
      // Render on canvas
      renderMapOnCanvas(mapData);
      
      // Save the generated data
      setGeneratedMap(mapData);
      
      // Convert to app format and save
      const appCompatibleData = convertMapDataToAppFormat(mapData);
      await saveMapData(appCompatibleData);
      
      if (onMapGenerated) {
        onMapGenerated(appCompatibleData);
      }
    } catch (error) {
      console.error('Map generation failed:', error);
      alert('Failed to generate map: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const convertMapDataToAppFormat = (mapData) => {
    // Convert to app's map format
    const nodes = [];
    const edges = [];
    
    // Convert regions to nodes
    if (mapData.regions) {
      mapData.regions.forEach((region, index) => {
        nodes.push({
          id: `region-${index}`,
          type: 'environment',
          position: { x: region.x || 100, y: region.y || 100 },
          data: {
            label: region.name,
            description: region.description,
            color: region.color || '#90EE90'
          }
        });
      });
    }
    
    // Convert locations to nodes
    if (mapData.locations) {
      mapData.locations.forEach((location, index) => {
        nodes.push({
          id: `location-${index}`,
          type: 'environment',
          position: { x: location.x || 200, y: location.y || 200 },
          data: {
            label: location.name,
            description: location.description,
            locationType: location.type
          }
        });
      });
    }
    
    return {
      nodes,
      edges,
      metadata: {
        name: mapData.name,
        description: mapData.description,
        generatedBy: 'AI',
        timestamp: new Date().toISOString()
      }
    };
  };
  
  const renderMapOnCanvas = (mapData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#f9ecd2'; // Parchment background
    ctx.fillRect(0, 0, width, height);
    
    // Draw map border
    ctx.strokeStyle = '#8B4513'; // Brown border
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    
    // Draw title
    ctx.font = 'bold 48px serif';
    ctx.fillStyle = '#5C3317';
    ctx.textAlign = 'center';
    ctx.fillText(mapData.name || 'Fantasy Map', width / 2, 80);
    
    // Draw regions
    if (mapData.regions) {
      mapData.regions.forEach(region => {
        ctx.fillStyle = region.color || 'rgba(144, 238, 144, 0.3)';
        ctx.fillRect(region.x, region.y, region.width || 150, region.height || 100);
        ctx.strokeRect(region.x, region.y, region.width || 150, region.height || 100);
        
        ctx.font = 'bold 16px serif';
        ctx.fillStyle = '#000';
        ctx.fillText(region.name, region.x + (region.width || 150)/2, region.y + (region.height || 100)/2);
      });
    }
    
    // Draw locations
    if (mapData.locations) {
      mapData.locations.forEach(location => {
        // Draw a circle for location
        ctx.beginPath();
        ctx.arc(location.x, location.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#b25068';
        ctx.fill();
        ctx.stroke();
        
        // Add location name
        ctx.font = '14px serif';
        ctx.fillStyle = '#000';
        ctx.fillText(location.name, location.x, location.y + 25);
      });
    }
  };
  
  const saveMapImage = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `${mapName || 'fantasy-map'}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="ai-map-generator">
      <div className="generator-form">
        <div className="form-group">
          <label htmlFor="map-name">Map Name:</label>
          <input
            id="map-name"
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="Enter a name for your map"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="map-description">Describe Your World:</label>
          <textarea
            id="map-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the geography, key locations, and other features of your world..."
            rows="6"
          />
        </div>
        
        <button 
          onClick={generateMap}
          disabled={isGenerating || !description.trim()}
          className="generate-button"
        >
          {isGenerating ? 'Generating Map...' : 'Generate Map'}
        </button>
      </div>
      
      <div className="map-preview">
        <canvas 
          ref={canvasRef} 
          width="1200" 
          height="900"
          className="map-canvas"
        />
        
        {generatedMap && (
          <div className="map-actions">
            <button onClick={saveMapImage}>
              Download Map Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AiMapGenerator;