// src/pages/CampaignsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadWorlds, saveWorlds, loadWorldCampaigns, saveCampaign } from '../utils/storage';
import { createCampaignModel, createSceneModel } from '../models/CampaignModel';
import { loadCharacters } from '../utils/storage';

function CampaignsPage() {
  const { worldId } = useParams();
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

  
  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load world
        const worlds = await loadWorlds(); // Use await here
        const parsedWorldId = parseInt(worldId);
        const foundWorld = worlds.find(w => w.id === parsedWorldId);
        setWorld(foundWorld);
        
        // Load campaigns
        if (foundWorld) {
          const worldCampaigns = await loadWorldCampaigns(foundWorld.id); // Use await and use the loaded function
          setCampaigns(worldCampaigns || []);
        }
        
        // Load characters
        const loadedCharacters = await loadCharacters(); // Use await and add error checking
        setCharacters(loadedCharacters || []);
        
        console.log("CampaignsPage loaded with worldId:", parsedWorldId, "found world:", foundWorld);
      } catch (error) {
        console.error('Error loading data:', error);
        // Optionally set an error state to show to the user
      }
    };
  
    loadData();
  }, [worldId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCampaign({
      ...newCampaign,
      [name]: value
    });
  };
  
  // Function to open character selection modal
  const openCharacterSelection = (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign) {
      setSelectedCampaignId(campaignId);
      setSelectedCharacters(campaign.participantIds || []);
      setIsSelectingCharacters(true);
    }
  };
  
  // Function to toggle character selection
  const toggleCharacterSelection = (characterId) => {
    setSelectedCharacters(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      } else {
        return [...prev, characterId];
      }
    });
  };
  
  // Function to save character selections
  const saveCharacterSelections = () => {
    if (!selectedCampaignId) return;
    
    // Find and update the campaign
    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (campaign) {
      const updatedCampaign = {
        ...campaign,
        participantIds: selectedCharacters
      };
      
      // Save to storage
      saveCampaign(updatedCampaign);
      
      // Update local state
      setCampaigns(campaigns.map(c => 
        c.id === selectedCampaignId ? updatedCampaign : c
      ));
      
      // Close the selection modal
      setIsSelectingCharacters(false);
      setSelectedCampaignId(null);
    }
  };
  
  const createCampaign = () => {
    const parsedWorldId = parseInt(worldId);
    
    // If in creation mode with form, use that data
    const campaignData = isCreating ? 
      { 
        name: newCampaign.name || `New Campaign in ${world?.name || 'World'}`,
        description: newCampaign.description || ''
      } : 
      {
        name: `New Campaign in ${world?.name || 'World'}`
      };
    
    console.log("Creating campaign for world ID:", parsedWorldId, "with data:", campaignData);
    
    try {
      // Create the new campaign
      const newCampaignObj = createCampaignModel(parsedWorldId, campaignData);
      console.log("Created campaign object:", newCampaignObj);
      
      // Add a default scene
      newCampaignObj.scenes = [
        createSceneModel({
          title: 'Introduction',
          description: 'The beginning of your adventure',
          characterIds: newCampaignObj.participantIds || [] // Use the campaign's participant IDs
        })
      ];
      
      // Save campaign
      const saveResult = saveCampaign(newCampaignObj);
      console.log("Save campaign result:", saveResult);
      
      // Update world's campaign list
      if (world) {
        const updatedWorld = {
          ...world,
          campaignIds: [...(world.campaignIds || []), newCampaignObj.id]
        };
        
        // Save world
        const worlds = loadWorlds();
        const updatedWorlds = worlds.map(w => 
          w.id === updatedWorld.id ? updatedWorld : w
        );
        saveWorlds(updatedWorlds);
        setWorld(updatedWorld);
      }
      
      // Update local campaigns list
      setCampaigns([...campaigns, newCampaignObj]);
      
      // Reset form
      setNewCampaign({
        name: '',
        description: ''
      });
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating campaign:", error);
      // Show an error message to the user
    }
  };
  
  const deleteCampaign = async (campaignId) => {
    try {
      // Remove from Firestore
      await deleteCampaign(campaignId);
  
      // Remove from local state
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
  
      // Remove from world
      if (world) {
        const updatedWorld = {
          ...world,
          campaignIds: (world.campaignIds || []).filter(id => id !== campaignId)
        };
  
        // Update in Firestore
        const worlds = await loadWorlds();
        const updatedWorlds = worlds.map(w => 
          w.id === updatedWorld.id ? updatedWorld : w
        );
        await saveWorlds(updatedWorlds);
        setWorld(updatedWorld);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };
  
  return (
    <div className="campaigns-page">
      <h1>Campaigns in {world?.name || 'World'}</h1>
      
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
                <button className="cancel-button" onClick={() => setIsCreating(false)}>
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
      
      {/* Character Selection Modal */}
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