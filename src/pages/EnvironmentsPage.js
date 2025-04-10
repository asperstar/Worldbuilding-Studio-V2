import React, { useState, useEffect } from 'react';
import EnvironmentForm from '../components/environments/EnvironmentForm';
import { saveEnvironments, deleteEnvironment } from '../utils/storageExports';
import { useStorage } from '../contexts/StorageContext';
import debounce from 'lodash/debounce';

function EnvironmentsPage() {
  const { currentUser, getAllEnvironments, getWorlds } = useStorage();
  const [environments, setEnvironments] = useState([]);
  const [worlds, setWorlds] = useState([]);
  const [editingEnvironment, setEditingEnvironment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEnvironments, setFilteredEnvironments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draftEnvironment, setDraftEnvironment] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    climate: '',
    description: '',
    imageUrl: '',
    projectId: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const savedEnvironments = await getAllEnvironments();
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
  }, [currentUser, getAllEnvironments, getWorlds]);

  const autoSave = debounce(async (environmentData) => {
    if (!currentUser || !environmentData.name) return;

    try {
      const environmentToSave = {
        ...environmentData,
        userId: currentUser.uid,
        isDraft: true,
        created: draftEnvironment ? draftEnvironment.created : new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      if (!draftEnvironment) {
        environmentToSave.id = Date.now().toString();
        await saveEnvironments([environmentToSave], currentUser);
        setDraftEnvironment(environmentToSave);
      } else {
        const updatedEnvironment = { ...draftEnvironment, ...environmentToSave };
        await saveEnvironments([updatedEnvironment], currentUser);
        setDraftEnvironment(updatedEnvironment);
      }
    } catch (error) {
      console.error('Error auto-saving environment:', error);
      setError('Failed to auto-save environment.');
    }
  }, 1000);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      setHasUnsavedChanges(true);
      autoSave(updated);
      return updated;
    });
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const saveEnvironment = async (newEnvironment) => {
    const imageUrl = newEnvironment.imageUrl || '';
    try {
      if (editingEnvironment) {
        const updatedEnvironment = {
          ...newEnvironment,
          id: editingEnvironment.id,
          imageUrl,
          created: editingEnvironment.created,
          updated: new Date().toISOString(),
          userId: currentUser?.uid,
          projectId: newEnvironment.projectId || editingEnvironment.projectId,
          isDraft: false,
        };
        const updatedEnvironments = environments.map(env =>
          env.id === editingEnvironment.id ? updatedEnvironment : env
        );
        await saveEnvironments(updatedEnvironments, currentUser);
        setEnvironments(updatedEnvironments);
        setEditingEnvironment(null);
      } else if (draftEnvironment) {
        const updatedEnvironment = {
          ...draftEnvironment,
          ...newEnvironment,
          imageUrl,
          updated: new Date().toISOString(),
          userId: currentUser?.uid,
          isDraft: false,
        };
        const updatedEnvironments = [...environments, updatedEnvironment];
        await saveEnvironments(updatedEnvironments, currentUser);
        setEnvironments(updatedEnvironments);
      } else {
        const newEnvironmentWithId = {
          ...newEnvironment,
          imageUrl,
          id: Date.now().toString(),
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          userId: currentUser?.uid,
          projectId: newEnvironment.projectId || '',
          isDraft: false,
        };
        const updatedEnvironments = [...environments, newEnvironmentWithId];
        await saveEnvironments(updatedEnvironments, currentUser);
        setEnvironments(updatedEnvironments);
      }
      setDraftEnvironment(null);
      setHasUnsavedChanges(false);
      setFormData({
        name: '',
        climate: '',
        description: '',
        imageUrl: '',
        projectId: ''
      });
    } catch (error) {
      console.error("Error saving environment:", error);
      setError("Failed to save environment.");
    }
  };

  const startEditing = (environment) => {
    setEditingEnvironment(environment);
    setFormData({
      name: environment.name || '',
      climate: environment.climate || '',
      description: environment.description || '',
      imageUrl: environment.imageUrl || '',
      projectId: environment.projectId || ''
    });
    setDraftEnvironment(null);
    setHasUnsavedChanges(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingEnvironment(null);
    setDraftEnvironment(null);
    setHasUnsavedChanges(false);
    setFormData({
      name: '',
      climate: '',
      description: '',
      imageUrl: '',
      projectId: ''
    });
  };

  const handleDeleteEnvironment = async (id) => {
    if (editingEnvironment && editingEnvironment.id === id) {
      setEditingEnvironment(null);
    }

    try {
      await deleteEnvironment(id);
      setEnvironments(prevEnvironments => prevEnvironments.filter(env => env.id !== id));
    } catch (error) {
      console.error("Error deleting environment:", error);
      setError("Failed to delete environment. Please try again.");
    }
  };

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

  if (isLoading) {
    return <div className="loading">Loading environments...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="environments-page">
      <h1>Environments</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="page-content">
        <div className="form-section">
          <h2>{editingEnvironment ? 'Edit Environment' : 'Create New Environment'}</h2>
          <EnvironmentForm
            onSave={saveEnvironment}
            initialEnvironment={editingEnvironment || formData}
            onCancel={cancelEditing}
            isEditing={!!editingEnvironment}
            worlds={worlds}
            onChange={handleFormChange}
          />
        </div>
        <div className="environments-list">
          <div className="list-header">
            <h2>Your Environments ({environments.length})</h2>
            <input
              type="text"
              placeholder="Search environments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
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
                    <div className="card-actions">
                      <button onClick={() => startEditing(env)} className="edit-button">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteEnvironment(env.id)} className="delete-button">
                        Delete
                      </button>
                    </div>
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