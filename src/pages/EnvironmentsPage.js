import React, { useState, useEffect } from 'react';
import EnvironmentForm from '../components/environments/EnvironmentForm';
import { saveEnvironments, deleteEnvironment } from '../utils/storageExports'; // Remove loadEnvironments, loadWorlds
import { useStorage } from '../contexts/StorageContext';

function EnvironmentsPage() {
  const { currentUser, getAllEnvironments, getWorlds } = useStorage(); // Update to use context methods
  const [environments, setEnvironments] = useState([]);
  const [worlds, setWorlds] = useState([]);
  const [editingEnvironment, setEditingEnvironment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEnvironments, setFilteredEnvironments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load environments and worlds using context
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const savedEnvironments = await getAllEnvironments(); // Use context method
        setEnvironments(savedEnvironments || []);
        setFilteredEnvironments(savedEnvironments || []);

        const savedWorlds = await getWorlds();
        setWorlds(savedWorlds || []);
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Failed to load environments or worlds.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, getAllEnvironments, getWorlds]); // Update dependencies

  // Save environments whenever the array changes
  useEffect(() => {
    const saveData = async () => {
      if (environments.length > 0 && currentUser) {
        try {
          await saveEnvironments(environments);
        } catch (error) {
          console.error("Error saving environments:", error);
          setError("Failed to save changes.");
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
    const imageUrl = newEnvironment.imageUrl || '';
    try {
      if (editingEnvironment) {
        const updatedEnvironments = environments.map(env => 
          env.id === editingEnvironment.id 
            ? { 
                ...newEnvironment, 
                id: env.id, 
                imageUrl, 
                created: env.created, 
                updated: new Date().toISOString(),
                userId: currentUser?.uid,
                projectId: newEnvironment.projectId || env.projectId
              }
            : env
        );
        setEnvironments(updatedEnvironments);
        setEditingEnvironment(null);
      } else {
        const newEnvironmentWithId = { 
          ...newEnvironment, 
          imageUrl,
          id: Date.now(),
          created: new Date().toISOString(),
          userId: currentUser?.uid,
          projectId: newEnvironment.projectId || ''
        };
        setEnvironments(prev => [...prev, newEnvironmentWithId]);
      }
    } catch (error) {
      console.error("Error saving environment:", error);
      setError("Failed to save environment.");
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
            worlds={worlds}
          />
        </div>
        <div className="environments-list">
          <div className="list-header">
            <h2>Your Environments ({environments.length})</h2>
            {/* ... search bar ... */}
          </div>
          {filteredEnvironments.length === 0 ? (
            searchQuery ? (
              <p className="no-results">No environments found matching "{searchQuery}"</p>
            ) : (
              <p className="no-environments">No environments created yet.</p>
            )
          ) : (
            <ul className="environment-cards">
              {filteredEnvironments.map(env => {
                const world = worlds.find(w => w.id === env.projectId);
                return (
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
                      <p className="world"><strong>World:</strong> {world ? world.name : 'No World'}</p>
                    </div>
                    {/* ... card-actions ... */}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnvironmentsPage;