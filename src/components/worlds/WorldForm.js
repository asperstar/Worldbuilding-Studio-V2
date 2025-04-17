// src/components/worlds/WorldForm.js
import React, { useState, useEffect, useRef } from 'react';

function WorldForm({ onSave, onCancel, initialWorld, isEditing }) {
  const [world, setWorld] = useState({
    name: '',
    description: '',
    rules: '',
    lore: '',
    imageUrl: '',
    imageFile: null, // Added this field
    imageSource: 'none',
    environmentIds: [],
    characterIds: []
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Initialize form when editing a world
  useEffect(() => {
    if (initialWorld) {
      setWorld({
        ...initialWorld,
        imageFile: null, // Reset file when loading from saved data
        imageSource: initialWorld.imageUrl ? 'upload' : 'none'
      });
      setImagePreview(initialWorld.imageUrl);
    } else {
      resetForm();
    }
  }, [initialWorld]);

  const resetForm = () => {
    setWorld({
      name: '',
      description: '',
      rules: '',
      lore: '',
      imageUrl: '',
      imageFile: null, // Added this field
      imageSource: 'none',
      environmentIds: [],
      characterIds: []
    });
    setImagePreview(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChange = (e) => {
    setWorld({
      ...world,
      [e.target.name]: e.target.value
    });
  };
  
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
      setWorld({
        ...world, 
        imageUrl: imageUrl,
        imageFile: file, // Store the actual file
        imageSource: 'upload'
      });
    }
  };
  
  const generatePlaceholderImage = () => {
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const svgCode = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${randomColor}" />
      <circle cx="100" cy="80" r="40" fill="white" />
      <rect x="40" y="120" width="120" height="50" fill="white" />
      <text x="100" y="180" font-family="Arial" font-size="14" text-anchor="middle" fill="black">
        ${world.name || 'World'}
      </text>
    </svg>`;
    
    const svgBlob = new Blob([svgCode], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(svgBlob);
    
    setImagePreview(url);
    setWorld({
      ...world, 
      imageUrl: url,
      imageFile: svgBlob, // Store the blob as file
      imageSource: 'generated'
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const clearImage = () => {
    setImagePreview(null);
    setWorld({
      ...world, 
      imageUrl: '',
      imageFile: null, // Clear the file too
      imageSource: 'none'
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(world);
  };

  // Clean up any object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && (world.imageSource === 'upload' || world.imageSource === 'generated')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, world.imageSource]);

  return (
    <form onSubmit={handleSubmit} className="world-form">
      <h2>{isEditing ? 'Edit World' : 'Create New World'}</h2>
      
      <div className="image-section">
        {imagePreview ? (
          <div className="image-preview">
            <img src={imagePreview} alt="World preview" />
            <button 
              type="button" 
              className="clear-image-button"
              onClick={clearImage}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="image-placeholder">
            <div className="placeholder-initial">
              {world.name ? world.name[0].toUpperCase() : '?'}
            </div>
            <p>World Image</p>
          </div>
        )}
        
        <div className="image-controls">
          <div className="form-group">
            <label>World Image:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              ref={fileInputRef}
              className="file-input"
              id="world-image-upload"
              style={{ display: 'none' }}
            />
            <div className="file-input-wrapper">
              <label htmlFor="world-image-upload" className="file-select-btn">Choose File</label>
              <span className="file-name">
                {world.imageFile ? (world.imageFile.name || 'Image selected') : 'No file chosen'}
              </span>
            </div>
          </div>
          
          <button 
            type="button" 
            className="generate-button"
            onClick={generatePlaceholderImage}
          >
            Generate Simple Image
          </button>
        </div>
      </div>
      
      <div className="form-group">
        <label>Name:</label>
        <input 
          type="text" 
          name="name" 
          value={world.name || ''}
          onChange={handleChange}
          required
          placeholder="Enter world name"
        />
      </div>
      
      <div className="form-group">
        <label>Description:</label>
        <textarea
          name="description"
          value={world.description || ''}
          onChange={handleChange}
          rows="3"
          placeholder="Brief description of this world"
        />
      </div>
      
      <div className="form-group">
        <label>Rules:</label>
        <textarea
          name="rules"
          value={world.rules || ''}
          onChange={handleChange}
          rows="4"
          placeholder="Special rules that define how this world works"
        />
      </div>
      
      <div className="form-group">
        <label>Lore:</label>
        <textarea
          name="lore"
          value={world.lore || ''}
          onChange={handleChange}
          rows="5"
          placeholder="History, mythology, and other background information"
        />
      </div>
      
      <div className="form-buttons">
        <button type="submit" className="submit-button">
          {isEditing ? 'Update World' : 'Create World'}
        </button>
        
        {isEditing && (
          <button 
            type="button" 
            className="cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default WorldForm;