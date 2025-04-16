import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadWorlds, saveWorlds, loadWorldCampaigns, saveCampaign, deleteCampaign } from '../utils/storageExports';
import { createCampaignModel, createSceneModel } from '../models/CampaignModel';
import { loadCharacters } from '../utils/storageExports';
import { useStorage } from '../contexts/StorageContext';
import debounce from 'lodash/debounce';

function CampaignsPage() {
  const [worlds, setWorlds] = useState([]);
  const { worldId } = useParams();
  const { currentUser } = useStorage();
  const [world, setWorld] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: ''
  });
  const [isSelectingCharacters, setIsSelectingCharacters] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  const [error, setError] = useState(null);
  const [draftCampaign, setDraftCampaign] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
  
        // Load worlds
        const loadedWorlds = await loadWorlds(currentUser?.uid);
        setWorlds(loadedWorlds || []); // Store the full worlds array
        const parsedWorldId = parseInt(worldId);
        const foundWorld = loadedWorlds.find(w => w.id === parsedWorldId);
        setWorld(foundWorld);
  
        // Load campaigns
        if (foundWorld) {
          const worldCampaigns = await loadWorldCampaigns(foundWorld.id, currentUser?.uid);
          setCampaigns(worldCampaigns || []);
        }
  
        // Load characters
        const loadedCharacters = await loadCharacters(currentUser?.uid);
        setCharacters(loadedCharacters || []);
  
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data. Please try again.');
        setIsLoading(false);
      }
    };
  
    if (currentUser) {
      loadData();
    }
  }, [worldId, currentUser]);

  // Auto-save logic
  const autoSave = debounce(async (campaignData) => {
    if (!currentUser || !campaignData.name) return;

    try {
      const campaignDataWithWorldId = {
        ...campaignData,
        worldId: parseInt(worldId),
        userId: currentUser.uid,
        isDraft: true,
        created: draftCampaign ? draftCampaign.created : new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      if (!draftCampaign) {
        const newCampaignObj = createCampaignModel(parseInt(worldId), campaignDataWithWorldId);
        await saveCampaign(newCampaignObj, currentUser);
        setDraftCampaign(newCampaignObj);
      } else {
        const updatedCampaign = { ...draftCampaign, ...campaignDataWithWorldId };
        await saveCampaign(updatedCampaign, currentUser);
        setDraftCampaign(updatedCampaign);
      }
    } catch (error) {
      console.error('Error auto-saving campaign:', error);
      setError('Failed to auto-save campaign.');
    }
  }, 1000);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCampaign(prev => {
      const updated = { ...prev, [name]: value };
      setHasUnsavedChanges(true);
      autoSave(updated);
      return updated;
    });
  };

  // Prompt user before navigating away
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

  const openCharacterSelection = (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign) {
      setSelectedCampaignId(campaignId);
      setSelectedCharacters(campaign.participantIds || []);
      setIsSelectingCharacters(true);
    }
  };

  const toggleCharacterSelection = (characterId) => {
    setSelectedCharacters(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      } else {
        return [...prev, characterId];
      }
    });
  };

  const saveCharacterSelections = async () => {
    if (!selectedCampaignId) return;

    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (campaign) {
      const updatedCampaign = {
        ...campaign,
        participantIds: selectedCharacters
      };

      try {
        await saveCampaign(updatedCampaign, currentUser);
        setCampaigns(campaigns.map(c =>
          c.id === selectedCampaignId ? updatedCampaign : c
        ));
        setIsSelectingCharacters(false);
        setSelectedCampaignId(null);
      } catch (error) {
        console.error('Error saving character selections:', error);
        setError('Failed to save character selections.');
      }
    }
  };

  const deleteCampaign = async (campaignId) => {
    try {
      await deleteCampaign(campaignId);
      setCampaigns(campaigns.filter(c => c.id !== campaignId));

      if (world) {
        const updatedWorld = {
          ...world,
          campaignIds: (world.campaignIds || []).filter(id => id !== campaignId)
        };

        const worlds = await loadWorlds(currentUser);
        const updatedWorlds = worlds.map(w =>
          w.id === updatedWorld.id ? updatedWorld : w
        );
        await saveWorlds(updatedWorlds, currentUser);
        setWorld(updatedWorld);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      setError('Failed to delete campaign. Please try again.');
    }
  };

  const createCampaign = async () => {
    const parsedWorldId = parseInt(worldId);

    const campaignData = isCreating ?
      {
        name: newCampaign.name || `New Campaign in ${world?.name || 'World'}`,
        description: newCampaign.description || ''
      } :
      {
        name: `New Campaign in ${world?.name || 'World'}`
      };

    try {
      let campaignToSave;
      if (draftCampaign) {
        campaignToSave = {
          ...draftCampaign,
          name: campaignData.name,
          description: campaignData.description,
          isDraft: false,
          updated: new Date().toISOString(),
        };
      } else {
        campaignToSave = createCampaignModel(parsedWorldId, {
          ...campaignData,
          worldId: parsedWorldId,
          userId: currentUser.uid,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        });
      }

      campaignToSave.scenes = [
        createSceneModel({
          title: 'Introduction',
          description: 'The beginning of your adventure',
          characterIds: campaignToSave.participantIds || []
        })
      ];

      await saveCampaign(campaignToSave, currentUser);

      if (world) {
        const updatedWorld = {
          ...world,
          campaignIds: [...(world.campaignIds || []), campaignToSave.id]
        };

        const worlds = await loadWorlds(currentUser);
        const updatedWorlds = worlds.map(w =>
          w.id === updatedWorld.id ? updatedWorld : w
        );
        await saveWorlds(updatedWorlds, currentUser);
        setWorld(updatedWorld);
      }

      setCampaigns([...campaigns, campaignToSave]);
      setNewCampaign({ name: '', description: '' });
      setDraftCampaign(null);
      setIsCreating(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
      setError('Failed to create campaign.');
    }
  };

  return (
    <div className="campaigns-page">
      <h1>Campaigns in {world?.name || 'World'}</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="page-content">
        <div className="campaign-controls">
          {isCreating ? (
            <div className="campaign-form">
              <h2>Create New Campaign</h2>
              <div className="form-group">
                <label>Campaign Name:</label>
                <input
                  type="text"
                  name="name"
                  value={newCampaign.name}
                  onChange={handleInputChange}
                  placeholder={`New Campaign in ${world?.name || 'World'}`}
                />
              </div>
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  name="description"
                  value={newCampaign.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Describe your campaign..."
                />
              </div>
              <div className="form-buttons">
                <button className="submit-button" onClick={createCampaign}>
                  Create Campaign
                </button>
                <button className="cancel-button" onClick={() => {
                  setIsCreating(false);
                  setNewCampaign({ name: '', description: '' });
                  setDraftCampaign(null);
                  setHasUnsavedChanges(false);
                }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="create-campaign-button"
              onClick={() => setIsCreating(true)}
            >
              Create New Campaign
            </button>
          )}
        </div>
        <div className="campaigns-list">
          <h2>Available Campaigns</h2>
          {!world ? (
            <div className="loading-world">
              <p>Loading world data...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="empty-campaigns">
              <p>No campaigns yet in this world. Create your first campaign to get started!</p>
              <div className="campaign-tips">
                <h3>Getting Started</h3>
                <ol>
                  <li>Click the "Create New Campaign" button above</li>
                  <li>Give your campaign a name and description</li>
                  <li>After creation, you can add characters and create scenes</li>
                  <li>Start the campaign session to begin roleplaying</li>
                </ol>
              </div>
            </div>
          ) : (
            <ul className="campaign-cards">
              {campaigns.map(campaign => (
                <li key={campaign.id} className="campaign-card">
                  <div className="card-content">
                    <h3>{campaign.name}</h3>
                    {campaign.description && <p className="description">{campaign.description}</p>}
                    <div className="campaign-stats">
                      <span>{campaign.scenes?.length || 0} Scene{(campaign.scenes?.length || 0) !== 1 ? 's' : ''}</span>
                      <span>{campaign.participantIds?.length || 0} Character{(campaign.participantIds?.length || 0) !== 1 ? 's' : ''}</span>
                      <span>Created: {new Date(campaign.created).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => openCharacterSelection(campaign.id)}
                      className="characters-button"
                    >
                      Manage Characters
                    </button>
                    <Link
                      to={`/campaigns/${campaign.id}/session`}
                      className="session-button"
                    >
                      Open Campaign
                    </Link>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
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
      <div className="back-link">
        <Link to="/worlds">← Back to Worlds</Link>
      </div>
      {isSelectingCharacters && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Select Characters for Campaign</h2>
            <div className="character-selection-list">
              {characters.length === 0 ? (
                <p>No characters available. Go create some characters first!</p>
              ) : (
                <ul>
                 {characters.map(character => (
  <li key={character.id} className="character-selection-item">
    <label className="character-checkbox">
      <input
        type="checkbox"
        checked={selectedCharacters.includes(character.id)}
        onChange={() => toggleCharacterSelection(character.id)}
      />
      <div className="character-chat-header">
        <h2>{character.name}</h2>
        {character.worldId && (
          <div className="world-badge">
            From {worlds.find(w => w.id === character.worldId)?.name || 'Unknown World'}
          </div>
        )}
      </div>
      <div className="character-info">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className="character-thumbnail"
          />
        ) : (
          <div className="character-initial">
            {character.name ? character.name[0].toUpperCase() : '?'}
          </div>
        )}
        <span>{character.name}</span>
      </div>
    </label>
  </li>
))}
                </ul>
              )}
            </div>
            <div className="modal-buttons">
              <button
                className="save-button"
                onClick={saveCharacterSelections}
              >
                Save Characters
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  setIsSelectingCharacters(false);
                  setSelectedCampaignId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignsPage;