import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { saveEnvironments, deleteEnvironment } from '../utils/storageExports';
import { useStorage } from '../contexts/StorageContext';
import debounce from 'lodash/debounce';
import { storage, ref, uploadBytes, getDownloadURL } from '../utils/firebase';
import { useNavigate } from 'react-router-dom';

const EnvironmentForm = lazy(() => import('../components/environments/EnvironmentForm'));

// Debounced save for auto-saving only
const debouncedSaveEnvironment = debounce(async (environmentData, userId) => {
  try {
    await saveEnvironments([environmentData], userId);
    return true;
  } catch (error) {
    console.error("Error in debounced save:", error);
    return false;
  }
}, 300);

function EnvironmentsPage() {
  const navigate = useNavigate();
  const { currentUser, getAllEnvironments, getWorlds } = useStorage();
  const [environments, setEnvironments] = useState([]);
  const [editingEnvironment, setEditingEnvironment] = useState(null);
  const [worlds, setWorlds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [draftEnvironment, setDraftEnvironment] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
    imageUrl: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!currentUser) {
          setError('User not authenticated. Please log in.');
          setIsLoading(false);
          return;
        }

        const [fetchedEnvironments, fetchedWorlds] = await Promise.all([
          getAllEnvironments(),
          getWorlds()
        ]);

        setEnvironments(fetchedEnvironments || []);
        setWorlds(fetchedWorlds || []);
      } catch (err) {
        console.error("Error loading data:", err);
        if (err.message.includes('not authenticated') || err.message.includes('Missing or insufficient permissions')) {
          setError('Authentication error. Please log in again.');
          navigate('/login');
        } else if (err.code === 'unavailable') {
          setError('Network error. Please check your internet connection and try again.');
        } else {
          setError('Failed to load environments and worlds. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, getAllEnvironments, getWorlds, navigate]);

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
        environmentToSave.id = `env_${Date.now()}`;
        await debouncedSaveEnvironment(environmentToSave, currentUser.uid);
        setDraftEnvironment(environmentToSave);
      } else {
        environmentToSave.id = draftEnvironment.id;
        const updatedEnvironment = { ...draftEnvironment, ...environmentToSave };
        await debouncedSaveEnvironment(updatedEnvironment, currentUser.uid);
        setDraftEnvironment(updatedEnvironment);
      }
    } catch (error) {
      console.error('Error auto-saving environment:', error);
      if (error.message.includes('User not authenticated')) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError('Failed to auto-save environment.');
      }
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

  const saveEnvironment = async (newEnvironment) => {
    try {
      setIsLoading(true);
      setSaveError(null);

      // Check for duplicates (excluding drafts)
      if (!editingEnvironment && environments.some(env => env.name === newEnvironment.name && !env.isDraft)) {
        setSaveError(`An environment named "${newEnvironment.name}" already exists. Please use a different name.`);
        setIsLoading(false);
        return;
      }

      // Process image if present
      let imageUrl = newEnvironment.imageUrl || '';
      if (newEnvironment.imageFile) {
        try {
          const userId = currentUser.uid;
          const imageId = Date.now().toString();
          const storageRef = ref(storage, `users/${userId}/environments/${imageId}`);
          await uploadBytes(storageRef, newEnvironment.imageFile);
          imageUrl = await getDownloadURL(storageRef);
        } catch (imageError) {
          console.error("Error uploading image:", imageError);
          setSaveError("Image upload failed, but environment will be saved without image");
        }
      }

      let updatedEnvironment;
      const environmentId = editingEnvironment ?
        editingEnvironment.id.toString() :
        (draftEnvironment ? draftEnvironment.id : `env_${Date.now()}`);

      updatedEnvironment = {
        ...newEnvironment,
        id: environmentId,
        imageUrl,
        imageFile: null,
        created: editingEnvironment ? editingEnvironment.created : (draftEnvironment ? draftEnvironment.created : new Date().toISOString()),
        updated: new Date().toISOString(),
        userId: currentUser.uid,
        isDraft: false,
      };

      // Save environment (without debounce for manual save)
      await saveEnvironments([updatedEnvironment], currentUser.uid);

      // Optimistic update: Add the new environment to the list immediately
      if (editingEnvironment) {
        setEnvironments(prev => prev.map(env => env.id === updatedEnvironment.id ? updatedEnvironment : env));
      } else {
        setEnvironments(prev => {
          if (prev.some(env => env.id === updatedEnvironment.id)) {
            return prev;
          }
          return [...prev, updatedEnvironment];
        });
      }

      // Wait briefly to allow Firestore to reflect the write, then fetch the latest data
      await new Promise(resolve => setTimeout(resolve, 500));
      const fetchedEnvironments = await getAllEnvironments(true);
      console.log('Fetched environments after save:', fetchedEnvironments);
      setEnvironments(fetchedEnvironments || []);

      // Reset form state
      setEditingEnvironment(null);
      setDraftEnvironment(null);
      setHasUnsavedChanges(false);
      setFormData({
        name: '',
        description: '',
        projectId: '',
        imageUrl: ''
      });
    } catch (error) {
      console.error("Error saving environment:", error);
      setSaveError(`Failed to save environment: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (environment) => {
    setEditingEnvironment(environment);
    setFormData({
      name: environment.name || '',
      description: environment.description || '',
      projectId: environment.projectId || '',
      imageUrl: environment.imageUrl || ''
    });
    setDraftEnvironment(null);
    setHasUnsavedChanges(false);
  };

  const cancelEditing = () => {
    setEditingEnvironment(null);
    setDraftEnvironment(null);
    setHasUnsavedChanges(false);
    setFormData({
      name: '',
      description: '',
      projectId: '',
      imageUrl: ''
    });
  };

  const handleDeleteEnvironment = async (environmentId) => {
    if (window.confirm('Are you sure you want to delete this environment?')) {
      try {
        setIsLoading(true);
        setError(null);
        await deleteEnvironment(environmentId, currentUser.uid);
        setEnvironments(prevEnvs => prevEnvs.filter(env => env.id !== environmentId));
        // Force refresh after deletion
        const fetchedEnvironments = await getAllEnvironments(true);
        setEnvironments(fetchedEnvironments || []);
      } catch (error) {
        console.error("Error deleting environment:", error);
        setError(`Failed to delete environment: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
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

  return (
    <div className="environments-page">
      <h1>Environments</h1>
      {error && <div className="error-message">{error}</div>}
      {saveError && (
        <div className="save-error-message" style={{ backgroundColor: 'orange', color: 'white', padding: '10px' }}>
          {saveError}
        </div>
      )}
      <div className="page-content">
        <div className="form-section">
          <h2>{editingEnvironment ? 'Edit Environment' : 'Create New Environment'}</h2>
          <Suspense fallback={<div>Loading form...</div>}>
            <EnvironmentForm
              onSave={saveEnvironment}
              initialEnvironment={editingEnvironment || formData}
              onCancel={cancelEditing}
              isEditing={!!editingEnvironment}
              worlds={worlds}
              onChange={handleFormChange}
            />
          </Suspense>
        </div>
        <div className="environments-list">
          <h2>Your Environments ({environments.length})</h2>
          {isLoading ? (
            <div>Loading environments...</div>
          ) : environments.length === 0 ? (
            <p>No environments created yet.</p>
          ) : (
            <ul className="environment-cards">
              {environments.map(env => (
                <li key={env.id} className="environment-card">
                  <h3>{env.name || 'Unnamed Environment'}</h3>
                  {env.description && <p>{env.description}</p>}
                  {env.projectId && worlds.length > 0 && (
                    <p>World: {worlds.find(w => w.id === env.projectId)?.name || 'Unknown World'}</p>
                  )}
                  {env.imageUrl && <img src={env.imageUrl} alt={env.name} style={{ maxWidth: '100px' }} />}
                  <button onClick={() => startEditing(env)}>Edit</button>
                  <button onClick={() => handleDeleteEnvironment(env.id)}>Delete</button>
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