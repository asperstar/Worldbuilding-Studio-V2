// src/components/maps/MapDescriptionForm.js
import React, { useState } from 'react';

function MapDescriptionForm({ onGenerate }) {
  const [description, setDescription] = useState('');
  const [mapName, setMapName] = useState('');
  const [mapType, setMapType] = useState('fantasy');
  const [mapSize, setMapSize] = useState('medium');
  const [features, setFeatures] = useState({
    mountains: true,
    forests: true,
    rivers: true,
    cities: true,
    roads: true,
    oceans: false,
    deserts: false,
    landmarks: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleFeatureChange = (e) => {
    const { name, checked } = e.target;
    setFeatures(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      alert('Please provide a description of your map');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onGenerate({
        name: mapName,
        description,
        type: mapType,
        size: mapSize,
        features
      });
    } catch (error) {
      console.error('Error generating map:', error);
      alert(`Map generation failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="map-description-form">
      <h2>Generate Map from Description</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="map-name">Map Name:</label>
          <input
            id="map-name"
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="Enter a name for your map"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="map-description">Map Description:</label>
          <textarea
            id="map-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your world in detail. Include terrain features, cities, kingdoms, landmarks, etc."
            rows="6"
            required
          />
          <p className="description-tips">
            <strong>Tips:</strong> Include details about the terrain, major landmarks, cities, 
            political boundaries, and any special features like magical areas or dangerous zones.
            The more detailed your description, the better the result!
          </p>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="map-type">Map Type:</label>
            <select
              id="map-type"
              value={mapType}
              onChange={(e) => setMapType(e.target.value)}
            >
              <option value="fantasy">Fantasy</option>
              <option value="medieval">Medieval</option>
              <option value="sci-fi">Science Fiction</option>
              <option value="modern">Modern</option>
              <option value="post-apocalyptic">Post-Apocalyptic</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="map-size">Map Size:</label>
            <select
              id="map-size"
              value={mapSize}
              onChange={(e) => setMapSize(e.target.value)}
            >
              <option value="small">Small (Region)</option>
              <option value="medium">Medium (Country)</option>
              <option value="large">Large (Continent)</option>
              <option value="world">World Map</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label>Include Features:</label>
          <div className="feature-checkboxes">
            {Object.entries(features).map(([feature, checked]) => (
              <label key={feature} className="feature-checkbox">
                <input
                  type="checkbox"
                  name={feature}
                  checked={checked}
                  onChange={handleFeatureChange}
                />
                {feature.charAt(0).toUpperCase() + feature.slice(1)}
              </label>
            ))}
          </div>
        </div>
        
        <div className="form-buttons">
          <button 
            type="submit" 
            className="generate-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Generating Map...' : 'Generate Map'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MapDescriptionForm;