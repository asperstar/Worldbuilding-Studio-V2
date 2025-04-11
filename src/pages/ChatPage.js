import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import apiClient from '../utils/apiClient'; 

const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://my-backend-jet-two.vercel.app'
  : 'http://localhost:3002';

function ChatPage() {
  const { currentUser, getAllCharacters } = useStorage();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      if (!currentUser || !currentUser.uid) {
        setError('User not authenticated. Please log in.');
        navigate('/login');
        return;
      }

      try {
        setIsLoading(true);
        const loadedCharacters = await getAllCharacters();
        setCharacters(loadedCharacters || []);
      } catch (err) {
        setError('Failed to load characters: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacters();
  }, [currentUser, getAllCharacters, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    setMessages([
      {
        sender: 'character',
        text: `Hello! I'm ${character.name}. It's nice to meet you.`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedCharacter) return;
  
    const userMessage = { sender: 'user', text: input, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
  
    try {
      const systemPrompt = `You are ${selectedCharacter.name}, a character with the following traits: ${selectedCharacter.traits || 'none'}. Your personality is: ${selectedCharacter.personality || 'neutral'}. Respond as this character would.`;
      const data = await apiClient.post('/chat', { systemPrompt, userMessage: input });
      const characterMessage = { sender: 'character', text: data.response, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, characterMessage]);
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
    return <div>Loading characters...</div>;
  }

  return (
    <div className="chat-page">
      <h1>Character Chat</h1>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

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
                  onClick={() => handleCharacterSelect(char)}
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
              <h2>{selectedCharacter.name}</h2>
              <div className="messages">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message ${msg.sender === 'user' ? 'user-message' : 'character-message'}`}
                  >
                    <strong>{msg.sender === 'user' ? 'You' : selectedCharacter.name}</strong>{' '}
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    <p>{msg.text}</p>
                  </div>
                ))}
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
            </>
          ) : (
            <p>Please select a character to start chatting.</p>
          )}
        </div>
      </div>

      <Link to="/dashboard">Back to Dashboard</Link>
    </div>
  );
}

export default ChatPage;