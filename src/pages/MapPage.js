// src/pages/MapPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

// Create a utility function for generating map descriptions without relying on external AI libraries
const generateMapDescription = async (userInput, environments) => {
  try {
    // Create a description based on environments if no API is available
    const envNames = environments.map(env => env.name).join(', ');
    
    // Call backend API if available
    const response = await fetch('/api/generate-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `A fantasy map with these locations: ${envNames}. User request: ${userInput}`,
        environments: environments
      }),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    const data = await response.json();
    return data.description || `Map showing ${envNames}. ${userInput}`;
  } catch (err) {
    console.error('Error generating description:', err);
    return `A fantasy map showing ${environments.map(env => env.name).join(', ')}. ${userInput}`;
  }
};

const MapPage = () => {
  const { worldId } = useParams();
  const { getEnvironments, getWorldById } = useStorage();
  const [environments, setEnvironments] = useState([]);
  const [world, setWorld] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [mapImage, setMapImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ReactFlow state
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!worldId) {
          setError('No world ID provided');
          return;
        }

        // Load world data
        const worldData = await getWorldById(worldId);
        if (!worldData) throw new Error('World not found');
        setWorld(worldData);

        // Load environments for this world
        const envs = await getEnvironments(null, worldId);
        setEnvironments(envs || []);

        // Initialize nodes and edges based on environments
        const envNodes = envs.map((env, idx) => ({
          id: env.id,
          type: 'default',
          data: { label: env.name },
          position: { x: idx * 200, y: 100 },
        }));
        setNodes(envNodes);

        // Example edges (connect environments logically)
        const envEdges = envs.slice(1).map((env, idx) => ({
          id: `e${idx}-${idx + 1}`,
          source: envs[idx].id,
          target: env.id,
        }));
        setEdges(envEdges);
      } catch (err) {
        setError('Failed to load data: ' + err.message);
      }
    };
    
    fetchData();
  }, [worldId, getWorldById, getEnvironments]);

  const handleGenerateMap = async () => {
    setLoading(true);
    setError(null);
  
    try {
      // First get map description from Grok
      const descriptionResponse = await fetch('/generate-map-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userInput,
          environments: environments.map(env => ({
            name: env.name,
            description: env.description || ''
          }))
        }),
      });
  
      if (!descriptionResponse.ok) throw new Error('Failed to generate map description');
      const { description } = await descriptionResponse.json();
      setMapDescription(description);
  
      // Then generate image using the description
      const replicateResponse = await fetch('/generate-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: description,
          environments: environments.map(env => ({
            name: env.name,
            description: env.description || ''
          })),
          connections: edges.map(edge => ({
            source: nodes.find(n => n.id === edge.source)?.data?.label || edge.source,
            target: nodes.find(n => n.id === edge.target)?.data?.label || edge.target
          }))
        }),
      });
  
      if (!replicateResponse.ok) throw new Error('Failed to generate map image');
      const { imageUrl } = await replicateResponse.json();
      setMapImage(imageUrl);
    } catch (err) {
      setError('Error generating map: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h1>{world ? `${world.name} Map` : 'World Map'}</h1>
      {error && <div className="error">{error}</div>}

      {/* Map Generation Input */}
      <div style={{ padding: '10px' }}>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Describe your map (e.g., 'A dark forest with a river connecting to a village')..."
          style={{ width: '100%', height: '100px' }}
        />
        <button onClick={handleGenerateMap} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Map'}
        </button>
      </div>

      {/* Map Description */}
      {mapDescription && (
        <div style={{ padding: '10px' }}>
          <h3>Map Description:</h3>
          <p>{mapDescription}</p>
        </div>
      )}

      {/* Map Image */}
      {mapImage && (
        <div style={{ padding: '10px' }}>
          <h3>Generated Map:</h3>
          <img src={mapImage} alt="Generated Map" style={{ maxWidth: '100%' }} />
        </div>
      )}

      {/* ReactFlow Map */}
      <div style={{ flex: 1 }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default MapPage;