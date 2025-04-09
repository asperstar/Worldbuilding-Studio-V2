// src/pages/CampaignSessionPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { loadCampaign, saveCampaign, loadCharacters, loadWorlds } from '../utils/storage';
import { getCampaignMemories, addCampaignMemory } from '../utils/memory/campaignMemoryManager';
import { orchestrateCharacterInteraction } from '../utils/campaignManager';
import { getCachedEnvironment } from '../utils/environment-selector';
import { enhanceCharacterAPI } from '../utils/character/contextProcessor';

const API_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_API_URL || 'https://my-backend-jet-two.vercel.app'
  : 'http://localhost:3002';

function CampaignSessionPage() {
  const { campaignId } = useParams();
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
  // Removed unused isTyping state

  const generateGmSceneDescription = useCallback(async () => {
    if (!selectedGmCharacter || gmMode !== 'ai' || !campaign) return;
    
    setIsWaitingForGmPrompt(true);
    
    try {
      const gmCharacter = characters.find(c => c.id === selectedGmCharacter);
      if (!gmCharacter) throw new Error('GM character not found');
      
      // Get campaign context for scene generation
      const campaignSummary = campaign.description || '';
      const previousScenes = campaign.scenes
        .slice(0, campaign.currentSceneIndex)
        .map(s => s.title + ': ' + s.description)
        .join('\n');
      
      // Format conversation history for context
      const recentMessages = messages.slice(-5).map(msg => {
        const speaker = msg.sender === 'user' ? 'Player' : 
                       characters.find(c => c.id === msg.sender)?.name || 'Unknown';
        return `${speaker}: ${msg.content}`;
      }).join('\n');
      
      // Get character memories to inform scene creation
      const gmMemories = await getCampaignMemories(
        gmCharacter.id,
        campaignId,
        "scene narrative storytelling plot"
      );
      
      // Call the AI API for scene suggestions
      const response = await fetch(`${API_URL}/api/claude-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          character: gmCharacter,
          message: "As the Game Master, create 3 brief scene descriptions for where the story could go next. Each should be 2-3 sentences capturing the setting, mood, and potential conflict or development.",
          conversationHistory: [],
          relevantMemories: gmMemories,
          campaignContext: {
            isGmScenePrompt: true,
            campaignName: campaign.name,
            campaignSummary: campaignSummary,
            currentSceneTitle: currentScene?.title || "New Scene",
            previousScenes: previousScenes,
            recentConversation: recentMessages,
            charactersPresent: characters
              .filter(c => currentScene?.characterIds?.includes(c.id))
              .map(c => c.name)
              .join(', '),
            sceneName: currentScene?.title || 'Current Scene',
            sceneDescription: currentScene?.description || '',
            characters: characters.map(c => c.name).join(', '),
            gmMode: gmMode,
            gmCharacter: gmMode === 'ai' 
              ? characters.find(c => c.id === selectedGmCharacter)?.name 
              : null,
            worldName: worldDetails?.name || '',
            worldDescription: worldDetails?.description || ''
          }
        }),
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
    
      const data = await response.json();
      
      // Extract the scene suggestions from the response (assuming they're separated by line breaks)
      const suggestions = data.response
        .split(/\n{2,}/) // Split on double newlines
        .filter(s => s.trim().length > 0)
        .slice(0, 3); // Take up to 3 suggestions
      
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

  // Load campaign data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load campaign with await
        const loadedCampaign = await loadCampaign(parseInt(campaignId));
        if (!loadedCampaign) {
          throw new Error(`Campaign with ID ${campaignId} not found`);
        }
        
        setCampaign(loadedCampaign);

        // Load world details if available
        if (loadedCampaign && loadedCampaign.worldId) {
          const worlds = await loadWorlds();
          const campaignWorld = worlds.find(world => world.id === loadedCampaign.worldId);
          setWorldDetails(campaignWorld);
        }
        
        // Set current scene
        if (loadedCampaign && loadedCampaign.scenes && loadedCampaign.scenes.length > 0) {
          setCurrentScene(loadedCampaign.scenes[loadedCampaign.currentSceneIndex || 0]);
        }
        
        // Load characters with await
        const allCharacters = await loadCharacters();
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
  }, [campaignId]);

  // Update scene characters when current scene changes
  useEffect(() => {
    if (currentScene) {
      setSceneCharacters(currentScene.characterIds || []);
      
      // If we're in AI GM mode, and there's no scene description yet, prompt for one
      if (gmMode === 'ai' && selectedGmCharacter && 
          (!currentScene.description || currentScene.description.trim() === '')) {
        generateGmSceneDescription();
      }
    }
  }, [currentScene, gmMode, selectedGmCharacter, generateGmSceneDescription]);

  const findRelevantEnvironment = async (characterToUse) => {
    return await getCachedEnvironment({
      character: characterToUse,
      messages: messages,
      characters: characters,
      worldId: campaign.worldId
    });
  };
  
  // Function to handle GM mode selection
  const handleGmModeChange = (mode) => {
    setGmMode(mode);
    
    // If switching to AI, but no GM character selected yet,
    // default to the first character if available
    if (mode === 'ai' && !selectedGmCharacter && characters.length > 0) {
      setSelectedGmCharacter(characters[0].id);
    }
  };

  // Function to handle GM character selection
  const handleGmCharacterChange = (characterId) => {
    setSelectedGmCharacter(characterId);
  };

  // Character selector component
  const CharacterSelector = () => {
    // Filter out the GM character if in AI GM mode and GM character is selected
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

  // Helper function for character memories
  const addCharacterMemory = async (characterId, content, type = 'OBSERVATION', importance = 5) => {
    try {
      // Add the memory
      return await addCampaignMemory(
        characterId,
        campaignId,
        content,
        type,
        importance
      );
    } catch (error) {
      console.error('Error adding character memory:', error);
    }
  };

  // Helper function to update campaign session
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
      
      await saveCampaign(updatedCampaign);
      setCampaign(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign session:", error);
    }
  };

  // Add function to select and apply a scene suggestion
  const applySceneSuggestion = async (suggestion) => {
    if (!currentScene || !campaign) return;
    
    try {
      // Update the current scene with the new description
      const updatedScenes = campaign.scenes.map((scene, index) => {
        if (index === campaign.currentSceneIndex) {
          return {
            ...scene,
            description: suggestion
          };
        }
        return scene;
      });
      
      // Save the updated campaign
      const updatedCampaign = {
        ...campaign,
        scenes: updatedScenes
      };
      
      await saveCampaign(updatedCampaign);
      setCampaign(updatedCampaign);
      setCurrentScene(updatedScenes[campaign.currentSceneIndex]);
      
      // Reset the suggestions
      setSceneSuggestions([]);
      setSelectedSceneSuggestion(null);
      
      // Add a system message showing the new scene description
      const newMessage = {
        sender: 'system',
        content: `[New scene description from ${characters.find(c => c.id === selectedGmCharacter)?.name || 'GM'}]: ${suggestion}`,
        timestamp: new Date().toISOString()
      };
      
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      
      // Update the campaign session with the new message
      await updateCampaignSession(updatedMessages);
    } catch (error) {
      console.error("Error applying scene suggestion:", error);
    }
  };

  // Add function to generate periodic GM prompts
  const generateGmNarrativePrompt = async () => {
    if (!selectedGmCharacter || gmMode !== 'ai' || !campaign) return;
    
    setIsProcessing(true);
    
    try {
      const gmCharacter = characters.find(c => c.id === selectedGmCharacter);
      if (!gmCharacter) throw new Error('GM character not found');

      // Get character memories for context
      const gmMemories = await getCampaignMemories(
        gmCharacter.id,
        campaignId,
        "narrative story progression"
      );
      
      // Format recent conversation for context
      const recentMessages = messages.slice(-10).map(msg => {
        const speaker = msg.sender === 'user' ? 'Player' : 
                       characters.find(c => c.id === msg.sender)?.name || 'Unknown';
        return `${speaker}: ${msg.content}`;
      }).join('\n');
      
      // Call the AI API for a GM narrative prompt
      const response = await fetch(`${API_URL}/api/claude-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          character: gmCharacter,
          message: "As the Game Master/Narrator, create a narrative prompt to move the story forward. Describe what happens next in the scene, introduce a complication, or prompt the player characters to take action. Speak in a neutral narrator voice rather than as your character.",
          conversationHistory: [],
          relevantMemories: gmMemories,
          campaignContext: {
            isGmNarrativePrompt: true,
            roleType: "gamemaster",
            speakingAs: "narrator",
            narratorVoice: true,
            campaignName: campaign.name,
            currentSceneTitle: currentScene?.title || "Current Scene",
            currentSceneDescription: currentScene?.description || "",
            recentConversation: recentMessages
          }
        }),
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      
      // Add the GM narrative prompt as a message from the GM character
      const gmMessage = {
        sender: selectedGmCharacter,
        content: data.response,
        timestamp: new Date().toISOString(),
        isNarrativePrompt: true  // Flag to style differently if needed
      };
      
      const updatedMessages = [...messages, gmMessage];
      setMessages(updatedMessages);
      
      // Store as a memory for all characters in the scene
      for (const characterId of sceneCharacters) {
        if (characterId !== selectedGmCharacter) {
          await addCharacterMemory(
            characterId,
            `[GM Narration] ${characters.find(c => c.id === selectedGmCharacter)?.name || 'GM'} described: "${data.response}"`,
            'EVENT',
            7
          );
        }
      }
      
      // Update campaign session
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

  // Function to initiate character interaction based on prompt
  const initiateCharacterInteraction = async (prompt) => {
    // Show loading state
    setIsProcessing(true);
    
    try {
      console.log('Initiating character interaction with prompt:', prompt);
      
      // Get all characters in the current scene
      let charactersInScene = [];
      
      if (currentScene && currentScene.characterIds) {
        charactersInScene = characters.filter(char => 
          currentScene.characterIds.includes(char.id)
        );
      } else {
        // If no scene characters defined, use all campaign characters
        charactersInScene = characters;
      }
      
      if (charactersInScene.length === 0) {
        throw new Error('No characters are present in this scene to interact');
      }
      
      console.log(`Found ${charactersInScene.length} characters in scene`);
      
      // Orchestrate a conversation between them
      const result = await orchestrateCharacterInteraction(
        campaign,
        charactersInScene,
        prompt,
        3 // Limit to 3 character responses to save API calls
      );
      
      console.log('Character interaction result:', result);
      
      // Add the resulting conversation to the session
      const updatedMessages = [...messages, ...result.conversation];
      setMessages(updatedMessages);
      
      // Update the campaign with the new conversation
      await updateCampaignSession(updatedMessages);
      
      // Clear the prompt
      setInteractionPrompt('');
    } catch (error) {
      console.error('Error in character interaction:', error);
      // Show error message to user
      setMessages(prev => [...prev, {
        sender: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process a character's AI response
  // Process a character's AI response
const processCharacterResponse = async (character, messageHistory) => {
  try {
    // Try to get memories
    let memoryData = '';
    try {
      memoryData = await getCampaignMemories(
        character.id,
        campaignId,
        userMessage
      );
    } catch (memError) {
      console.warn(`Could not retrieve memories for character ${character.name}:`, memError);
    }
    
    // Get the last message for context
    const lastMessage = messageHistory[messageHistory.length - 1];
    const lastSenderName = lastMessage.sender === 'user' 
      ? 'Game Master' 
      : characters.find(c => c.id === lastMessage.sender)?.name || 'Unknown';
    
    // Call API with enhanced context
    const data = await enhanceCharacterAPI(
      '${API_URL}/api/claude-api',
      character.id,
      messageHistory[messageHistory.length - 1].content,
      messageHistory.slice(-5),
      {
        mode: 'campaign',
        includeWorldInfo: true,
        includeMapInfo: true,
        includeTimelineInfo: true,
        worldId: campaign.worldId,
        currentEnvironmentId: await findRelevantEnvironment(character),
        sceneName: currentScene?.title,
        sceneDescription: currentScene?.description,
        currentDate: new Date().toISOString().split('T')[0],
        campaignStartDate: campaign?.created?.split('T')[0],
        memories: memoryData // Include memories if available
      }
    );
    
    // Add character response to messages
    const characterMessage = {
      sender: character.id,
      content: data.response,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, characterMessage]);
    
    // Store in character memories (their own response)
    await addCharacterMemory(
      character.id,
      `I responded: "${data.response}" to ${lastSenderName} in campaign ${campaignId}`,
      'ACTION',
      6
    );
    
    // Store as a memory for other characters who witnessed it
    for (const witnessId of sceneCharacters.filter(id => id !== character.id)) {
      await addCharacterMemory(
        witnessId,
        `${character.name} said: "${data.response}" in campaign ${campaignId}`,
        'OBSERVATION',
        5
      );
    }
    
    // Update campaign session
    updateCampaignSession([...messageHistory, characterMessage]);
    
  } catch (error) {
    console.error(`Error processing response for ${character.name}:`, error);
    
    // Add error message
    setMessages(prev => [...prev, {
      sender: 'system',
      content: `${character.name} is unable to respond at the moment.`,
      timestamp: new Date().toISOString()
    }]);
  }
};

  // Send message function
  const sendMessage = async () => {
    if (!userMessage.trim()) return;
    
    // Prevent sending if GM mode is AI and no active speaking character is selected
    if (gmMode === 'ai' && !activeSpeakingCharacter) {
      setMessages(prev => [...prev, {
        sender: 'system',
        content: 'You need to select a character to speak as when an AI is the Game Master.',
        timestamp: new Date().toISOString()
      }]);
      return;
    }
    
    // Determine the sender based on active speaking character
    const sender = activeSpeakingCharacter ? activeSpeakingCharacter.id : 'user';
    
    // Create the message with the correct sender
    const newMessage = {
      sender: sender,
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    // Update messages with the new message
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setUserMessage('');
    
    // If message is from a player-controlled character, add to character memories
    if (activeSpeakingCharacter) {
      try {
        // Store this as a memory for the character who spoke
        await addCharacterMemory(
          activeSpeakingCharacter.id,
          `I said: "${userMessage}" in campaign ${campaignId}`,
          'ACTION',
          7 // Higher importance for character's own actions
        );
        
        // Also store as memories for other characters who witnessed it
        for (const witnessId of sceneCharacters.filter(id => id !== activeSpeakingCharacter.id)) {
          const witnessChar = characters.find(c => c.id === witnessId);
          if (witnessChar) {
            await addCharacterMemory(
              witnessId,
              `${activeSpeakingCharacter.name} said: "${userMessage}" in campaign ${campaignId}`,
              'OBSERVATION',
              5
            );
          }
        }
      } catch (error) {
        console.error('Error storing character memory:', error);
      }
    }
    
    // Determine which characters should respond
    const respondingCharacters = characters.filter(character => 
      // Include characters that:
      // 1. Are in the current scene
      sceneCharacters.includes(character.id) &&
      // 2. Are not the character who just spoke
      character.id !== sender &&
      // 3. Are not the GM character if in AI GM mode
      !(gmMode === 'ai' && character.id === selectedGmCharacter)
    );
    
    // Process responses for each character
    for (const character of respondingCharacters) {
      await processCharacterResponse(character, updatedMessages);
    }
  };

  const toggleSceneCharacter = (characterId) => {
    setSceneCharacters(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      } else {
        return [...prev, characterId];
      }
    });
  };

  const saveSceneCharacters = async () => {
    if (!campaign || !currentScene) return;
    
    try {
      // Find current scene
      const updatedScenes = campaign.scenes.map(scene => {
        if (scene === currentScene) {
          return {
            ...scene,
            characterIds: sceneCharacters
          };
        }
        return scene;
      });
      
      // Update campaign
      const updatedCampaign = {
        ...campaign,
        scenes: updatedScenes
      };
      
      // Save to storage
      await saveCampaign(updatedCampaign);
      
      // Update local state
      setCampaign(updatedCampaign);
      setCurrentScene(updatedScenes[campaign.currentSceneIndex]);
    } catch (error) {
      console.error("Error saving scene characters:", error);
    }
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
                generateGmSceneDescription(); // Generate new suggestions
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
              // Determine the sender name and style
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
                
                // Check if this is a GM narration
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
          onClick={() => {/* Previous scene logic */}}
          disabled={campaign?.currentSceneIndex === 0}
        >
          Previous Scene
        </button>
        <button 
          onClick={() => {/* Next scene logic */}}
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