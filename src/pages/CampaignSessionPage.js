/* eslint-disable no-undef */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import { getEnhancedCampaignMemories, processCampaignConversation } from '../utils/memory/campaignMemoryManager';

// Define API URL based on environment
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://my-backend-jet-two.vercel.app/'
  : 'http://localhost:3002';

// Local storage helpers
const saveToLocalStorage = (campaignId, messages) => {
  try {
    localStorage.setItem(`campaign_${campaignId}_messages`, JSON.stringify(messages));
    console.log("Saved messages to localStorage as fallback");
    return true;
  } catch (e) {
    console.error("Error saving to localStorage:", { message: e.message, code: e.code, stack: e.stack });
    return false;
  }
};

const getFromLocalStorage = (campaignId) => {
  try {
    const saved = localStorage.getItem(`campaign_${campaignId}_messages`);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error("Error loading from localStorage:", { message: e.message, code: e.code, stack: e.stack });
    return null;
  }
};

// Utility function to deep clean an object for Firestore
const deepCleanForFirestore = (obj, currentUser) => {
  // Handle null, undefined, or non-objects
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    console.warn('deepCleanForFirestore received invalid input:', obj);
    return null;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj
      .map(item => deepCleanForFirestore(item, currentUser))
      .filter(item => item !== null && item !== undefined);
  }

  // Handle objects
  const cleaned = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];

    // Skip fields that are userImpl objects or the 'user' field
    if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'userImpl') {
      console.log(`Found userImpl object in field '${key}':`, value);
      continue;
    }

    if (key === 'user') {
      console.log(`Removing 'user' field with value:`, value);
      continue;
    }

    if (value === undefined) {
      console.log(`Removing undefined field '${key}'`);
      continue;
    }

    if (typeof value === 'object') {
      const cleanedValue = deepCleanForFirestore(value, currentUser);
      if (cleanedValue !== null && cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    } else {
      cleaned[key] = value;
    }

    // Special handling for 'createdBy' field
    if (key === 'createdBy' && value && typeof value === 'object') {
      cleaned[key] = value.uid || (currentUser ? currentUser.uid : null);
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : null;
};

const CampaignSessionPage = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { currentUser, getCampaign, getWorlds, getCharacters, updateCampaign } = useStorage();

  // State variables
  const [campaign, setCampaign] = useState(null);
  const [worldDetails, setWorldDetails] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [currentCharacter, setCurrentCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAIGameMaster, setIsAIGameMaster] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !currentUser.uid) {
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

        // Clean the loaded campaign to remove unsupported fields
        const cleanedCampaign = deepCleanForFirestore(loadedCampaign, currentUser);
        if (!cleanedCampaign) {
          throw new Error('Failed to clean campaign data');
        }
        console.log('Loaded and cleaned campaign:', cleanedCampaign);
        setCampaign(cleanedCampaign);

        // Load world details
        if (cleanedCampaign?.worldId) {
          const worlds = await getWorlds();
          const campaignWorld = worlds.find(world => world.id === cleanedCampaign.worldId);
          if (!campaignWorld) {
            console.warn('World not found for campaign:', cleanedCampaign.worldId);
            setError(`World with ID ${cleanedCampaign.worldId} not found for this campaign.`);
          } else {
            console.log('Loaded world:', campaignWorld);
            setWorldDetails(campaignWorld);
          }
        } else {
          console.warn('No worldId specified for campaign:', cleanedCampaign.id);
        }

        // Load characters
        const allCharacters = await getCharacters();
        const campaignCharacters = allCharacters.filter(
          char => Array.isArray(cleanedCampaign?.participantIds) && cleanedCampaign.participantIds.includes(char.id)
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
        if (updatedCharacters.length > 0) {
          const defaultCharacter = updatedCharacters.find(char => char.id === 'user') || updatedCharacters[0];
          setCurrentCharacter(defaultCharacter);
        } else {
          console.warn('No characters available for this campaign');
        }

        // Initialize messages
        let initialMessages = [];
        if (cleanedCampaign?.sessions?.length > 0) {
          const lastSession = cleanedCampaign.sessions[cleanedCampaign.sessions.length - 1];
          console.log('Loaded messages from Firestore:', lastSession.messages);
          initialMessages = Array.isArray(lastSession.messages) ? lastSession.messages : [];
        } else {
          console.log('No sessions found for campaign, checking localStorage');
          const localMessages = getFromLocalStorage(campaignId);
          if (localMessages) {
            console.log('Loaded messages from localStorage:', localMessages);
            initialMessages = Array.isArray(localMessages) ? localMessages : [];
          } else {
            console.log('No messages found in localStorage, starting with empty messages');
          }
        }
        setMessages(initialMessages);
      } catch (error) {
        console.error("Error loading campaign data:", { message: error.message, code: error.code, stack: error.stack });
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId, currentUser, navigate, getCampaign, getWorlds, getCharacters]);

  const updateCampaignSession = async (updatedMessages) => {
    if (!campaign) return;

    // Always save to localStorage as a fallback
    saveToLocalStorage(campaign.id, updatedMessages);

    try {
      const updatedCampaign = {
        ...campaign,
        sessions: Array.isArray(campaign.sessions) ? [...campaign.sessions] : [],
      };

      // Remove scenes and currentSceneIndex since we're not using them
      delete updatedCampaign.scenes;
      delete updatedCampaign.currentSceneIndex;

      if (updatedCampaign.sessions.length === 0) {
        updatedCampaign.sessions.push({
          id: Date.now().toString(),
          date: new Date().toISOString(),
          messages: Array.isArray(updatedMessages) ? updatedMessages : [],
        });
      } else {
        updatedCampaign.sessions[updatedCampaign.sessions.length - 1].messages = Array.isArray(updatedMessages) ? updatedMessages : [];
      }

      // Deep clean the campaign object for Firestore
      let cleanCampaign = deepCleanForFirestore(updatedCampaign, currentUser);
      if (!cleanCampaign) {
        throw new Error('Failed to clean campaign data for saving');
      }

      // Final check: ensure the 'user' field is removed
      if (cleanCampaign.user) {
        console.log("Final check: 'user' field still present after deepCleanForFirestore, removing it:", cleanCampaign.user);
        delete cleanCampaign.user;
      }

      // Ensure userId is a string
      cleanCampaign.userId = currentUser.uid;

      console.log('Saving cleaned campaign (final, just before updateCampaign):', JSON.stringify(cleanCampaign, null, 2));

      const success = await updateCampaign(cleanCampaign);
      if (success) {
        setCampaign(cleanCampaign);
      } else {
        throw new Error('Failed to update campaign in Firestore');
      }
    } catch (error) {
      console.error("Error updating campaign session:", { message: error.message, code: error.code, stack: error.stack });
      setError('Session saved locally but not to cloud: ' + error.message);
    }
  };

  const getAIResponse = async (messages, targetCharacter) => {
    try {
      // Ensure messages array is not empty
      if (!messages.length) {
        throw new Error('No messages available to process');
      }

      // Get the last message from the user
      const lastUserMessage = messages[messages.length - 1].content;

      // Create a system prompt without scene context
      const systemPrompt = `You are ${targetCharacter.name}, a character with the following traits: ${targetCharacter.traits || 'none'}. 
      Your personality is: ${targetCharacter.personality || 'neutral'}. 
      Your background: ${targetCharacter.background || 'unknown'}.
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
          userMessage: lastUserMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error in getAIResponse:', { message: error.message, code: error.code, stack: error.stack });
      setError(`Failed to get AI response: ${error.message}`);
      return `*${targetCharacter.name} seems unsure how to respond*`;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!currentCharacter) {
      setError('Please select a character to speak as');
      return;
    }

    setSending(true);
    setError(null);

    try {
      console.log('Current messages before update:', messages);

      // Determine the sender and target character
      const isUserSpeaking = currentCharacter.id === 'user';
      const senderName = isUserSpeaking ? 'You (Player)' : currentCharacter.name;

      // If the user is speaking, the target is the first AI character in the campaign
      const targetCharacter = isUserSpeaking
        ? characters.find(char => char.id !== 'user')
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
        const aiResponse = await getAIResponse(updatedMessages, targetCharacter);
        const newMessagesWithAI = [
          ...updatedMessages,
          { sender: targetCharacter.name, content: aiResponse, timestamp: new Date().toISOString() },
        ];
        setMessages(newMessagesWithAI);
        await updateCampaignSession(newMessagesWithAI);
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', { message: error.message, code: error.code, stack: error.stack });
      setError('Failed to send message: ' + error.message);
    } finally {
      setSending(false);
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
          <Link to="/campaigns">Back to Campaigns</Link>
        </div>
      </div>
    );
  }

  // Ensure currentCharacter is set before rendering the form
  if (!currentCharacter) {
    return <div>No characters available to speak as. Please add characters to the campaign.</div>;
  }

  return (
    <div className="campaign-session">
      <h1>Campaign: {campaign?.name || 'Unnamed Campaign'}</h1>

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
            value={currentCharacter.id}
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
          placeholder="Enter your message..."
          disabled={sending}
        />
        <button type="submit" disabled={sending}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>

      <div className="game-master-controls">
        <h3>Game Master Controls</h3>
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

      <Link to={`/worlds/${campaign?.worldId}/campaigns`}>Back to Campaigns</Link>
    </div>
  );
};

export default CampaignSessionPage;