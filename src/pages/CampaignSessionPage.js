import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import apiClient from '../utils/apiClient';

const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://my-backend-jet-two.vercel.app'
  : 'http://localhost:3002';

function CampaignSessionPage() {
  const { campaignId } = useParams();
  const { currentUser, getCampaignById, updateCampaignSession, getCharacters } = useStorage();
  const [campaign, setCampaign] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [speakingAs, setSpeakingAs] = useState('PLAYER'); // Default to speaking as Player
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

        if (loadedCampaign.participantIds && loadedCampaign.participantIds.length > 0) {
          const campaignCharacters = await getCharacters(null);
          const filteredCharacters = campaignCharacters.filter(char =>
            loadedCampaign.participantIds.includes(char.id)
          );
          setCharacters(filteredCharacters);
        }
      } catch (err) {
        setError('Failed to load campaign: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaignAndCharacters();
  }, [currentUser, campaignId, getCampaignById, getCharacters]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !campaign) return;

    const isGM = campaign.gmType === 'USER' && speakingAs === 'GM';
    const userMessage = {
      role: isGM ? 'assistant' : 'user',
      content: input,
      timestamp: new Date().toISOString(),
      speaker: isGM ? 'Game Master' : speakingAs === 'PLAYER' ? 'Player' : characters.find(char => char.id === speakingAs)?.name || 'Unknown',
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    if (isGM) {
      // If user is acting as GM, no AI response is needed
      await updateCampaignSession(campaignId, updatedMessages);
      setIsLoading(false);
      return;
    }

    try {
      // Determine who the AI should respond as
      let aiResponder = 'Game Master';
      let systemPrompt = null;

      // If the GM is AI, it responds as the GM by default
      if (campaign.gmType === 'AI') {
        systemPrompt = 'You are a Game Master in a fantasy campaign.';
      } else {
        // If the user is speaking as a character, the AI should respond as another character in the session
        if (speakingAs !== 'PLAYER') {
          const speakingAsCharacter = characters.find(char => char.id === speakingAs);
          // Find another character in the session to respond as (not the one the user is speaking as)
          const otherCharacters = characters.filter(char => char.id !== speakingAs);
          if (otherCharacters.length > 0) {
            aiResponder = otherCharacters[0].name; // Respond as the first other character
          } else {
            // If no other characters, respond as a generic Narrator
            aiResponder = 'Narrator';
          }
        } else {
          // If the user is speaking as the Player, the AI responds as the last character they interacted with
          const lastMessage = messages[messages.length - 1];
          const lastSpeaker = lastMessage?.speaker;
          if (lastSpeaker && lastSpeaker !== 'Player' && lastSpeaker !== 'Game Master') {
            aiResponder = lastSpeaker;
          } else if (characters.length > 0) {
            aiResponder = characters[0].name;
          }
        }
      }

      const context = campaign.description || 'A generic fantasy world.';
      const data = await apiClient.post('/api/chat', { messages: updatedMessages, character: aiResponder, context, systemPrompt });
      const aiMessage = { role: 'assistant', content: data.response, timestamp: new Date().toISOString(), speaker: aiResponder };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      await updateCampaignSession(campaignId, finalMessages);
    } catch (err) {
      setError('Failed to send message: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="chat-area">
        <div className="chat-header">
          <label>Speaking as: </label>
          <select value={speakingAs} onChange={(e) => setSpeakingAs(e.target.value)}>
            <option value="PLAYER">Player</option>
            {campaign.gmType === 'USER' && <option value="GM">Game Master</option>}
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
              className={`message ${msg.role === 'user' ? 'user-message' : 'ai-message'} ${
                msg.speaker === 'Game Master' ? 'gm-message' : ''
              }`}
            >
              <strong>{msg.speaker || 'Narrator'}</strong>{' '}
              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
              <p>{msg.content}</p>
            </div>
          ))}
          {isLoading && (
            <div className="message ai-message">
              <strong>
                {campaign.gmType === 'AI' ? 'Game Master' : characters.length > 0 ? characters[0].name : 'Narrator'}
              </strong>{' '}
              <span>{new Date().toLocaleTimeString()}</span>
              <p>Generating response...</p>
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
            disabled={isLoading}
          />
          <button onClick={handleSendMessage} disabled={isLoading}>
            Send
          </button>
        </div>
      </div>

      <Link to={`/worlds/${campaign.worldId}/campaigns`}>Back to Campaigns</Link>
    </div>
  );
}

export default CampaignSessionPage;