// src/components/environments/EnvironmentForm.js
import React, { useState, useEffect, useRef } from 'react';
import { useStorage } from '../../contexts/StorageContext';

function EnvironmentForm({ onSave, onCancel, initialEnvironment, isEditing }) {
  const [environment, setEnvironment] = useState({
    name: '',
    description: '',
    climate: '',
    terrain: '',
    inhabitants: '',
    points_of_interest: '',
    dangers: '',
    imageUrl: '',
    imageSource: 'none',
    mapCoordinates: { x: 0, y: 0 },
    mapSize: { width: 1, height: 1 }
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const { currentUser } = useStorage();
  
  // Initialize form when editing
  useEffect(() => {
    if (initialEnvironment) {
      setEnvironment({
        ...initialEnvironment,
        imageSource: initialEnvironment.imageUrl ? 'upload' : 'none',
        mapCoordinates: initialEnvironment.mapCoordinates || { x: 0, y: 0 },
        mapSize: initialEnvironment.mapSize || { width: 1, height: 1 }
      });
      setImagePreview(initialEnvironment.imageUrl);
    } else {
      resetForm();
    }
  }, [initialEnvironment]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && environment.imageSource === 'generated') {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, environment.imageSource]);

  const resetForm = () => {
    setEnvironment({
      name: '',
      description: '',
      climate: '',
      terrain: '',
      inhabitants: '',
      points_of_interest: '',
      dangers: '',
      imageUrl: '',
      imageSource: 'none',
      mapCoordinates: { x: 0, y: 0 },
      mapSize: { width: 1, height: 1 }
    });
    setImagePreview(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChange = (e) => {
    setEnvironment({
      ...environment,
      [e.target.name]: e.target.value
    });
  };
  
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // For now, just create a local object URL
      // In a real Firebase implementation, you would upload to Firebase Storage
      const imageUrl = URL.createObjectURL(file);
      
      setImagePreview(imageUrl);
      setEnvironment({
        ...environment, 
        imageUrl: imageUrl,
        imageSource: 'upload'
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };
  
  const generatePlaceholderImage = () => {
    const colors = ['#3498db', '#2ecc71', '#f39c12', '#1abc9c', '#16a085'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const svgCode = `
    <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill="${randomColor}" />
      
      <!-- Sky/Background -->
      <rect width="400" height="120" fill="${randomColor}" />
      
      <!-- Mountains/Terrain -->
      <polygon points="0,120 80,60 160,100 240,40 320,80 400,60 400,120" fill="rgba(0,0,0,0.3)" />
      
      <!-- Ground/Foreground -->
      <rect x="0" y="120" width="400" height="80" fill="rgba(0,0,0,0.2)" />
      
      <!-- Text -->
      <text x="200" y="180" font-family="Arial" font-size="16" text-anchor="middle" fill="white">
        ${environment.name || 'Environment'}
      </text>
    </svg>`;
    
    const svgBlob = new Blob([svgCode], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(svgBlob);
    
    setImagePreview(url);
    setEnvironment({
      ...environment, 
      imageUrl: url,
      imageSource: 'generated'
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const clearImage = () => {
    if (imagePreview && environment.imageSource === 'generated') {
      URL.revokeObjectURL(imagePreview);
    }
    
    setImagePreview(null);
    setEnvironment({
      ...environment, 
      imageUrl: '',
      imageSource: 'none'
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Add userId for Firestore security rules
      await onSave({
        ...environment,
        userId: currentUser?.uid
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to save environment. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="environment-form">
      <div className="image-section">
        {imagePreview ? (
          <div className="image-preview environment-preview">
            <img src={imagePreview} alt="Environment preview" />
            <button 
              type="button" 
              className="clear-image-button"
              onClick={clearImage}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="image-placeholder environment-placeholder">
            <div className="placeholder-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 16.42V19.5C21 20.33 20.33 21 19.5 21H4.5C3.67 21 3 20.33 3 19.5V16.42C3 15.91 3.35 15.49 3.85 15.4C4.96 15.21 6 14.73 6.75 14C7.47 13.3 8 12.29 8 11.17V8C8 4.69 10.69 2 14 2C17.31 2 20 4.69 20 8V11.17C20 12.29 20.53 13.3 21.25 14C22 14.73 23.04 15.21 24.15 15.4C24.65 15.49 25 15.91 25 16.42" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 21C10 22.1 10.9 23 12 23C13.1 23 14 22.1 14 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>Environment Image</p>
          </div>
        )}
        
        <div className="image-controls">
          <div className="form-group">
            <label>Environment Image:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              ref={fileInputRef}
              className="file-input"
              id="environment-image-upload"
              disabled={isUploading}
              
              
            />
            <div className="file-input-wrapper">
              <label htmlFor="environment-image-upload" className="file-select-btn">
                {isUploading ? 'Uploading...' : 'Choose File'}
                onChange={handleChange}
              </label>
              <span className="file-name">
                {fileInputRef.current?.files?.[0]?.name || "No file chosen"}
              </span>
            </div>
          </div>
          
          <div className="image-buttons">
            <button 
              type="button" 
              className="generate-button"
              onClick={generatePlaceholderImage}
              disabled={isUploading}
              onChange={handleChange}
            >
              Generate Simple Image
            </button>
            
            <button 
              type="button" 
              className="generate-ai-button"
              onClick={() => alert("AI Image generation coming soon!")}
              disabled={true}
              onChange={handleChange}
            >
              AI Image (Coming Soon)
            </button>
          </div>
        </div>
      </div>
      
     {/* Form Fields */}
<div className="form-fields">
  <div className="form-group">
    <label htmlFor="name">Name:</label>
    <input
      type="text"
      id="name"
      name="name"
      value={environment.name}
      onChange={handleChange}
      required
    />
  </div>
  
  <div className="form-group">
    <label htmlFor="climate">Climate:</label>
    <input
      type="text"
      id="climate"
      name="climate"
      value={environment.climate}
      onChange={handleChange}
    />
  </div>
  
  <div className="form-group">
    <label htmlFor="terrain">Terrain:</label>
    <input
      type="text"
      id="terrain"
      name="terrain"
      value={environment.terrain}
      onChange={handleChange}
    />
  </div>
  
  <div className="form-group">
    <label htmlFor="description">Description:</label>
    <textarea
      id="description"
      name="description"
      value={environment.description}
      onChange={handleChange}
      rows="3"
    ></textarea>
  </div>
  
  <div className="form-group">
    <label htmlFor="inhabitants">Inhabitants:</label>
    <textarea
      id="inhabitants"
      name="inhabitants"
      value={environment.inhabitants}
      onChange={handleChange}
      rows="2"
    ></textarea>
  </div>
  
  <div className="form-group">
    <label htmlFor="points_of_interest">Points of Interest:</label>
    <textarea
      id="points_of_interest"
      name="points_of_interest"
      value={environment.points_of_interest}
      onChange={handleChange}
      rows="2"
    ></textarea>
  </div>
  
  <div className="form-group">
    <label htmlFor="dangers">Dangers:</label>
    <textarea
      id="dangers"
      name="dangers"
      value={environment.dangers}
      onChange={handleChange}
      rows="2"
    ></textarea>
  </div>
</div>
      
      <div className="form-buttons">
        <button 
          type="submit" 
          className="submit-button"
          disabled={isUploading}
          onChange={handleChange}
        >
          {isEditing ? 'Update Environment' : 'Save Environment'}
        </button>
        
        {isEditing && (
          <button 
            type="button" 
            className="cancel-button"
            onClick={onCancel}
            disabled={isUploading}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default EnvironmentForm;