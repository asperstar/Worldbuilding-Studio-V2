import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import { enhanceCharacterAPI } from '../utils/character/updatedContextProcessor';
import campaignMemoryManager from '../utils/memory/campaignMemoryIntegration';
import '../styles/CampaignSessionPage.css';

function CampaignSessionPage() {
  const { campaignId } = useParams();
  const { currentUser, getCampaignById, updateCampaignSession, getCharacters, getWorldById } = useStorage();
  const [campaign, setCampaign] = useState(null);
  const [worldContext, setWorldContext] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [speakingAs, setSpeakingAs] = useState('PLAYER');
  const [rpMode, setRpMode] = useState('lax'); // 'family-friendly' or 'lax'
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchCampaignAndCharacters = async () => {
      if (!currentUser || !currentUser.uid) {
        setError('User not authenticated. Please log in.');
        return;
      }

      try {
        setIsLoading(true);
        const loadedCampaign = await getCampaignById(campaignId);
        if (!loadedCampaign) {
          setError('Campaign not found.');
          return;
        }
        setCampaign(loadedCampaign);
        setMessages(loadedCampaign.sessionMessages || []);

        if (loadedCampaign.worldId) {
          const world = await getWorldById(loadedCampaign.worldId);
          if (world) {
            setWorldContext({
              name: world.name,
              description: world.description || '',
              rules: world.rules || '',
              lore: world.lore || '',
            });
          }
        }

        if (loadedCampaign.participantIds && loadedCampaign.participantIds.length > 0) {
          const campaignCharacters = await getCharacters(null);
          const filteredCharacters = campaignCharacters.filter(char =>
            loadedCampaign.participantIds.includes(char.id)
          );
          setCharacters(filteredCharacters);
        }

        // Enrich campaign context with memories
        const campaignContext = {
          name: loadedCampaign.name,
          description: loadedCampaign.description || 'A fantasy campaign',
          currentScene: loadedCampaign.scenes?.[loadedCampaign.currentSceneIndex || 0] || null,
        };
        const enrichedContext = await campaignMemoryManager.enrichCampaignContext(campaignId, campaignContext);
        loadedCampaign.context = enrichedContext;
        setCampaign(loadedCampaign);
      } catch (err) {
        setError('Failed to load campaign: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaignAndCharacters();
  }, [currentUser, campaignId, getCampaignById, getCharacters, getWorldById]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !campaign) return;
  
    // Determine if user is speaking as the Game Master
    const isGM = speakingAs === 'GM';
    const userMessage = {
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString(),
      speaker: isGM ? 'Game Master' : speakingAs === 'PLAYER' ? 'Player' : characters.find(char => char.id === speakingAs)?.name || 'Unknown',
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsSendingMessage(true);
    setError(null);
  
    // If user is the GM and campaign is user-GM mode, just save the message without AI response
    if (isGM && campaign.gmType === 'USER') {
      await updateCampaignSession(campaignId, updatedMessages);
      setIsSendingMessage(false);
      return;
    }
  
    try {
      let aiResponder = 'Game Master';
      let aiCharacterId = null;
      let useGmMode = false;
  
      // Configure AI response based on the context
      if (campaign.gmType === 'AI') {
        // If AI is the GM, always use GM mode
        useGmMode = true;
        aiResponder = 'Game Master';
        aiCharacterId = 'GM'; // Use special GM character ID
      } else if (isGM) {
        // User is GM but we still need an AI response for some reason
        useGmMode = true;
        aiResponder = 'Game Master';
        aiCharacterId = 'GM';
      } else if (speakingAs !== 'PLAYER') {
        // User speaking as a specific character
        const speakingAsCharacter = characters.find(char => char.id === speakingAs);
        const otherCharacters = characters.filter(char => char.id !== speakingAs);
        
        if (otherCharacters.length > 0) {
          // If there are other characters, pick one to respond
          const respondingChar = otherCharacters[0];
          aiCharacterId = respondingChar.id;
          aiResponder = respondingChar.name;
        } else {
          // No other characters, use GM/Narrator
          useGmMode = true;
          aiResponder = 'Narrator';
          aiCharacterId = 'GM';
        }
      } else {
        // Player is speaking as themselves
        // Decision logic for who should respond based on conversation flow
        const lastMessage = updatedMessages.length > 1 ? updatedMessages[updatedMessages.length - 2] : null;
        const lastSpeaker = lastMessage?.speaker;
        
        if (lastSpeaker && lastSpeaker !== 'Player' && lastSpeaker !== 'Game Master') {
          // If the last speaker was a character, have them respond
          const respondingChar = characters.find(char => char.name === lastSpeaker);
          if (respondingChar) {
            aiCharacterId = respondingChar.id;
            aiResponder = lastSpeaker;
          } else {
            // Character not found, fall back to GM
            useGmMode = true;
            aiResponder = 'Game Master';
            aiCharacterId = 'GM';
          }
        } else if (characters.length > 0) {
          // Choose a random character
          const randomIndex = Math.floor(Math.random() * characters.length);
          const randomChar = characters[randomIndex];
          aiCharacterId = randomChar.id;
          aiResponder = randomChar.name;
        } else {
          // No characters available, use GM
          useGmMode = true;
          aiResponder = 'Game Master';
          aiCharacterId = 'GM';
        }
      }
  
      // Ensure we have the latest enriched context
      const campaignContext = {
        name: campaign.name,
        description: campaign.description || 'A fantasy campaign',
        currentScene: campaign.scenes?.[campaign.currentSceneIndex || 0] || null,
      };
      
      // Get fresh enriched context with memories
      const enrichedContext = await campaignMemoryManager.enrichCampaignContext(
        campaignId, 
        campaign.context || campaignContext
      );
      
      const gmPrompt = campaign.gmPrompt || 'You are a Game Master narrating a fantasy campaign.';
  
      console.log('Sending request to AI as:', {
        aiCharacterId,
        aiResponder,
        useGmMode,
        campaignId,
        rpMode
      });
  
      // Pass all relevant context to the API
      const response = await enhanceCharacterAPI(
        aiCharacterId, // Character ID or 'GM'
        input, // User's message
        updatedMessages, // Full conversation history
        {
          temperature: 0.7,
          campaignId: campaignId,     
          enrichedContext: enrichedContext, 
          worldContext: worldContext,   
          isGameMaster: useGmMode, // This is the key flag for GM mode
          gmPrompt: gmPrompt,
          rpMode: rpMode,        
        }
      );
  
      const aiMessage = {
        sender: 'character',
        text: response.response,
        timestamp: new Date().toISOString(),
        speaker: aiResponder,
        memoryId: null, // Placeholder for memory ID (for future memory-wiping feature)
      };
      
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
  
      // Process this interaction in the memory system
      try {
        await campaignMemoryManager.processCampaignInteraction(
          campaignId,
          aiCharacterId, // Use the character ID or 'GM'
          aiResponder,
          aiMessage.text,
          campaign.participantIds || []
        );
      } catch (memoryError) {
        console.error('Error processing memory:', memoryError);
      }
  
      // Save the updated conversation
      await updateCampaignSession(campaignId, finalMessages);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message: ' + err.message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEditResponse = (index, newText) => {
    const updatedMessages = [...messages];
    updatedMessages[index] = { ...updatedMessages[index], text: newText, edited: true };
    setMessages(updatedMessages);
    updateCampaignSession(campaignId, updatedMessages);
  };

  if (isLoading) {
    return <div>Loading campaign...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        <p>{error}</p>
        <Link to={`/worlds/${campaign?.worldId}/campaigns`}>Back to Campaigns</Link>
      </div>
    );
  }

  if (!campaign) {
    return <div>Campaign not found.</div>;
  }

  return (
    <div className="campaign-session-page">
      <h1>{campaign.name} - Session</h1>

      {/* RP Mode Toggle */}
      <div className="rp-mode-toggle">
        <label>
          <input
            type="radio"
            value="family-friendly"
            checked={rpMode === 'family-friendly'}
            onChange={() => setRpMode('family-friendly')}
          />
          Family-Friendly
        </label>
        <label>
          <input
            type="radio"
            value="lax"
            checked={rpMode === 'lax'}
            onChange={() => setRpMode('lax')}
          />
          Lax (Violence/Morally Ambiguous Allowed)
        </label>
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <label>Speaking as: </label>
          <select value={speakingAs} onChange={(e) => setSpeakingAs(e.target.value)}>
            <option value="PLAYER">Player</option>
            <option value="GM">Game Master</option>
            {characters.map((char) => (
              <option key={char.id} value={char.id}>{char.name}</option>
            ))}
          </select>
          <Link to={`/campaigns/${campaign.id}/settings`} className="settings-button">
            +
          </Link>
        </div>
        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.sender === 'user' ? 'user-message' : 'ai-message'} ${
                msg.speaker === 'Game Master' ? 'gm-message' : ''
              }`}
            >
              <strong>{msg.speaker || 'Narrator'}</strong>{' '}
              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
              <p
                contentEditable={msg.sender === 'character'}
                onBlur={(e) => handleEditResponse(index, e.target.textContent)}
                suppressContentEditableWarning={true}
              >
                {msg.text}
              </p>
              {msg.edited && <small> (Edited)</small>}
              {/* Placeholder for memory-wiping feature */}
              {msg.sender === 'character' && (
                <button disabled={true}>Forget This Response (Coming Soon)</button>
              )}
            </div>
          ))}
          {isSendingMessage && (
            <div className="message ai-message">
              <strong>
                {campaign.gmType === 'AI' ? 'Game Master' : characters.length > 0 ? characters[0].name : 'Narrator'}
              </strong>{' '}
              <span>{new Date().toLocaleTimeString()}</span>
              <p className="generating-indicator">
                <span className="dot-1">.</span>
                <span className="dot-2">.</span>
                <span className="dot-3">.</span>
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isSendingMessage}
          />
          <button onClick={handleSendMessage} disabled={isSendingMessage}>
            {isSendingMessage ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <Link to={`/worlds/${campaign.worldId}/campaigns`}>Back to Campaigns</Link>
    </div>
  );
}

export default CampaignSessionPage;