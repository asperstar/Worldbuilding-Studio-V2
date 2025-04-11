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

        // Fetch characters based on participantIds
        if (loadedCampaign.participantIds && loadedCampaign.participantIds.length > 0) {
          const campaignCharacters = await getCharacters(null); // Fetch all characters
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

    const userMessage = { role: 'user', content: input, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const characterName = characters.length > 0 ? characters[0].name : 'Narrator';
      const context = campaign.description || 'A generic fantasy world.';
      const data = await apiClient.post('/api/chat', { messages: updatedMessages, character: characterName, context });
      const aiMessage = { role: 'assistant', content: data.response, timestamp: new Date().toISOString() };
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
        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <strong>{msg.role === 'user' ? 'Player' : (characters.length > 0 ? characters[0].name : 'Narrator')}</strong>{' '}
              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
              <p>{msg.content}</p>
            </div>
          ))}
          {isLoading && (
            <div className="message ai-message">
              <strong>{characters.length > 0 ? characters[0].name : 'Narrator'}</strong>{' '}
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
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <Link to={`/worlds/${campaign.worldId}/campaigns`}>Back to Campaigns</Link>
    </div>
  );
}

export default CampaignSessionPage;