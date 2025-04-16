// src/pages/UpdatedChatPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';

// Import the updated context processor
import { getCharacterById, enhanceCharacterAPI } from '../utils/character/updatedContextProcessor';

function UpdatedChatPage() {
  const { currentUser, getAllCharacters } = useStorage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCharacterId = searchParams.get('characterId');
  
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState({ active: false, messageIndex: null });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      if (!currentUser || !currentUser.uid) {
        setError('User not authenticated. Please log in.');
        navigate('/login');
        return;
      }

      try {
        setIsLoadingCharacters(true);
        const loadedCharacters = await getAllCharacters();
        setCharacters(loadedCharacters || []);
        
        // If there's an initial character ID in the URL, select that character
        if (initialCharacterId) {
          handleCharacterSelect(initialCharacterId);
        }
      } catch (err) {
        setError('Failed to load characters: ' + err.message);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    fetchCharacters();
  }, [currentUser, getAllCharacters, navigate, initialCharacterId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCharacterSelect = async (characterId) => {
    try {
      console.log(`Selecting character with ID: ${characterId}`);
      const character = await getCharacterById(characterId);
      if (character) {
        console.log(`Character selected: ${character.name}, ID: ${character.id}`);
        setSelectedCharacter(character);
        // Clear previous conversation when selecting a new character
        setMessages([]);
      } else {
        console.error(`Character not found: ${characterId}`);
        setError('Character not found. Please select another character.');
      }
    } catch (error) {
      console.error('Error selecting character:', error);
      setError('Failed to select character: ' + error.message);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedCharacter) return;
  
    const userMessage = { sender: 'user', text: input, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsGeneratingResponse(true);
    setError(null);
  
    try {
      // Use the enhanced API for better character responses
      const result = await enhanceCharacterAPI(
        selectedCharacter.id,
        input,
        messages,
        { temperature: 0.7 }
      );
      
      const characterMessage = { 
        sender: 'character', 
        text: result.response, 
        timestamp: new Date().toISOString() 
      };
      
      setMessages((prev) => [...prev, characterMessage]);
    } catch (err) {
      setError('Failed to send message: ' + err.message);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEditMessage = (index) => {
    setEditMode({ active: true, messageIndex: index });
    setInput(messages[index].text);
  };

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
  };

  const handleCancelEdit = () => {
    setInput('');
    setEditMode({ active: false, messageIndex: null });
  };

  const handleRegenerateResponse = async (index) => {
    // Find the user message that prompted this response
    const userMessageIndex = index - 1;
    if (userMessageIndex < 0 || messages[userMessageIndex].sender !== 'user') {
      setError('Could not find corresponding user message');
      return;
    }

    const userMessage = messages[userMessageIndex].text;
    setIsGeneratingResponse(true);
    setError(null);

    try {
      // Get conversation history up to this point
      const conversationHistory = messages.slice(0, userMessageIndex);
      
      // Use the enhanced API to regenerate
      const result = await enhanceCharacterAPI(
        selectedCharacter.id,
        userMessage,
        conversationHistory,
        { temperature: 0.8 } // Slightly higher temperature for variety
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

  return (
    <div className="chat-page">
      <h1>Character Chat</h1>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {isLoadingCharacters ? (
        <div>Loading characters...</div>
      ) : (
        <div className="chat-container">
          <div className="character-selection">
            <h2>Select a Character</h2>
            {characters.length === 0 ? (
              <p>
                No characters found. <Link to="/characters">Create one</Link> to start chatting.
              </p>
            ) : (
              <ul className="character-list">
                {characters.map((char) => (
                  <li
                    key={char.id}
                    className={`character-item ${selectedCharacter?.id === char.id ? 'selected' : ''}`}
                    onClick={() => handleCharacterSelect(char.id)}
                  >
                    {char.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="chat-area">
            {selectedCharacter ? (
              <>
                <div className="character-chat-header">
                  <h2>{selectedCharacter.name}</h2>
                  {selectedCharacter.personality && (
                    <p className="character-personality">{selectedCharacter.personality}</p>
                  )}
                </div>
                <div className="messages">
                  {messages.length === 0 ? (
                    <div className="empty-conversation">
                      <p>Start chatting with {selectedCharacter.name}</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`message ${msg.sender === 'user' ? 'user-message' : 'character-message'}`}
                      >
                        <div className="message-header">
                          <strong>{msg.sender === 'user' ? 'You' : selectedCharacter.name}</strong>{' '}
                          <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          {msg.edited && <span className="edited-tag">(edited)</span>}
                          {msg.regenerated && <span className="regenerated-tag">(regenerated)</span>}
                        </div>
                        <p>{msg.text}</p>
                        <div className="message-actions">
                          {msg.sender === 'user' && (
                            <button 
                              onClick={() => handleEditMessage(index)}
                              className="edit-message-btn"
                            >
                              Edit
                            </button>
                          )}
                          {msg.sender === 'character' && (
                            <button 
                              onClick={() => handleRegenerateResponse(index)}
                              className="regenerate-btn"
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
                      <strong>{selectedCharacter.name}</strong>{' '}
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
                    placeholder={editMode.active 
                      ? "Edit your message..." 
                      : `Type your message to ${selectedCharacter.name}...`}
                    disabled={isGeneratingResponse && !editMode.active}
                  />
                  {editMode.active ? (
                    <div className="edit-buttons">
                      <button onClick={handleUpdateMessage}>
                        Update
                      </button>
                      <button onClick={handleCancelEdit} className="cancel-btn">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleSendMessage} disabled={isGeneratingResponse}>
                      {isGeneratingResponse ? 'Sending...' : 'Send'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="select-character-prompt">Please select a character to start chatting.</p>
            )}
          </div>
        </div>
      )}

      <Link to="/dashboard" className="back-link">Back to Dashboard</Link>
    </div>
  );
}

export default UpdatedChatPage;