import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapDescriptionForm from './MapDescriptionForm';
import AzgaarMapIframe from './AzgaarMapIframe';
import AiMapGenerator from './AiMapGenerator';

function FantasyMapGenerator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('node');
  const [generatedMapData, setGeneratedMapData] = useState(null);
  
  useEffect(() => {
    // Update the base path for texture files
    window.FMG_CONFIG = {
      ...window.FMG_CONFIG,
      basePath: '/lib/fantasy-map-generator/',
      texturePath: '/lib/fantasy-map-generator/images/textures/'
    };

    // Load the fantasy map generator
    const script = document.createElement('script');
    script.src = '/lib/fantasy-map-generator/main.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleMapGenerated = (mapData) => {
    console.log('Map generated:', mapData);
    setGeneratedMapData(mapData);
    // Add any additional logic to handle the generated map
  };
  
  return (
    <div className="fantasy-map-generator">
      <div className="map-controls">
        <button onClick={() => navigate('/map')}>Back to Main Map</button>
      </div>
      <h2>Fantasy Map Generator</h2>
      
      <div className="generator-tabs">
        <button 
          className={`tab-button ${activeTab === 'node' ? 'active' : ''}`}
          onClick={() => setActiveTab('node')}
        >
          Node-Based Map
        </button>
        <button 
          className={`tab-button ${activeTab === 'azgaar' ? 'active' : ''}`}
          onClick={() => setActiveTab('azgaar')}
        >
          Advanced Map Generator
        </button>
        <button 
          className={`tab-button ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          Simple AI Generation
        </button>
      </div>
      
      {activeTab === 'node' && (
        <div className="node-map-generator">
          <MapDescriptionForm onGenerate={() => {}} />
        </div>
      )}
      
      {activeTab === 'azgaar' && (
        <div className="azgaar-map-generator-container">
          <AzgaarMapIframe onMapGenerated={handleMapGenerated} />
        </div>
      )}
      
      {activeTab === 'ai' && (
        <div className="ai-map-generator-container">
          <AiMapGenerator onMapGenerated={handleMapGenerated} />
        </div>
      )}
      
      {generatedMapData && (
        <div className="map-import-success">
          <div className="success-message">
            <h3>Map Successfully Imported!</h3>
            <p>Your map "{generatedMapData.metadata.name}" has been saved and is now available in your maps.</p>
          </div>
          <button onClick={() => setGeneratedMapData(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

export default FantasyMapGenerator;