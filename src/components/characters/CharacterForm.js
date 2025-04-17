import React, { useState, useEffect, useRef } from 'react';
import { analyzeImage } from '../../utils/visionAPI';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function CharacterForm({ onSave, onCancel, initialCharacter, isEditing, isSubmitting = false, onChange }) {
  const [character, setCharacter] = useState({
    name: '',
    personality: '',
    background: '',
    traits: '',
    appearance: '',
    imageUrl: '',
    imageFile: null,
    imageSource: 'none',
    writingSample: '',
    documentUrl: '',
    documentFile: null,
  });
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState(null);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [relationships, setRelationships] = useState([]);
  const [newRelationshipName, setNewRelationshipName] = useState('');
  const [newRelationshipDesc, setNewRelationshipDesc] = useState('');
  const documentInputRef = useRef(null);

  useEffect(() => {
    if (initialCharacter) {
      try {
        const cleanCharacter = Object.keys(initialCharacter).reduce((obj, key) => {
          if (initialCharacter[key] !== undefined) {
            obj[key] = initialCharacter[key];
          }
          return obj;
        }, {});
        
        setCharacter({
          ...cleanCharacter,
          imageSource: initialCharacter.imageUrl ? 'upload' : 'none',
          imageFile: null,
          documentFile: null,
        });
        
        setImagePreview(initialCharacter.imageUrl);
        
        if (Array.isArray(initialCharacter.relationships)) {
          setRelationships(initialCharacter.relationships);
        } else if (typeof initialCharacter.relationships === 'string' && initialCharacter.relationships.trim()) {
          setRelationships([{
            name: 'Legacy',
            relationship: initialCharacter.relationships
          }]);
        } else {
          setRelationships([]);
        }
      } catch (error) {
        console.error("Error initializing form:", error);
        resetForm();
      }
    } else {
      resetForm();
    }
  }, [initialCharacter]);

  const resetForm = () => {
    setCharacter({
      name: '',
      personality: '',
      background: '',
      traits: '',
      appearance: '',
      imageUrl: '',
      imageFile: null,
      imageSource: 'none',
      writingSample: '',
      documentUrl: '',
      documentFile: null,
    });
    setImagePreview(null);
    setRelationships([]);
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
    const { name, value } = e.target;
    setCharacter(prev => ({
      ...prev,
      [name]: value
    }));
    if (onChange) {
      onChange(e);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    setImageUploadError(null);
    setIsUploadingImage(true);
  
    try {
      // Create URL for preview
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Store the file reference for later upload in handleSubmit
      setCharacter(prev => ({
        ...prev,
        imageFile: file,
        imageSource: 'upload'
      }));
  
      if (onChange) {
        onChange({ target: { name: 'imageFile', value: file } });
      }
    } catch (error) {
      console.error("Image upload error:", error);
      setImageUploadError(error.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageAnalysis = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      return;
    }

    setIsAnalyzingImage(true);
    setImageUploadError(null);

    try {
      const result = await analyzeImage(fileInputRef.current.files[0]);
      setImageAnalysisResult(result);

      if (result.labels && result.labels.length > 0) {
        const newTraits = result.labels.slice(0, 3).join(', ');
        setCharacter(prev => {
          const updated = {
            ...prev,
            traits: prev.traits ? `${prev.traits}, ${newTraits}` : newTraits
          };
          if (onChange) {
            onChange({ target: { name: 'traits', value: updated.traits } });
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      setImageUploadError(`Failed to analyze image: ${error.message}`);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.size > 1024 * 1024) {
        throw new Error("Please choose a document smaller than 1MB");
      }

      const storageRef = ref(storage, `documents/${file.name}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const documentUrl = await getDownloadURL(storageRef);

      setCharacter(prev => {
        const updated = {
          ...prev,
          documentUrl,
          documentFile: file
        };
        if (onChange) {
          onChange({ target: { name: 'documentUrl', value: documentUrl } });
        }
        return updated;
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Could not upload the document file. Please try a different file.");
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };

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
  
      const svgBlob = new Blob([svgCode], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
  
      setImagePreview(url);
      setCharacter(prev => {
        const updated = {
          ...prev,
          imageFile: svgBlob, // Store the blob as imageFile
          imageSource: 'generated'
        };
        if (onChange) {
          onChange({ target: { name: 'imageFile', value: svgBlob } });
        }
        return updated;
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
    setCharacter(prev => {
      const updated = {
        ...prev,
        imageUrl: '',
        imageFile: null,
        imageSource: 'none'
      };
      if (onChange) {
        onChange({ target: { name: 'imageFile', value: null } });
      }
      return updated;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addRelationship = () => {
    if (newRelationshipName.trim() === '') return;

    const newRelationship = {
      id: Date.now().toString(),
      name: newRelationshipName,
      relationship: newRelationshipDesc
    };

    setRelationships(prev => {
      const updated = [...prev, newRelationship];
      if (onChange) {
        onChange({ target: { name: 'relationships', value: updated } });
      }
      return updated;
    });
    setNewRelationshipName('');
    setNewRelationshipDesc('');
  };

  const removeRelationship = (index) => {
    setRelationships(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      if (onChange) {
        onChange({ target: { name: 'relationships', value: updated } });
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      const characterData = {
        ...character,
        relationships: relationships,
        updated: new Date().toISOString()
      };
      await onSave(characterData);
    } catch (error) {
      console.error("Error submitting character:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview && (character.imageSource === 'upload' || character.imageSource === 'generated')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, character.imageSource]);

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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
            <div className="file-input-wrapper">
              <label 
                htmlFor="character-image-upload" 
                className={`file-select-btn ${isSubmitting ? 'disabled' : ''}`}
              >
                Choose File
              </label>
              <span className="file-name">
                {character.imageFile ? character.imageFile.name : 'No file chosen'}
              </span>
            </div>
          </div>

          <button 
            type="button" 
            className="generate-button"
            onClick={generatePlaceholderImage}
            disabled={isSubmitting || isUploadingImage}
          >
            Generate Simple Avatar
          </button>
        </div>
      </div>

      {imageUploadError && (
        <div className="error-message">
          {imageUploadError}
        </div>
      )}

      <button 
        type="button"
        className="analyze-image-button"
        onClick={handleImageAnalysis}
        disabled={isAnalyzingImage || !fileInputRef.current?.files?.[0] || isSubmitting}
      >
        {isAnalyzingImage ? 'Analyzing...' : 'Analyze Image with AI'}
      </button>

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
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label>Appearance:</label>
        <textarea
          name="appearance"
          value={character.appearance || ''}
          onChange={handleChange}
          rows="2"
          placeholder="Physical description, clothing, etc."
          disabled={isSubmitting}
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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
        />
      </div>

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
                disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
          <input
            type="text"
            placeholder="Relationship Description"
            value={newRelationshipDesc}
            onChange={(e) => setNewRelationshipDesc(e.target.value)}
            disabled={isSubmitting}
          />
          <button 
            type="button"
            onClick={addRelationship}
            disabled={isSubmitting}
          >
            Add Relationship
          </button>
        </div>
      </div>

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
            disabled={isSubmitting}
          />
          <div className="file-input-wrapper">
            <label 
              htmlFor="character-document-upload" 
              className={`file-select-btn ${isSubmitting ? 'disabled' : ''}`}
            >
              Choose Document
            </label>
            <span className="file-name">
              {character.documentFile ? character.documentFile.name : 'No file chosen'}
            </span>
          </div>
        </div>

        {character.documentUrl && (
          <div className="document-preview">
            <h4>Document URL:</h4>
            <a href={character.documentUrl} target="_blank" rel="noopener noreferrer">
              View Document
            </a>
          </div>
        )}
      </div>

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
          disabled={isSubmitting}
        />
      </div>

      <div className="form-buttons">
        <button 
          type="submit" 
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Character' : 'Save Character')}
        </button>

        {isEditing && (
          <button 
            type="button" 
            className="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default CharacterForm;