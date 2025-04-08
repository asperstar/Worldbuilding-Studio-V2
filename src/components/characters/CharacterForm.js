import React, { useState, useEffect, useRef } from 'react';
import { analyzeImage } from '../../utils/visionAPI';

function CharacterForm({ onSave, onCancel, initialCharacter, isEditing, isSubmitting = false }) { // ADDED isSubmitting prop for loading state
  const [character, setCharacter] = useState({
    name: '',
    personality: '',
    background: '',
    traits: '',
    appearance: '',
    imageUrl: '',
    imageSource: 'none',
    writingSample: ''
  });
  // ADDED loading and error state for image handling
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState(null);
  const [imageUploadError, setImageUploadError] = useState(null); // ADDED for image upload errors
  const [isUploadingImage, setIsUploadingImage] = useState(false); // ADDED for image upload loading state
  
  const handleImageAnalysis = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      return;
    }
    
    setIsAnalyzingImage(true);
    setImageUploadError(null); // ADDED: Clear previous errors
    
    try {
      const result = await analyzeImage(fileInputRef.current.files[0]);
      setImageAnalysisResult(result);
      
      // Auto-populate fields based on analysis
      if (result.text) {
        // Extract potential character details from text
      }
      
      if (result.labels && result.labels.length > 0) { // ADDED: null check for labels
        // Use labels to suggest traits
        setCharacter(prev => ({
          ...prev,
          traits: prev.traits ? 
            `${prev.traits}, ${result.labels.slice(0, 3).join(', ')}` : 
            result.labels.slice(0, 3).join(', ')
        }));
      }
      
    } catch (error) {
      console.error('Image analysis error:', error);
      // ADDED: Set error message
      setImageUploadError(`Failed to analyze image: ${error.message}`);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [relationships, setRelationships] = useState([]);
  const [newRelationshipName, setNewRelationshipName] = useState('');
  const [newRelationshipDesc, setNewRelationshipDesc] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [documentContent, setDocumentContent] = useState('');
  const documentInputRef = useRef(null);

  // Initialize form when editing a character
  // IMPROVED: Combined duplicate useEffect hooks and added better error handling
  useEffect(() => {
    if (initialCharacter) {
      try {
        // Create a clean copy of the character without any undefined fields
        const cleanCharacter = Object.keys(initialCharacter).reduce((obj, key) => {
          if (initialCharacter[key] !== undefined) {
            obj[key] = initialCharacter[key];
          }
          return obj;
        }, {});
        
        setCharacter({
          ...cleanCharacter,
          imageSource: initialCharacter.imageUrl ? 'upload' : 'none'
        });
        
        setImagePreview(initialCharacter.imageUrl);
        
        // Handle relationships safely
        if (Array.isArray(initialCharacter.relationships)) {
          setRelationships(initialCharacter.relationships);
        } else if (typeof initialCharacter.relationships === 'string' && initialCharacter.relationships.trim()) {
          // If relationships is a string, try to convert it to our new format
          setRelationships([{
            name: 'Legacy',
            relationship: initialCharacter.relationships
          }]);
        } else {
          setRelationships([]);
        }

        // ADDED: Load document content if exists
        if (initialCharacter.documentDescription) {
          setDocumentContent(initialCharacter.documentDescription);
        }
        
        if (initialCharacter.documentFile) {
          setDocumentFile(initialCharacter.documentFile);
        }
      } catch (error) {
        console.error("Error initializing form:", error);
        // ADDED: Reset form if there's an error
        resetForm();
      }
    } else {
      resetForm();
    }
  }, [initialCharacter]);

  // IMPROVED: More comprehensive reset function
  const resetForm = () => {
    setCharacter({
      name: '',
      personality: '',
      background: '',
      traits: '',
      appearance: '',
      imageUrl: '',
      imageSource: 'none',
      writingSample: ''
    });
    setImagePreview(null);
    setRelationships([]);
    setDocumentContent('');
    setDocumentFile(null);
    setImageAnalysisResult(null);
    setImageUploadError(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  const handleChange = (e) => {
    setCharacter({
      ...character,
      [e.target.name]: e.target.value
    });
  };
  
  // IMPROVED: Better error handling for image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Clear previous errors
    setImageUploadError(null);
    setIsUploadingImage(true);
    
    try {
      // Check file size (optional, to prevent storage limits from being reached)
      if (file.size > 1024 * 1024) { // 1MB limit
        throw new Error("Please choose an image smaller than 1MB");
      }
      
      // CHANGED: Using Promise-based approach for consistency
      const base64Image = await readFileAsDataURL(file);
      
      setImagePreview(base64Image);
      setCharacter({
        ...character, 
        imageUrl: base64Image,
        imageSource: 'upload'
      });
    } catch (error) {
      console.error("Image upload error:", error);
      setImageUploadError(error.message);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploadingImage(false);
    }
  };
  
  // ADDED: Helper function to read file as data URL with Promise
  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // KEPT but not duplicated - cleanup for URL objects
  useEffect(() => {
    return () => {
      if (imagePreview && (character.imageSource === 'upload' || character.imageSource === 'generated')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, character.imageSource]);

  // IMPROVED: More robust relationship handling
  const addRelationship = () => {
    if (newRelationshipName.trim() === '') return;
    
    // ADDED: Create a unique ID for the relationship
    const newRelationship = {
      id: Date.now().toString(), // Add an ID for Firebase
      name: newRelationshipName,
      relationship: newRelationshipDesc
    };
    
    setRelationships([...relationships, newRelationship]);
    setNewRelationshipName('');
    setNewRelationshipDesc('');
  };

  const removeRelationship = (index) => {
    const updatedRelationships = [...relationships];
    updatedRelationships.splice(index, 1);
    setRelationships(updatedRelationships);
  };
  
  // IMPROVED: Better error handling for document upload
  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Size validation
      if (file.size > 1024 * 1024) { // 1MB limit
        throw new Error("Please choose a document smaller than 1MB");
      }
      
      const text = await readFileAsText(file);
      setDocumentContent(text);
      
      // Store both the text content and file metadata
      setCharacter({
        ...character,
        documentDescription: text,
        documentFile: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      });
      
      setDocumentFile(file);
    } catch (error) {
      console.error("Error reading document:", error);
      alert("Could not read the document file. Please try a different file.");
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };
  
  // Keep helper function to read files
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };
  
  // IMPROVED: Better error handling for placeholder image generation
  const generatePlaceholderImage = () => {
    try {
      const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const svgCode = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="${randomColor}" />
        <circle cx="100" cy="70" r="40" fill="white" />
        <rect x="60" y="120" width="80" height="60" fill="white" />
        <text x="100" y="180" font-family="Arial" font-size="12" text-anchor="middle" fill="black">
          ${character.name || 'Character'}
        </text>
      </svg>`;
      
      const svgBlob = new Blob([svgCode], {type: 'image/svg+xml'});
      const url = URL.createObjectURL(svgBlob);
      
      setImagePreview(url);
      setCharacter({
        ...character, 
        imageUrl: url,
        imageSource: 'generated'
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error generating placeholder image:", error);
      setImageUploadError("Failed to generate placeholder image");
    }
  };
  
  const clearImage = () => {
    setImagePreview(null);
    setCharacter({
      ...character, 
      imageUrl: '',
      imageSource: 'none'
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // IMPROVED: Submit handler with loading state
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if the form is already submitting
    if (isSubmitting) return;
    
    try {
      // Prepare complete character data
      const characterData = {
        ...character,
        relationships: relationships,
        updated: new Date().toISOString() // Add timestamp for Firestore
      };
      
      // Call the save function passed from parent
      await onSave(characterData);
    } catch (error) {
      console.error("Error submitting character:", error);
      // In a real app, you might want to show an error message to the user
    }
  };

  return (
    <form onSubmit={handleSubmit} className="character-form">
      <h2>{isEditing ? 'Edit Character' : 'Create New Character'}</h2>
      
      <div className="image-section">
        {imagePreview ? (
          <div className="image-preview">
            <img src={imagePreview} alt="Character preview" />
            <button 
              type="button" 
              className="clear-image-button"
              onClick={clearImage}
              disabled={isSubmitting} // ADDED: Disable during submission
            >
              ×
            </button>
          </div>
        ) : (
          <div className="image-placeholder">
            <div className="placeholder-initial">
              {character.name ? character.name[0].toUpperCase() : '?'}
            </div>
            <p>Character Image</p>
          </div>
        )}
        
        <div className="image-controls">
          <div className="form-group">
            <label>Character Image:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              ref={fileInputRef}
              className="file-input"
              id="character-image-upload"
              style={{ display: 'none' }}
              disabled={isSubmitting} // ADDED: Disable during submission
            />
            <div className="file-input-wrapper">
              <label 
                htmlFor="character-image-upload" 
                className={`file-select-btn ${isSubmitting ? 'disabled' : ''}`} // ADDED: Disabled class
              >
                Choose File
              </label>
              <span className="file-name">
                {character.imageSource === 'upload' ? 'Image selected' : 'No file chosen'}
              </span>
            </div>
          </div>
          
          <button 
            type="button" 
            className="generate-button"
            onClick={generatePlaceholderImage}
            disabled={isSubmitting || isUploadingImage} // ADDED: Disable during submission
          >
            Generate Simple Avatar
          </button>
        </div>
      </div>
      
      {/* ADDED: Show image upload error */}
      {imageUploadError && (
        <div className="error-message">
          {imageUploadError}
        </div>
      )}
      
      <button 
        type="button"
        className="analyze-image-button"
        onClick={handleImageAnalysis}
        disabled={isAnalyzingImage || !fileInputRef.current?.files?.[0] || isSubmitting} // ADDED: Disable during submission
      >
        {isAnalyzingImage ? 'Analyzing...' : 'Analyze Image with AI'}
      </button>
    
      {/* Keep image analysis results display */}
      {imageAnalysisResult && (
        <div className="image-analysis-results">
          <h4>Image Analysis Results</h4>
          {imageAnalysisResult.text && (
            <div>
              <p><strong>Detected Text:</strong></p>
              <p className="detected-text">{imageAnalysisResult.text}</p>
            </div>
          )}
          {imageAnalysisResult.labels && imageAnalysisResult.labels.length > 0 && (
            <div>
              <p><strong>Detected Elements:</strong></p>
              <p className="detected-labels">{imageAnalysisResult.labels.join(', ')}</p>
            </div>
          )}
        </div>
      )}
      
      <div className="form-group">
        <label>Name:</label>
        <input 
          type="text" 
          name="name" 
          value={character.name || ''}
          onChange={handleChange}
          required
          disabled={isSubmitting} // ADDED: Disable during submission
        />
      </div>
      
      {/* Keep remaining form fields, adding disabled property */}
      <div className="form-group">
        <label>Appearance:</label>
        <textarea
          name="appearance"
          value={character.appearance || ''}
          onChange={handleChange}
          rows="2"
          placeholder="Physical description, clothing, etc."
          disabled={isSubmitting} // ADDED: Disable during submission
        />
      </div>
      
      <div className="form-group">
        <label>Personality:</label>
        <textarea
          name="personality"
          value={character.personality || ''}
          onChange={handleChange}
          rows="3"
          placeholder="Character's behavior, attitudes, and motivations"
          disabled={isSubmitting} // ADDED: Disable during submission
        />
      </div>
      
      <div className="form-group">
        <label>Background:</label>
        <textarea
          name="background"
          value={character.background || ''}
          onChange={handleChange}
          rows="4"
          placeholder="Character's history and origin story"
          disabled={isSubmitting} // ADDED: Disable during submission
        />
      </div>
      
      <div className="form-group">
        <label>Key Traits:</label>
        <input
          type="text"
          name="traits"
          value={character.traits || ''}
          onChange={handleChange}
          placeholder="Brave, cunning, loyal, etc. (comma separated)"
          disabled={isSubmitting} // ADDED: Disable during submission
        />
      </div>
      
      {/* Relationships Section */}
      <div className="form-section">
        <h3>Character Relationships</h3>
        
        <div className="relationships-list">
          {relationships.map((rel, index) => (
            <div key={index} className="relationship-item">
              <strong>{rel.name}:</strong> {rel.relationship}
              <button 
                type="button" 
                onClick={() => removeRelationship(index)}
                className="remove-btn"
                disabled={isSubmitting} // ADDED: Disable during submission
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        
        <div className="add-relationship">
          <input
            type="text"
            placeholder="Character Name"
            value={newRelationshipName}
            onChange={(e) => setNewRelationshipName(e.target.value)}
            disabled={isSubmitting} // ADDED: Disable during submission
          />
          <input
            type="text"
            placeholder="Relationship Description"
            value={newRelationshipDesc}
            onChange={(e) => setNewRelationshipDesc(e.target.value)}
            disabled={isSubmitting} // ADDED: Disable during submission
          />
          <button 
            type="button"
            onClick={addRelationship}
            disabled={isSubmitting} // ADDED: Disable during submission
          >
            Add Relationship
          </button>
        </div>
      </div>
      
      {/* Document Section */}
      <div className="form-section">
        <h3>Character Document</h3>
        <p className="helper-text">Upload a document with additional character information.</p>
        
        <div className="document-upload">
          <input
            type="file"
            accept=".txt,.doc,.docx,.pdf,.md"
            onChange={handleDocumentUpload}
            ref={documentInputRef}
            className="file-input"
            id="character-document-upload"
            style={{ display: 'none' }}
            disabled={isSubmitting} // ADDED: Disable during submission
          />
          <div className="file-input-wrapper">
            <label 
              htmlFor="character-document-upload" 
              className={`file-select-btn ${isSubmitting ? 'disabled' : ''}`} // ADDED: Disabled class
            >
              Choose Document
            </label>
            <span className="file-name">
              {documentFile ? documentFile.name : 'No file chosen'}
            </span>
          </div>
        </div>
        
        {documentContent && (
          <div className="document-preview">
            <h4>Document Preview:</h4>
            <div className="document-content-preview">
              {documentContent.substring(0, 300)}
              {documentContent.length > 300 && '...'}
            </div>
          </div>
        )}
      </div>
      
      {/* Writing Sample Section */}
      <div className="form-section">
        <h3>Writing Sample</h3>
        <p className="helper-text">
          Provide an example of this character's writing or dialogue style to help the AI match their voice.
        </p>
        
        <textarea
          name="writingSample"
          value={character.writingSample || ''}
          onChange={handleChange}
          rows="5"
          placeholder="Example: 'My dear friend, I cannot express how utterly delighted I am to receive your correspondence...'"
          disabled={isSubmitting} // ADDED: Disable during submission
        />
      </div>
      
      {/* Form Buttons */}
      <div className="form-buttons">
        <button 
          type="submit" 
          className="submit-button"
          disabled={isSubmitting} // ADDED: Disable during submission
        >
          {isSubmitting ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Character' : 'Save Character')}
        </button>
        
        {isEditing && (
          <button 
            type="button" 
            className="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting} // ADDED: Disable during submission
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default CharacterForm;