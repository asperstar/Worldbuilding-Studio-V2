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

    const isGM = speakingAs === 'GM';
    const userMessage = {
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString(),
      speaker: isGM ? 'Game Master' : speakingAs === 'PLAYER' ? 'Player' : characters.find(char => char.id === speakingAs)?.name || 'Unknown',
    };
    let updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsSendingMessage(true);
    setError(null);

    if (isGM && campaign.gmType === 'USER') {
      await updateCampaignSession(campaignId, updatedMessages);
      setIsSendingMessage(false);
      return;
    }

    try {
      const campaignContext = {
        name: campaign.name,
        description: campaign.description || 'A fantasy campaign',
        currentScene: campaign.scenes?.[campaign.currentSceneIndex || 0] || null,
      };
      const enrichedContext = await campaignMemoryManager.enrichCampaignContext(campaignId, campaign.context || campaignContext);
      const gmPrompt = campaign.gmPrompt || 'You are a Game Master narrating a fantasy campaign.';

      // Determine responders
      let responders = [];
      let useGmMode = false;
      let gmResponder = null;

      if (campaign.gmType === 'AI') {
        useGmMode = true;
        gmResponder = { id: 'GM', name: 'Game Master' };
      } else if (isGM) {
        useGmMode = true;
        gmResponder = { id: 'GM', name: 'Game Master' };
      }

      if (speakingAs !== 'PLAYER') {
        const speakingAsCharacter = characters.find(char => char.id === speakingAs);
        const otherCharacters = characters.filter(char => char.id !== speakingAs);

        if (otherCharacters.length > 0) {
          // Select up to 2 characters to respond, prioritizing those mentioned or with relevant traits
          const userMessageLower = input.toLowerCase();
          responders = otherCharacters
            .map(char => ({
              char,
              score: (userMessageLower.includes(char.name.toLowerCase()) ? 10 : 0) +
                     ((char.traits || '').toLowerCase().includes('talkative') ? 5 : 0) +
                     ((char.traits || '').toLowerCase().includes('curious') ? 3 : 0) +
                     ((char.background || '').toLowerCase().includes('leader') ? 2 : 0),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.min(2, otherCharacters.length))
            .map(item => ({ id: item.char.id, name: item.char.name }));
        } else {
          useGmMode = true;
          gmResponder = { id: 'GM', name: 'Narrator' };
        }
      } else {
        const lastMessage = updatedMessages.length > 1 ? updatedMessages[updatedMessages.length - 2] : null;
        const lastSpeaker = lastMessage?.speaker;

        if (lastSpeaker && lastSpeaker !== 'Player' && lastSpeaker !== 'Game Master') {
          const lastChar = characters.find(char => char.name === lastSpeaker);
          if (lastChar) {
            responders.push({ id: lastChar.id, name: lastChar.name });
          }
        }

        // Add additional responders based on message content and traits
        const userMessageLower = input.toLowerCase();
        const additionalResponders = characters
          .filter(char => !responders.some(r => r.id === char.id))
          .map(char => ({
            char,
            score: (userMessageLower.includes(char.name.toLowerCase()) ? 10 : 0) +
                   ((char.traits || '').toLowerCase().includes('talkative') ? 5 : 0) +
                   ((char.traits || '').toLowerCase().includes('knowledge') ? 3 : 0) +
                   ((char.background || '').toLowerCase().includes('leader') ? 2 : 0),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, Math.min(2 - responders.length, characters.length))
          .map(item => ({ id: item.char.id, name: item.char.name }));

        responders = [...responders, ...additionalResponders];

        if (responders.length === 0) {
          useGmMode = true;
          gmResponder = { id: 'GM', name: 'Game Master' };
        }
      }

      // Generate responses for each character
      for (const responder of responders) {
        console.log('Sending request to AI as:', { aiCharacterId: responder.id, aiResponder: responder.name, campaignId, rpMode });

        const response = await enhanceCharacterAPI(
          responder.id,
          input,
          updatedMessages,
          {
            temperature: 0.7,
            campaignId: campaignId,
            enrichedContext: enrichedContext,
            worldContext: worldContext,
            isGameMaster: false,
            gmPrompt: gmPrompt,
            rpMode: rpMode,
          }
        );

        const aiMessage = {
          sender: 'character',
          text: response.response,
          timestamp: new Date(Date.now() + responders.indexOf(responder) * 1000).toISOString(), // Stagger timestamps
          speaker: responder.name,
          memoryId: null,
        };

        updatedMessages = [...updatedMessages, aiMessage];
        setMessages(updatedMessages);

        await campaignMemoryManager.processCampaignInteraction(
          campaignId,
          responder.id,
          responder.name,
          aiMessage.text,
          campaign.participantIds || []
        );
      }

      // Generate GM response if applicable
      if (useGmMode && gmResponder) {
        console.log('Sending request to AI as:', { aiCharacterId: gmResponder.id, aiResponder: gmResponder.name, campaignId, rpMode });

        const response = await enhanceCharacterAPI(
          gmResponder.id,
          input,
          updatedMessages,
          {
            temperature: 0.7,
            campaignId: campaignId,
            enrichedContext: enrichedContext,
            worldContext: worldContext,
            isGameMaster: true,
            gmPrompt: gmPrompt,
            rpMode: rpMode,
          }
        );

        const gmMessage = {
          sender: 'character',
          text: response.response,
          timestamp: new Date(Date.now() + responders.length * 1000).toISOString(),
          speaker: gmResponder.name,
          memoryId: null,
        };

        updatedMessages = [...updatedMessages, gmMessage];
        setMessages(updatedMessages);

        await campaignMemoryManager.processCampaignInteraction(
          campaignId,
          gmResponder.id,
          gmResponder.name,
          gmMessage.text,
          campaign.participantIds || []
        );
      }

      await updateCampaignSession(campaignId, updatedMessages);
    } catch (err) {
      console.error('Failed to send message:', err);
      if (err.message.includes('API error')) {
        setError('Unable to get a response from the server. Please check your internet connection or try again later.');
      } else if (err.message.includes('Character not found')) {
        setError('One or more responding characters could not be found. Please try selecting different characters.');
      } else {
        setError(`Failed to send message: ${err.message}`);
      }
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