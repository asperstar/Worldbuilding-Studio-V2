import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import { getEnhancedCampaignMemories, processCampaignConversation } from '../utils/memory/campaignMemoryManager';

// Define API URL based on environment
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://worldbuilding-studio-backend.vercel.app' 
  : 'http://localhost:3002';

const CampaignSessionPage = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { currentUser, getCampaign, getWorlds, getCharacters, updateCampaign } = useStorage();
  
  // State variables
  const [campaign, setCampaign] = useState(null);
  const [worldDetails, setWorldDetails] = useState(null);
  const [currentScene, setCurrentScene] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [currentCharacter, setCurrentCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAIGameMaster, setIsAIGameMaster] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        console.log('No current user, redirecting to login');
        navigate('/login');
        return;
      }

      console.log('Campaign ID from URL:', campaignId);
      setLoading(true);
      setError(null);

      try {
        // Load campaign data
        console.log('Fetching campaign data for ID:', campaignId);
        const loadedCampaign = await getCampaign(campaignId);
        if (!loadedCampaign) {
          throw new Error('Campaign not found or you do not have access to this campaign.');
        }
        console.log('Loaded campaign:', loadedCampaign);
        setCampaign(loadedCampaign);

        // Load world details
        if (loadedCampaign && loadedCampaign.worldId) {
          const worlds = await getWorlds();
          const campaignWorld = worlds.find(world => world.id === loadedCampaign.worldId);
          if (!campaignWorld) {
            console.warn('World not found for campaign:', loadedCampaign.worldId);
            setError(`World with ID ${loadedCampaign.worldId} not found for this campaign.`);
          }
          console.log('Loaded world:', campaignWorld);
          setWorldDetails(campaignWorld);
        } else {
          console.warn('No worldId specified for campaign:', loadedCampaign.id);
        }

        // Set current scene
        if (loadedCampaign && loadedCampaign.scenes && loadedCampaign.scenes.length > 0) {
          const sceneIndex = loadedCampaign.currentSceneIndex || 0;
          console.log('Setting scene at index:', sceneIndex);
          setCurrentScene(loadedCampaign.scenes[sceneIndex]);
        } else {
          console.warn('No scenes found for campaign:', loadedCampaign.id);
        }

        // Load characters
        const allCharacters = await getCharacters();
        const campaignCharacters = allCharacters.filter(
          char => loadedCampaign?.participantIds?.includes(char.id)
        );
        console.log('Loaded characters:', campaignCharacters);

        // Add the user as a "character" option
        const userOption = {
          id: 'user',
          name: 'You (Player)',
        };
        const updatedCharacters = [...campaignCharacters, userOption];
        setCharacters(updatedCharacters);

        // Set default character (default to the user)
        if (updatedCharacters.length > 0 && loadedCampaign?.scenes?.[loadedCampaign.currentSceneIndex || 0]?.characterIds?.length > 0) {
          const defaultCharacter = updatedCharacters.find(char => char.id === 'user');
          setCurrentCharacter(defaultCharacter || updatedCharacters[0]);
        }

        // Initialize messages
        if (loadedCampaign?.sessions?.length > 0) {
          const lastSession = loadedCampaign.sessions[loadedCampaign.sessions.length - 1];
          console.log('Loaded messages:', lastSession.messages);
          setMessages(lastSession.messages || []);
        } else {
          console.log('No sessions found for campaign, starting with empty messages');
          setMessages([]);
        }
      } catch (error) {
        console.error("Error loading campaign data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId, currentUser, navigate, getCampaign, getWorlds, getCharacters]);

  const updateCampaignSession = async (updatedMessages) => {
    if (!campaign) return;

    try {
      const updatedCampaign = {
        ...campaign,
        sessions: campaign.sessions ? [...campaign.sessions] : []
      };
      
      if (updatedCampaign.sessions.length === 0) {
        updatedCampaign.sessions.push({
          id: Date.now(),
          date: new Date().toISOString(),
          sceneIndex: updatedCampaign.currentSceneIndex || 0,
          messages: updatedMessages
        });
      } else {
        updatedCampaign.sessions[updatedCampaign.sessions.length - 1].messages = updatedMessages;
      }

      await updateCampaign(updatedCampaign);
      setCampaign(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign session:", error);
      setError('Failed to save session: ' + error.message);
    }
  };

// In CampaignSessionPage.js, update your getAIResponse function to match the /chat endpoint format:
const getAIResponse = async (messages, targetCharacter) => {
  try {
    // Get the last message from the user
    const lastUserMessage = messages[messages.length - 1].content;
    
    // Create a system prompt similar to what ChatPage uses
    const systemPrompt = `You are ${targetCharacter.name}, a character with the following traits: ${targetCharacter.traits || 'none'}. 
    Your personality is: ${targetCharacter.personality || 'neutral'}. 
    Your background: ${targetCharacter.background || 'unknown'}.
    Current scene: ${currentScene?.title || ''} - ${currentScene?.description || ''}
    Respond as this character would.`;
    
    console.log('Sending to API:', `${API_URL}/chat`);
    console.log('System prompt:', systemPrompt);
    console.log('User message:', lastUserMessage);
    
    // Use the /chat endpoint with the same format as ChatPage
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        systemPrompt, 
        userMessage: lastUserMessage 
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error in getAIResponse:', error);
    // Fallback
    return `*${targetCharacter.name} seems unsure how to respond*`;
  }
};

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    console.log('Current messages before update:', messages);

    // Determine the sender and target character
    const isUserSpeaking = currentCharacter.id === 'user';
    const senderName = isUserSpeaking ? 'You (Player)' : currentCharacter.name;

    // If the user is speaking, the target is the first AI character in the scene
    const targetCharacter = isUserSpeaking
      ? characters.find(char => char.id !== 'user' && currentScene?.characterIds?.includes(char.id))
      : null;

    const updatedMessages = [
      ...messages,
      { sender: senderName, content: newMessage, timestamp: new Date().toISOString() },
    ];
    setMessages(updatedMessages);
    setNewMessage('');

    // Update the campaign session with the new messages
    await updateCampaignSession(updatedMessages);

    // If AI is the Game Master and the user is speaking, get AI response
    if (isAIGameMaster && isUserSpeaking && targetCharacter) {
      try {
        const aiResponse = await getAIResponse(updatedMessages, targetCharacter);
        const newMessagesWithAI = [
          ...updatedMessages,
          { sender: targetCharacter.name, content: aiResponse, timestamp: new Date().toISOString() },
        ];
        setMessages(newMessagesWithAI);
        await updateCampaignSession(newMessagesWithAI);
      } catch (error) {
        console.error('Error getting AI response:', error);
        setError('Failed to get AI response. Please try again.');
      }
    }
  };

  // Show loading state
  if (loading) {
    return <div>Loading campaign...</div>;
  }

  // Show error state
  if (error) {
    let errorMessage = error;
    if (typeof error === 'string') {
      if (error.includes('not found')) {
        errorMessage = 'Campaign not found. It may have been deleted or the ID is incorrect.';
      } else if (error.includes('Unauthorized')) {
        errorMessage = 'You do not have access to this campaign. Please check if you are logged in with the correct account.';
      }
    }

    return (
      <div className="campaign-session">
        <div className="error-message">
          <p>{errorMessage}</p>
          <button onClick={() => navigate('/campaigns')}>
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="campaign-session">
      <h1>Campaign: {campaign?.name}</h1>
      <h2>Scene: {currentScene?.title}</h2>
      <p>{currentScene?.description}</p>

      <div className="chat-area">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender === 'You (Player)' ? 'player' : 'ai'}`}>
            <strong>{msg.sender}</strong> <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage}>
        <div>
          <label>Speaking as: </label>
          <select
            value={currentCharacter?.id || ''}
            onChange={(e) => {
              const selectedChar = characters.find(char => char.id === e.target.value);
              setCurrentCharacter(selectedChar);
            }}
          >
            {characters.map(char => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Enter your message as the Game Master..."
        />
        <button type="submit">Send</button>
      </form>

      <div className="game-master-controls">
        <h3>Game Master Controls</h3>
        <button onClick={() => {/* Handle previous scene */}}>Previous Scene</button>
        <button onClick={() => {/* Handle next scene */}}>Next Scene</button>
        <div>
          <label>
            <input
              type="radio"
              checked={!isAIGameMaster}
              onChange={() => setIsAIGameMaster(false)}
            />
            You are the Game Master
          </label>
          <label>
            <input
              type="radio"
              checked={isAIGameMaster}
              onChange={() => setIsAIGameMaster(true)}
            />
            AI Character is the Game Master
          </label>
        </div>
      </div>
    </div>
  );
};

export default CampaignSessionPage;