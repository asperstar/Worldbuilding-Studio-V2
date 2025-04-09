// src/pages/ChatPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { loadCharacters } from '../utils/storage';


// Use a relative URL to leverage the proxy in development
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://my-backend-jet-two.vercel.app'
  : ''; // Empty string means relative URL (e.g., /chat), which uses the proxy

function ChatPage() {
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Load characters on mount
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const loadedCharacters = await loadCharacters();
        setCharacters(loadedCharacters);
      } catch (err) {
        setError('Failed to load characters: ' + err.message);
      }
    };
    fetchCharacters();
  }, []);

  // Scroll to the bottom of the chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    setMessages([
      {
        sender: 'character',
        text: `Hello! I'm ${character.name}. It's nice to meet you.`,
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedCharacter) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const systemPrompt = `You are ${selectedCharacter.name}, a character with the following traits: ${selectedCharacter.traits || 'none'}. Your personality is: ${selectedCharacter.personality || 'neutral'}. Respond as this character would.`;
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userMessage: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      const characterMessage = { sender: 'character', text: data.response };
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
                    {msg.text}
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
    </div>
  );
}

export default ChatPage;