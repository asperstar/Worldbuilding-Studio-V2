import React, { useState, useEffect } from 'react';
import EnvironmentForm from '../components/environments/EnvironmentForm';
import { loadEnvironments, saveEnvironments, deleteEnvironment } from '../utils/storage';
import { useStorage } from '../contexts/StorageContext';

function EnvironmentsPage() {
  const [environments, setEnvironments] = useState([]);
  const [editingEnvironment, setEditingEnvironment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEnvironments, setFilteredEnvironments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { currentUser } = useStorage();
  
  // Load environments from Firestore on component mount
  useEffect(() => {
    const fetchEnvironments = async () => {
      setIsLoading(true);
      try {
        const savedEnvironments = await loadEnvironments();
        setEnvironments(savedEnvironments);
        setFilteredEnvironments(savedEnvironments);
      } catch (error) {
        console.error("Error loading environments:", error);
        setError("Failed to load environments. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentUser) {
      fetchEnvironments();
    }
  }, [currentUser]);
  
  // Save environments to Firestore whenever the array changes
  useEffect(() => {
    const saveData = async () => {
      if (environments.length > 0 && currentUser) {
        try {
          await saveEnvironments(environments);
        } catch (error) {
          console.error("Error saving environments:", error);
          setError("Failed to save changes. Please try again.");
        }
      }
    };
    
    saveData();
  }, [environments, currentUser]);

  // Filter environments based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEnvironments(environments);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = environments.filter(env => 
        env.name.toLowerCase().includes(query) || 
        (env.climate && env.climate.toLowerCase().includes(query)) ||
        (env.description && env.description.toLowerCase().includes(query))
      );
      setFilteredEnvironments(filtered);
    }
  }, [searchQuery, environments]);

  const saveEnvironment = async (newEnvironment) => {
    // Ensure imageUrl is properly preserved
    const imageUrl = newEnvironment.imageUrl || '';
    
    try {
      if (editingEnvironment) {
        // Update existing environment
        const updatedEnvironments = environments.map(env => 
          env.id === editingEnvironment.id 
            ? { 
                ...newEnvironment, 
                id: env.id, 
                imageUrl, 
                created: env.created, 
                updated: new Date().toISOString(),
                userId: currentUser?.uid
              }
            : env
        );
        setEnvironments(updatedEnvironments);
        setEditingEnvironment(null);
      } else {
        // Create new environment
        const newEnvironmentWithId = { 
          ...newEnvironment, 
          imageUrl,
          id: Date.now(),
          created: new Date().toISOString(),
          userId: currentUser?.uid
        };
        setEnvironments(prevEnvironments => [...prevEnvironments, newEnvironmentWithId]);
      }
    } catch (error) {
      console.error("Error saving environment:", error);
      setError("Failed to save environment. Please try again.");
    }
  };
  
  const startEditing = (environment) => {
    setEditingEnvironment(environment);
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const cancelEditing = () => {
    setEditingEnvironment(null);
  };
  
  const handleDeleteEnvironment = async (id) => {
    // If we're editing this environment, cancel editing
    if (editingEnvironment && editingEnvironment.id === id) {
      setEditingEnvironment(null);
    }
    
    try {
      // Delete from Firestore first
      await deleteEnvironment(id);
      // Then update local state
      setEnvironments(prevEnvironments => prevEnvironments.filter(env => env.id !== id));
    } catch (error) {
      console.error("Error deleting environment:", error);
      setError("Failed to delete environment. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="loading">Loading environments...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="environments-page">
      <h1>Environments</h1>
      
      <div className="page-content">
        <div className="form-section">
          <h2>{editingEnvironment ? 'Edit Environment' : 'Create New Environment'}</h2>
          <EnvironmentForm 
            onSave={saveEnvironment} 
            initialEnvironment={editingEnvironment}
            onCancel={cancelEditing}
            isEditing={!!editingEnvironment}
          />
        </div>
        
        <div className="environments-list">
          <div className="list-header">
            <h2>Your Environments ({environments.length})</h2>
            <div className="search-environments">
              <input
                type="text"
                placeholder="Search environments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="clear-search" 
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>
          </div>
          
          {filteredEnvironments.length === 0 ? (
            searchQuery ? (
              <p className="no-results">No environments found matching "{searchQuery}"</p>
            ) : (
              <p className="no-environments">No environments created yet.</p>
            )
          ) : (
            <ul className="environment-cards">
              {filteredEnvironments.map(env => (
                <li key={env.id} className="environment-card">
                  <div className="card-header">
                    {env.imageUrl ? (
                      <div className="environment-image">
                        <img src={env.imageUrl} alt={env.name} />
                      </div>
                    ) : (
                      <div className="environment-icon">
                        <span className="icon-text">{env.name ? env.name[0].toUpperCase() : 'E'}</span>
                      </div>
                    )}
                    <h3>{env.name}</h3>
                  </div>
                  
                  <div className="card-content">
                    {env.climate && <p className="climate"><strong>Climate:</strong> {env.climate}</p>}
                    {env.description && (
                      <p className="description">
                        {env.description.length > 100 
                          ? `${env.description.substring(0, 100)}...` 
                          : env.description
                        }
                      </p>
                    )}
                  </div>
                  
                  <div className="card-actions">
                    <button 
                      onClick={() => startEditing(env)}
                      className="edit-button"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteEnvironment(env.id)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnvironmentsPage;