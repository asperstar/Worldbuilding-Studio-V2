// src/components/maps/AzgaarMapGenerator.js
import React, { useState, useEffect, useRef } from 'react';
import { saveMapData } from '../../utils/storageExports';
import './AzgaarMapGenerator.css'; // You'll need to create this file for styling

function AzgaarMapGenerator({ onMapGenerated }) {
  const iframeRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [mapPreviewUrl, setMapPreviewUrl] = useState(null);
  const [showTips, setShowTips] = useState(true);

  useEffect(() => {
    // Set up message listener to receive data from the iframe
    const handleMessage = (event) => {
      // Security check - only accept messages from our iframe source
      // You'll need to adjust this based on your actual deployment
      if (!event.origin.includes('localhost') && 
          !event.origin.includes('worldbuilding-studio.firebaseapp.com') && 
          !event.origin.includes('worldbuilding-app-plum.vercel.app')) {
        console.warn('Received message from unauthorized source:', event.origin);
        return;
      }

      if (!event.data) return;

      try {
        // Handle different message types from the iframe
        if (event.data.type === 'mapReady') {
          console.log('Map generator is ready');
          setIsMapReady(true);
          setGenerationStatus('Map generator loaded successfully.');
        } else if (event.data.type === 'mapGenerated') {
          console.log('Map has been generated');
          setMapPreviewUrl(event.data.imageUrl);
          setGenerationStatus('Map generated successfully!');
        } else if (event.data.type === 'mapData') {
          console.log('Received map data from generator');
          handleMapData(event.data.mapData);
        } else if (event.data.type === 'error') {
          console.error('Error from map generator:', event.data.message);
          setGenerationStatus(`Error: ${event.data.message}`);
        } else if (event.data.type === 'status') {
          setGenerationStatus(event.data.message);
        }
      } catch (error) {
        console.error('Error processing message from map generator:', error);
        setGenerationStatus('Error processing data from map generator.');
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Clean up when component unmounts
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Handle the map data received from the iframe
  const handleMapData = async (mapData) => {
    try {
      // Convert Azgaar's map format to your app's format
      const convertedData = convertAzgaarMapToAppFormat(mapData);
      
      // Save to your Firebase/storage system
      await saveMapData(convertedData);
      
      setGenerationStatus('Map saved to your account!');
      
      // Call the callback if provided
      if (onMapGenerated) {
        onMapGenerated(convertedData);
      }
    } catch (error) {
      console.error('Error saving map data:', error);
      setGenerationStatus(`Error saving map: ${error.message}`);
    }
  };

  // Function to convert Azgaar's map format to your app's format
  const convertAzgaarMapToAppFormat = (azgaarMap) => {
    // Initialize nodes and edges arrays
    const nodes = [];
    const edges = [];
    
    // Convert burgs (settlements) to environment nodes
    if (azgaarMap.burgs && Array.isArray(azgaarMap.burgs)) {
      azgaarMap.burgs.forEach((burg, index) => {
        // Skip the empty first element that Azgaar uses
        if (index === 0) return;
        
        // Get state name if available
        const stateName = burg.state && azgaarMap.states && azgaarMap.states[burg.state] 
          ? azgaarMap.states[burg.state].name 
          : 'Independent';
        
        // Create a node for this settlement
        nodes.push({
          id: `env-burg-${burg.i}`,
          type: 'environment',
          position: { 
            x: burg.x * 2, // Scale factor to make it fit better in your map view
            y: burg.y * 2
          },
          data: {
            label: burg.name || `Settlement ${burg.i}`,
            description: `A ${burg.type || 'settlement'} in ${stateName}.`,
            climate: 'Temperate', // Default
            environmentId: `gen-${Date.now()}-${burg.i}`,
            // Add other properties as needed
          }
        });
      });
    }
    
    // Convert states/provinces to region nodes
    if (azgaarMap.states && Array.isArray(azgaarMap.states)) {
      azgaarMap.states.forEach((state, index) => {
        // Skip the empty first element
        if (index === 0) return;
        
        // Find a reasonable position for this state
        // Ideally, we'd use the center of the state's territory
        let x = 400, y = 300; // Default fallback position
        
        // If state has a center defined
        if (state.center && state.center.length >= 2) {
          x = state.center[0] * 2;
          y = state.center[1] * 2;
        }
        
        nodes.push({
          id: `region-${state.i}`,
          type: 'environment',
          position: { x, y },
          data: {
            label: state.name || `Region ${state.i}`,
            description: `A ${state.type || 'region'} with ${state.burgs || 0} settlements.`,
            environmentId: `gen-region-${Date.now()}-${state.i}`
          }
        });
      });
    }
    
    // Create edges for connecting settlements in the same state
    if (azgaarMap.burgs && azgaarMap.burgs.length > 1) {
      const burgsByState = {};
      
      // Group burgs by state
      azgaarMap.burgs.forEach((burg, index) => {
        if (index === 0) return; // Skip first empty element
        
        const stateId = burg.state || 0;
        if (!burgsByState[stateId]) {
          burgsByState[stateId] = [];
        }
        burgsByState[stateId].push(burg);
      });
      
      // Create edges within each state
      Object.values(burgsByState).forEach(stateBurgs => {
        // Connect major settlements
        const majorBurgs = stateBurgs.filter(burg => burg.population > 5000);
        
        // Create a simple network connecting these burgs
        majorBurgs.forEach((burg, i) => {
          // Connect to the next burg in the list (circular)
          const nextBurg = majorBurgs[(i + 1) % majorBurgs.length];
          
          if (nextBurg && nextBurg.i !== burg.i) {
            edges.push({
              id: `edge-${burg.i}-${nextBurg.i}`,
              source: `env-burg-${burg.i}`,
              target: `env-burg-${nextBurg.i}`,
              type: 'custom',
              animated: false,
              style: { 
                stroke: '#F26430', 
                strokeWidth: 2 
              }
            });
          }
        });
      });
    }
    
    // Return the converted map data
    return {
      nodes,
      edges,
      metadata: {
        name: azgaarMap.info?.name || 'Generated Fantasy Map',
        description: azgaarMap.info?.description || 'Map generated with Azgaar\'s Fantasy Map Generator',
        generator: 'azgaar',
        generatedAt: new Date().toISOString()
      }
    };
  };

  // Function to generate a new map
  const generateNewMap = () => {
    if (!iframeRef.current) return;
    
    setGenerationStatus('Requesting new map generation...');
    
    // Send message to the iframe to generate a new map
    iframeRef.current.contentWindow.postMessage({ 
      command: 'generateNewMap' 
    }, '*');
  };
  
  // Function to export the current map
  const exportMap = () => {
    if (!iframeRef.current) return;
    
    setGenerationStatus('Requesting map export...');
    
    // Send message to the iframe to export the current map
    iframeRef.current.contentWindow.postMessage({ 
      command: 'exportMap' 
    }, '*');
  };
  
  // Create a custom style for our map
  const customizeMap = () => {
    if (!iframeRef.current) return;
    
    setGenerationStatus('Customizing map style...');
    
    // Send message to customize the map style
    iframeRef.current.contentWindow.postMessage({ 
      command: 'customizeMap',
      options: {
        mapStyle: 'fantasy',
        oceanColor: '#a6cee3',
        landColor: '#b2df8a',
        showGrid: true
      }
    }, '*');
  };

  return (
    <div className="azgaar-map-generator">
      <div className="generator-header">
        <h2>Fantasy Map Generator</h2>
        <p className="status-message">{generationStatus}</p>
      </div>
      
      <div className="generator-controls">
        <button 
          onClick={generateNewMap}
          disabled={!isMapReady}
          className="control-button generate-button"
        >
          Generate New Map
        </button>
        
        <button 
          onClick={customizeMap}
          disabled={!isMapReady}
          className="control-button customize-button"
        >
          Customize Style
        </button>
        
        <button 
          onClick={exportMap}
          disabled={!isMapReady}
          className="control-button export-button"
        >
          Save to App
        </button>
      </div>
      
      {showTips && (
        <div className="tips-container">
          <h3>Working with the Map Generator</h3>
          <ul>
            <li>Click <strong>Generate New Map</strong> to create a random fantasy map</li>
            <li>Use the tools inside the map editor to customize terrain, cities, and regions</li>
            <li>When satisfied with your map, click <strong>Save to App</strong> to import it into Worldbuilding Studio</li>
            <li>The map will appear in your main map view with locations converted to environments</li>
          </ul>
          <button 
            className="dismiss-tips"
            onClick={() => setShowTips(false)}
          >
            Hide Tips
          </button>
        </div>
      )}
      
      <div className="map-container">
        <iframe 
          ref={iframeRef}
          src="/azgaar-map.html" 
          title="Fantasy Map Generator"
          className="azgaar-iframe"
        />
      </div>
      
      {mapPreviewUrl && (
        <div className="map-preview">
          <h3>Map Preview</h3>
          <img 
            src={mapPreviewUrl} 
            alt="Generated fantasy map" 
            className="preview-image"
          />
        </div>
      )}
    </div>
  );
}

export default AzgaarMapGenerator;