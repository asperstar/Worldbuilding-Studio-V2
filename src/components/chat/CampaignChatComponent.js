// src/components/chat/CampaignChatComponent.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStorage } from '../../contexts/StorageContext';
import { enhanceCharacterAPI } from '../../utils/character/updatedContextProcessor';
import campaignMemoryManager from '../../utils/memory/campaignMemoryIntegration';
import aiConfig from '../../utils/aiConfig';

const CampaignChatComponent = () => {
  const { campaignId } = useParams();
  const { currentUser, getCampaignById, getCharacterById } = useStorage();
  const [campaign, setCampaign] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState({ active: false, messageIndex: null });
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Load campaign data
  useEffect(() => {
    const loadCampaignData = async () => {
      if (!currentUser || !campaignId) return;

      try {
        setIsLoading(true);
        const loadedCampaign = await getCampaignById(campaignId);
        
        if (!loadedCampaign) {
          setError('Campaign not found');
          return;
        }
        
        setCampaign(loadedCampaign);
        
        // Load campaign characters
        if (loadedCampaign.participantIds && loadedCampaign.participantIds.length > 0) {
          const characterData = [];
          for (const charId of loadedCampaign.participantIds) {
            const char = await getCharacterById(charId);
            if (char) characterData.push(char);
          }
          setCharacters(characterData);
        }
        
        // Load saved messages if available
        if (loadedCampaign.sessionMessages && loadedCampaign.sessionMessages.length > 0) {
          setMessages(loadedCampaign.sessionMessages);
        }
      } catch (err) {
        console.error('Error loading campaign:', err);
        setError('Failed to load campaign data: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaignData();
  }, [currentUser, campaignId, getCampaignById, getCharacterById]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Select a character to speak as
  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
  };

  // Send a message
  const handleSendMessage = async () => {
    if (!input.trim() || !selectedCharacter || !campaign) return;

    // Add user message to the conversation
    const userMessage = {
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString(),
      senderName: 'Player'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGeneratingResponse(true);
    setError(null);

    try {
      // Get current campaign context
      const campaignContext = {
        name: campaign.name,
        description: campaign.description || '',
        currentScene: campaign.scenes?.[campaign.currentSceneIndex || 0] || null
      };
      
      // Enrich campaign context with important memories
      const enrichedContext = await campaignMemoryManager.enrichCampaignContext(
        campaignId,
        campaignContext
      );

      // Use the enhanced API with campaign context
      const result = await enhanceCharacterAPI(
        selectedCharacter.id,
        input,
        messages,
        {
          temperature: 0.7,
          campaignId: campaignId,
          enrichedContext: enrichedContext
        }
      );
      
      // Add character's response to the conversation
      const characterMessage = {
        sender: 'character',
        text: result.response,
        timestamp: new Date().toISOString(),
        senderName: selectedCharacter.name,
        characterId: selectedCharacter.id
      };
      
      const updatedMessages = [...messages, userMessage, characterMessage];
      setMessages(updatedMessages);
      
      // Process this interaction for campaign memories
      await campaignMemoryManager.processCampaignInteraction(
        campaignId,
        selectedCharacter.id,
        selectedCharacter.name,
        characterMessage.text,
        campaign.participantIds || []
      );
      
      // Extract campaign insights
      await campaignMemoryManager.extractCampaignInsights(
        campaignId,
        selectedCharacter.id,
        updatedMessages,
        selectedCharacter.name
      );
      
      // Update campaign session messages
      if (campaign && campaign.id) {
        // This would call your campaign update function
        // For example: await updateCampaignSession(campaignId, updatedMessages);
        console.log('Updated campaign session messages');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message: ' + err.message);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Edit a message
  const handleEditMessage = (index) => {
    setEditMode({ active: true, messageIndex: index });
    setInput(messages[index].text);
  };

  // Update an edited message
  const handleUpdateMessage = () => {
    if (!input.trim()) return;
    
    setMessages(prev => {
      const updated = [...prev];
      updated[editMode.messageIndex] = {
        ...updated[editMode.messageIndex],
        text: input,
        edited: true,
        timestamp: new Date().toISOString()
      };
      return updated;
    });
    
    setInput('');
    setEditMode({ active: false, messageIndex: null });
    
    // You might want to add logic here to update the campaign session messages
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setInput('');
    setEditMode({ active: false, messageIndex: null });
  };

  // Regenerate a response
  const handleRegenerateResponse = async (index) => {
    // Identify the user message that prompted this response
    const userMessageIndex = messages.findIndex((msg, i) => 
      i < index && msg.sender === 'user'
    );
    
    if (userMessageIndex === -1) {
      setError('Could not find corresponding user message');
      return;
    }

    const userMessage = messages[userMessageIndex].text;
    const characterId = messages[index].characterId || selectedCharacter?.id;
    
    if (!characterId) {
      setError('No character identified for this message');
      return;
    }
    
    // Get the character object
    const character = characters.find(c => c.id === characterId);
    if (!character) {
      setError('Character not found');
      return;
    }

    setIsGeneratingResponse(true);
    setError(null);

    try {
      // Get conversation history up to the user message
      const conversationHistory = messages.slice(0, userMessageIndex);
      
      // Use the enhanced API to regenerate
      const result = await enhanceCharacterAPI(
        characterId,
        userMessage,
        conversationHistory,
        { 
          temperature: 0.8,
          campaignId: campaignId
        }
      );
      
      // Update the message
      setMessages(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          text: result.response,
          regenerated: true,
          timestamp: new Date().toISOString()
        };
        return updated;
      });
    } catch (err) {
      setError('Failed to regenerate response: ' + err.message);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading campaign session...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/campaigns')}>Back to Campaigns</button>
      </div>
    );
  }

  return (
    <div className="campaign-chat-container">
      <div className="campaign-header">
        <h1>{campaign?.name || 'Campaign Chat'}</h1>
        <div className="campaign-info">
          {campaign?.description && <p>{campaign.description}</p>}
          <div className="current-scene">
            <h3>Current Scene: {campaign?.scenes?.[campaign.currentSceneIndex || 0]?.title || 'Unknown'}</h3>
            <p>{campaign?.scenes?.[campaign.currentSceneIndex || 0]?.description || 'No description'}</p>
          </div>
        </div>
        <div className="ai-provider-info">
          <span>AI Provider: {aiConfig.currentProvider.name}</span>
          {aiConfig.currentProvider.requiresApiKey && !aiConfig.isApiKeyConfigured() && (
            <span className="warning">API Key not configured!</span>
          )}
        </div>
      </div>

      <div className="chat-area">
        <div className="character-selection">
          <h2>Characters</h2>
          <div className="character-list">
            {characters.length === 0 ? (
              <p>No characters available in this campaign</p>
            ) : (
              characters.map(char => (
                <div 
                  key={char.id} 
                  className={`character-item ${selectedCharacter?.id === char.id ? 'selected' : ''}`}
                  onClick={() => handleCharacterSelect(char)}
                >
                  <div className="character-avatar">
                    {char.imageUrl ? (
                      <img src={char.imageUrl} alt={char.name} />
                    ) : (
                      <div className="avatar-placeholder">{char.name[0]}</div>
                    )}
                  </div>
                  <div className="character-name">{char.name}</div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="messages-container">
          <div className="messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <p>Select a character and start the conversation</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`message ${msg.sender === 'user' ? 'user-message' : 'character-message'}`}
                >
                  <div className="message-header">
                    <strong>{msg.senderName || (msg.sender === 'user' ? 'Player' : 'Character')}</strong>
                    <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    {msg.edited && <span className="edited-tag">edited</span>}
                    {msg.regenerated && <span className="regenerated-tag">regenerated</span>}
                  </div>
                  <div className="message-body">{msg.text}</div>
                  <div className="message-actions">
                    {msg.sender === 'user' && (
                      <button 
                        className="edit-button"
                        onClick={() => handleEditMessage(index)}
                      >
                        Edit
                      </button>
                    )}
                    {msg.sender === 'character' && (
                      <button 
                        className="regenerate-button"
                        onClick={() => handleRegenerateResponse(index)}
                        disabled={isGeneratingResponse}
                      >
                        Regenerate
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {isGeneratingResponse && (
              <div className="message character-message">
                <div className="message-header">
                  <strong>{selectedCharacter?.name || 'Character'}</strong>
                  <span className="timestamp">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="message-body typing-indicator">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="input-area">
            {selectedCharacter ? (
              <>
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={editMode.active 
                    ? "Edit your message..." 
                    : `Speak to ${selectedCharacter.name}...`}
                  disabled={isGeneratingResponse && !editMode.active}
                />
                
                {editMode.active ? (
                  <div className="edit-buttons">
                    <button 
                      className="update-button"
                      onClick={handleUpdateMessage}
                    >
                      Update
                    </button>
                    <button 
                      className="cancel-button"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    className="send-button"
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isGeneratingResponse}
                  >
                    Send
                  </button>
                )}
              </>
            ) : (
              <div className="select-character-prompt">
                <p>Please select a character to chat with</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignChatComponent;