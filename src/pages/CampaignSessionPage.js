// src/pages/CampaignSessionPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Add this import
import { loadCharacters, loadWorlds, loadCampaign, saveCampaign } from '../utils/storage';
import { getCampaignMemories, addCampaignMemory } from '../utils/memory/campaignMemoryManager';
import { addMemory } from '../utils/memory/memoryManager';
import { orchestrateCharacterInteraction } from '../utils/campaignManager';
import { getCachedEnvironment } from '../utils/environment-selector';

// Define API_URL using the environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

function CampaignSessionPage() {
  const { campaignId } = useParams();
  const { currentUser } = useAuth(); // Add this to get the current user
  const navigate = useNavigate(); // Add this for redirecting
  const [campaign, setCampaign] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [currentScene, setCurrentScene] = useState(null);
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interactionPrompt, setInteractionPrompt] = useState('');
  const [sceneCharacters, setSceneCharacters] = useState([]);
  const [activeSpeakingCharacter, setActiveSpeakingCharacter] = useState(null);
  const [gmMode, setGmMode] = useState('user'); // 'user' or 'ai'
  const [selectedGmCharacter, setSelectedGmCharacter] = useState(null);
  const [isWaitingForGmPrompt, setIsWaitingForGmPrompt] = useState(false);
  const [sceneSuggestions, setSceneSuggestions] = useState([]);
  const [selectedSceneSuggestion, setSelectedSceneSuggestion] = useState(null);
  const [worldDetails, setWorldDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

 // Inside CampaignSessionPage.js
// Load campaign data on mount
useEffect(() => {
  const fetchData = async () => {
    if (!currentUser) return; // Skip if not authenticated

    setLoading(true);
    setError(null);

    try {
      // Load campaign
      const loadedCampaign = await loadCampaign(parseInt(campaignId), currentUser.uid);
      if (!loadedCampaign) {
        throw new Error(`Campaign with ID ${campaignId} not found`);
      }

      setCampaign(loadedCampaign);

      // Load world details
      if (loadedCampaign && loadedCampaign.worldId) {
        const worlds = await loadWorlds(currentUser.uid);
        const campaignWorld = worlds.find(world => world.id === loadedCampaign.worldId);
        setWorldDetails(campaignWorld);
      }

      // Set current scene
      if (loadedCampaign && loadedCampaign.scenes && loadedCampaign.scenes.length > 0) {
        const sceneIndex = loadedCampaign.currentSceneIndex || 0;
        setCurrentScene(loadedCampaign.scenes[sceneIndex]);
      }

      // Load characters
      const allCharacters = await loadCharacters(currentUser.uid);
      const campaignCharacters = allCharacters.filter(
        char => loadedCampaign?.participantIds?.includes(char.id)
      );
      setCharacters(campaignCharacters);

      // Initialize messages
      if (loadedCampaign?.sessions?.length > 0) {
        const lastSession = loadedCampaign.sessions[loadedCampaign.sessions.length - 1];
        setMessages(lastSession.messages || []);
      }
    } catch (error) {
      console.error("Error loading campaign data:", error);
      setError(`Failed to load campaign: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [campaignId, currentUser, navigate]);

  // Update scene characters when current scene changes
  useEffect(() => {
    if (currentScene) {
      setSceneCharacters(currentScene.characterIds || []);

      // If we're in AI GM mode and there's no scene description, prompt for one
      if (gmMode === 'ai' && selectedGmCharacter && 
          (!currentScene.description || currentScene.description.trim() === '')) {
        generateGmSceneDescription();
      }
    }
  }, [currentScene, gmMode, selectedGmCharacter]);

  // Function to generate GM scene descriptions
  const generateGmSceneDescription = useCallback(async () => {
    if (!selectedGmCharacter || gmMode !== 'ai' || !campaign) return;

    setIsWaitingForGmPrompt(true);

    try {
      const gmCharacter = characters.find(c => c.id === selectedGmCharacter);
      if (!gmCharacter) throw new Error('GM character not found');

      const campaignSummary = campaign.description || '';
      const previousScenes = campaign.scenes
        .slice(0, campaign.currentSceneIndex)
        .map(s => s.title + ': ' + s.description)
        .join('\n');

      const recentMessages = messages.slice(-5).map(msg => {
        const speaker = msg.sender === 'user' ? 'Player' : 
                       characters.find(c => c.id === msg.sender)?.name || 'Unknown';
        return `${speaker}: ${msg.content}`;
      }).join('\n');

      const gmMemories = await getCampaignMemories(
        gmCharacter.id,
        campaignId,
        "scene narrative storytelling plot"
      );

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: `You are ${gmCharacter.name}, acting as the Game Master in a roleplaying game. Create 3 brief scene descriptions (2-3 sentences each) for where the story could go next, capturing the setting, mood, and potential conflict or development.`,
          userMessage: `Campaign: ${campaign.name}\nSummary: ${campaignSummary}\nPrevious Scenes: ${previousScenes}\nRecent Conversation: ${recentMessages}\nCharacters Present: ${characters
            .filter(c => currentScene?.characterIds?.includes(c.id))
            .map(c => c.name)
            .join(', ')}\nCurrent Scene: ${currentScene?.title || "New Scene"} - ${currentScene?.description || ''}\nWorld: ${worldDetails?.name || ''} - ${worldDetails?.description || ''}\nRelevant Memories: ${gmMemories.join(', ')}`
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const suggestions = data.response
        .split(/\n{2,}/)
        .filter(s => s.trim().length > 0)
        .slice(0, 3);

      setSceneSuggestions(suggestions);
    } catch (error) {
      console.error('Error generating GM scene description:', error);
      setMessages(prev => [...prev, {
        sender: 'system',
        content: `Error generating scene description: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsWaitingForGmPrompt(false);
    }
  }, [selectedGmCharacter, gmMode, campaign, characters, campaignId, messages, currentScene, worldDetails]);

  // Function to generate GM narrative prompts
  const generateGmNarrativePrompt = async () => {
    if (!selectedGmCharacter || gmMode !== 'ai' || !campaign) return;
  
    setIsProcessing(true);
  
    try {
      const gmCharacter = characters.find(c => c.id === selectedGmCharacter);
      if (!gmCharacter) throw new Error('GM character not found');
  
      const gmMemories = await getCampaignMemories(
        gmCharacter.id,
        campaignId,
        "narrative story progression"
      );
  
      const recentMessages = messages.slice(-10).map(msg => {
        const speaker = msg.sender === 'user' ? 'Player' : 
                       characters.find(c => c.id === msg.sender)?.name || 'Unknown';
        return `${speaker}: ${msg.content}`;
      }).join('\n');
  
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: `You are ${gmCharacter.name}, acting as the Game Master/Narrator in a roleplaying game. Speak in a neutral narrator voice to create a narrative prompt that moves the story forward. Describe what happens next in the scene, introduce a complication, or prompt the player characters to take action.`,
          userMessage: `Campaign: ${campaign.name}\nCurrent Scene: ${currentScene?.title || "Current Scene"} - ${currentScene?.description || ""}\nRecent Conversation: ${recentMessages}\nRelevant Memories: ${gmMemories.join(', ')}`
        }),
      });
  
      if (!response.ok) throw new Error(`API error: ${response.status}`);
  
      const data = await response.json();
  
      const gmMessage = {
        sender: selectedGmCharacter,
        content: data.response,
        timestamp: new Date().toISOString(),
        isNarrativePrompt: true
      };
  
      const updatedMessages = [...messages, gmMessage];
      setMessages(updatedMessages);
  
      // Store a memory for the GM character
      await addMemory(
        gmCharacter.id,
        `Narrated: "${data.response}" in campaign ${campaignId} during scene "${currentScene?.title || ''}"`,
        'EVENT',
        7
      );
  
      await updateCampaignSession(updatedMessages);
    } catch (error) {
      console.error('Error generating GM narrative prompt:', error);
      setMessages(prev => [...prev, {
        sender: 'system',
        content: `Error generating GM narrative: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to process a character's AI response
  const processCharacterResponse = async (character, messageHistory) => {
    try {
      let memoryData = [];
      try {
        const memories = await getCampaignMemories(character.id, campaignId, userMessage);
        memoryData = Array.isArray(memories) ? memories : [];
        if (!Array.isArray(memories)) {
          console.warn(`Memories for character ${character.id} is not an array:`, memories);
        }
      } catch (memError) {
        console.warn(`Could not retrieve memories for character ${character.name}:`, memError);
      }
  
      const lastMessage = messageHistory[messageHistory.length - 1];
      const lastSenderName = lastMessage.sender === 'user' 
        ? 'Game Master' 
        : characters.find(c => c.id === lastMessage.sender)?.name || 'Unknown';
  
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: `You are ${character.name}, a character in a roleplaying game. Respond to the last message in the conversation.`,
          userMessage: `Last message from ${lastSenderName}: "${lastMessage.content}"\nRecent Memories: ${memoryData.join(', ')}\nScene: ${currentScene?.title || ''} - ${currentScene?.description || ''}\nCampaign: ${campaign?.name || ''} - ${campaign?.description || ''}\nWorld: ${worldDetails?.name || ''} - ${worldDetails?.description || ''}`
        }),
      });
  
      if (!response.ok) throw new Error(`API error: ${response.status}`);
  
      const data = await response.json();
  
      const characterMessage = {
        sender: character.id,
        content: data.response,
        timestamp: new Date().toISOString()
      };
  
      const updatedMessages = [...messageHistory, characterMessage];
      setMessages(updatedMessages);
  
      // Store a single memory for the character's response
      await addMemory(
        character.id,
        `Responded to ${lastSenderName}: "${data.response}" in campaign ${campaignId} during scene "${currentScene?.title || ''}"`,
        'ACTION',
        6
      );
  
      await updateCampaignSession(updatedMessages);
    } catch (error) {
      console.error(`Error processing response for ${character.name}:`, error);
      setMessages(prev => [...prev, {
        sender: 'system',
        content: `${character.name} is unable to respond at the moment.`,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  // Function to send a message
  const sendMessage = async () => {
    if (!userMessage.trim()) return;
  
    if (gmMode === 'ai' && !activeSpeakingCharacter) {
      setMessages(prev => [...prev, {
        sender: 'system',
        content: 'You need to select a character to speak as when an AI is the Game Master.',
        timestamp: new Date().toISOString()
      }]);
      return;
    }
  
    const sender = activeSpeakingCharacter ? activeSpeakingCharacter.id : 'user';
    const newMessage = {
      sender: sender,
      content: userMessage,
      timestamp: new Date().toISOString()
    };
  
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setUserMessage('');
  
    if (activeSpeakingCharacter) {
      try {
        await addMemory(
          activeSpeakingCharacter.id,
          `Said: "${userMessage}" in campaign ${campaignId} during scene "${currentScene?.title || ''}"`,
          'ACTION',
          7
        );
      } catch (error) {
        console.error('Error storing character memory:', error);
      }
    }
  
    const respondingCharacters = characters.filter(character => 
      sceneCharacters.includes(character.id) &&
      character.id !== sender &&
      !(gmMode === 'ai' && character.id === selectedGmCharacter)
    );
  
    for (const character of respondingCharacters) {
      await processCharacterResponse(character, updatedMessages);
    }
  };

  // Function to initiate character interaction
  const initiateCharacterInteraction = async (prompt) => {
    setIsProcessing(true);

    try {
      let charactersInScene = [];
      if (currentScene && currentScene.characterIds) {
        charactersInScene = characters.filter(char => 
          currentScene.characterIds.includes(char.id)
        );
      } else {
        charactersInScene = characters;
      }

      if (charactersInScene.length === 0) {
        throw new Error('No characters are present in this scene to interact');
      }

      const result = await orchestrateCharacterInteraction(
        campaign,
        charactersInScene,
        prompt,
        3
      );

      const updatedMessages = [...messages, ...result.conversation];
      setMessages(updatedMessages);

      await updateCampaignSession(updatedMessages);
      setInteractionPrompt('');
    } catch (error) {
      console.error('Error in character interaction:', error);
      setMessages(prev => [...prev, {
        sender: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update campaign session
const updateCampaignSession = async (updatedMessages) => {
  if (!campaign) return;

  try {
    const updatedCampaign = { ...campaign };
    if (!updatedCampaign.sessions) updatedCampaign.sessions = [];

    if (updatedCampaign.sessions.length === 0) {
      updatedCampaign.sessions.push({
        id: Date.now(),
        date: new Date().toISOString(),
        sceneIndex: updatedCampaign.currentSceneIndex,
        messages: updatedMessages
      });
    } else {
      const lastSession = updatedCampaign.sessions[updatedCampaign.sessions.length - 1];
      lastSession.messages = updatedMessages;
    }

    await saveCampaign(updatedCampaign, currentUser.uid);
    setCampaign(updatedCampaign);
  } catch (error) {
    console.error("Error updating campaign session:", error);
  }
};

  // Function to apply a scene suggestion
  const applySceneSuggestion = async (suggestion) => {
    if (!currentScene || !campaign) return;

    try {
      const updatedScenes = campaign.scenes.map((scene, index) => {
        if (index === campaign.currentSceneIndex) {
          return {
            ...scene,
            description: suggestion
          };
        }
        return scene;
      });

      const updatedCampaign = {
        ...campaign,
        scenes: updatedScenes
      };

      await saveCampaign(updatedCampaign);
      setCampaign(updatedCampaign);
      setCurrentScene(updatedScenes[campaign.currentSceneIndex]);

      setSceneSuggestions([]);
      setSelectedSceneSuggestion(null);

      const newMessage = {
        sender: 'system',
        content: `[New scene description from ${characters.find(c => c.id === selectedGmCharacter)?.name || 'GM'}]: ${suggestion}`,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);

      await updateCampaignSession(updatedMessages);
    } catch (error) {
      console.error("Error applying scene suggestion:", error);
    }
  };

  // Function to toggle scene characters
  const toggleSceneCharacter = (characterId) => {
    setSceneCharacters(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      } else {
        return [...prev, characterId];
      }
    });
  };

  // Function to save scene characters
  const saveSceneCharacters = async () => {
    if (!campaign || !currentScene) return;

    try {
      const updatedScenes = campaign.scenes.map(scene => {
        if (scene === currentScene) {
          return {
            ...scene,
            characterIds: sceneCharacters
          };
        }
        return scene;
      });

      const updatedCampaign = {
        ...campaign,
        scenes: updatedScenes
      };

      await saveCampaign(updatedCampaign);
      setCampaign(updatedCampaign);
      setCurrentScene(updatedScenes[campaign.currentSceneIndex]);
    } catch (error) {
      console.error("Error saving scene characters:", error);
    }
  };

  // Function to handle GM mode change
  const handleGmModeChange = (mode) => {
    setGmMode(mode);
    if (mode === 'ai' && !selectedGmCharacter && characters.length > 0) {
      setSelectedGmCharacter(characters[0].id);
    }
  };

  // Function to handle GM character change
  const handleGmCharacterChange = (characterId) => {
    setSelectedGmCharacter(characterId);
  };

  // Character selector component
  const CharacterSelector = () => {
    const availableCharacters = characters.filter(char => 
      !(gmMode === 'ai' && char.id === selectedGmCharacter) &&
      sceneCharacters.includes(char.id)
    );

    return (
      <div className="character-selector">
        <label>Speaking as:</label>
        <select
          value={activeSpeakingCharacter?.id || 'user'}
          onChange={(e) => {
            const selectedId = e.target.value;
            if (selectedId === 'user') {
              setActiveSpeakingCharacter(null);
            } else {
              const character = characters.find(c => c.id.toString() === selectedId);
              setActiveSpeakingCharacter(character);
            }
          }}
        >
          <option value="user">You (Player)</option>
          {availableCharacters.map(character => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="campaign-session">
        <div className="loading-indicator">Loading campaign data...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="campaign-session">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  // Render nothing while redirecting
  if (!currentUser) return null;

  // Main component render
  return (
    <div className="campaign-session">
      <h1>Campaign: {campaign?.name}</h1>

      <div className="scene-info">
        <h2>Scene: {currentScene?.title}</h2>
        <p>{currentScene?.description}</p>
      </div>

      {gmMode === 'ai' && sceneSuggestions.length > 0 && (
        <div className="gm-scene-suggestions">
          <h3>Scene Suggestions from {characters.find(c => c.id === selectedGmCharacter)?.name || 'GM'}</h3>
          <p className="suggestion-instructions">Select one of these scene descriptions to continue:</p>

          <div className="suggestion-options">
            {sceneSuggestions.map((suggestion, index) => (
              <div 
                key={index}
                className={`suggestion-option ${selectedSceneSuggestion === index ? 'selected' : ''}`}
                onClick={() => setSelectedSceneSuggestion(index)}
              >
                <div className="suggestion-number">{index + 1}</div>
                <div className="suggestion-text">{suggestion}</div>
              </div>
            ))}
          </div>

          <div className="suggestion-actions">
            <button 
              onClick={() => selectedSceneSuggestion !== null && applySceneSuggestion(sceneSuggestions[selectedSceneSuggestion])}
              disabled={selectedSceneSuggestion === null}
              className="apply-suggestion-button"
            >
              Apply Selected Description
            </button>
            <button 
              onClick={() => {
                setSceneSuggestions([]);
                setSelectedSceneSuggestion(null);
                generateGmSceneDescription();
              }}
              className="refresh-suggestions-button"
            >
              Request New Suggestions
            </button>
          </div>
        </div>
      )}

      <div className="campaign-chat">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-messages">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              let senderName;
              let messageClass = '';

              if (msg.sender === 'user') {
                senderName = 'You (Player)';
                messageClass = 'user-message';
              } else if (msg.sender === 'system') {
                senderName = 'System';
                messageClass = 'system-message';
              } else {
                const senderCharacter = characters.find(c => c.id === msg.sender);
                if (gmMode === 'ai' && msg.sender === selectedGmCharacter && msg.isNarrativePrompt) {
                  senderName = 'Game Master';
                  messageClass = 'gm-narrative-message';
                } else {
                  senderName = senderCharacter?.name || 'Unknown';
                  messageClass = 'character-message';
                }
              }

              return (
                <div key={index} className={`message ${messageClass}`}>
                  <div className="sender">{senderName}</div>
                  <div className="content">{msg.content}</div>
                  <div className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
              );
            })
          )}
        </div>

        <div className="message-input">
          <CharacterSelector />
          <textarea
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder={activeSpeakingCharacter 
              ? `Type a message as ${activeSpeakingCharacter.name}...` 
              : "Enter your message as the Game Master..."}
          />
          <button onClick={sendMessage} disabled={isProcessing}>Send</button>
        </div>
      </div>

      <div className="gm-controls">
        <h3>Game Master Controls</h3>

        <div className="interaction-prompt">
          <textarea
            value={interactionPrompt}
            onChange={(e) => setInteractionPrompt(e.target.value)}
            placeholder="Describe a situation for the characters to respond to..."
            disabled={isProcessing}
          />
          <button 
            onClick={() => initiateCharacterInteraction(interactionPrompt)}
            disabled={isProcessing || !interactionPrompt.trim()}
          >
            Prompt Character Interaction
          </button>
        </div>

        {isProcessing && (
          <div className="processing-indicator">
            <span>Processing character responses...</span>
          </div>
        )}
      </div>

      <div className="scene-controls">
        <button 
          onClick={() => {
            if (campaign.currentSceneIndex > 0) {
              const newIndex = campaign.currentSceneIndex - 1;
              setCurrentScene(campaign.scenes[newIndex]);
              setCampaign({ ...campaign, currentSceneIndex: newIndex });
            }
          }}
          disabled={campaign?.currentSceneIndex === 0}
        >
          Previous Scene
        </button>
        <button 
          onClick={() => {
            if (campaign.currentSceneIndex < campaign.scenes.length - 1) {
              const newIndex = campaign.currentSceneIndex + 1;
              setCurrentScene(campaign.scenes[newIndex]);
              setCampaign({ ...campaign, currentSceneIndex: newIndex });
            }
          }}
          disabled={campaign?.currentSceneIndex >= (campaign?.scenes.length - 1)}
        >
          Next Scene
        </button>

        {gmMode === 'ai' && selectedGmCharacter && (
          <div className="gm-narrative-controls">
            <button
              onClick={generateGmNarrativePrompt}
              disabled={isProcessing}
              className="gm-narrative-button"
            >
              Request GM Narration
            </button>
            {isWaitingForGmPrompt && (
              <span className="gm-waiting-indicator">
                Waiting for {characters.find(c => c.id === selectedGmCharacter)?.name || 'GM'} to respond...
              </span>
            )}
          </div>
        )}
      </div>

      <div className="gm-settings">
        <h3>Game Master Settings</h3>

        <div className="gm-mode-selector">
          <label>
            <input
              type="radio"
              name="gmMode"
              value="user"
              checked={gmMode === 'user'}
              onChange={() => handleGmModeChange('user')}
            />
            You are the Game Master
          </label>

          <label>
            <input
              type="radio"
              name="gmMode"
              value="ai"
              checked={gmMode === 'ai'}
              onChange={() => handleGmModeChange('ai')}
            />
            AI Character is the Game Master
          </label>
        </div>

        {gmMode === 'ai' && (
          <div className="gm-character-selector">
            <label>Select GM Character:</label>
            <select
              value={selectedGmCharacter || ''}
              onChange={(e) => handleGmCharacterChange(e.target.value)}
            >
              <option value="">-- Select Character --</option>
              {characters.map(character => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="scene-character-management">
          <h3>Characters in this Scene</h3>
          {characters.length === 0 ? (
            <p>No characters available. Go add characters to this campaign first.</p>
          ) : (
            <ul className="scene-character-list">
              {characters.map(character => (
                <li key={character.id} className="scene-character-item">
                  <label className="character-checkbox">
                    <input
                      type="checkbox"
                      checked={sceneCharacters.includes(character.id)}
                      onChange={() => toggleSceneCharacter(character.id)}
                    />
                    <span>{character.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button 
            className="save-scene-characters"
            onClick={saveSceneCharacters}
          >
            Update Scene Characters
          </button>
        </div>
      </div>
    </div>
  );
}

export default CampaignSessionPage;