// eslint-disable-next-line no-unused-vars

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import { getCharacterById, enhanceCharacterAPI } from '../utils/character/updatedContextProcessor';

function ChatPage() {
  const { currentUser, getAllCharacters } = useStorage();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
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
        setIsLoadingCharacters(true);
        const loadedCharacters = await getAllCharacters();
        setCharacters(loadedCharacters || []);
      } catch (err) {
        setError('Failed to load characters: ' + err.message);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    fetchCharacters();
  }, [currentUser, getAllCharacters, navigate]);

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
        setMessages([]); // Reset messages when selecting a new character
      } else {
        console.error(`Character not found: ${characterId}`);
        setError('Character not found. Please select another character.');
      }
    } catch (error) {
      console.error('Error selecting character:', error);
      setError('Failed to select character.');
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
      const result = await enhanceCharacterAPI(
        selectedCharacter.id,
        input,
        messages,
        { temperature: 0.7 }
      );

      const characterMessage = {
        sender: 'character',
        text: result.response,
        timestamp: new Date().toISOString(),
        memoryId: null, // Placeholder for memory ID (for future memory-wiping feature)
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

  const handleEditResponse = (index, newText) => {
    const updatedMessages = [...messages];
    updatedMessages[index] = { ...updatedMessages[index], text: newText, edited: true };
    setMessages(updatedMessages);
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
                <h2>{selectedCharacter.name}</h2>
                <div className="messages">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`message ${msg.sender === 'user' ? 'user-message' : 'character-message'}`}
                    >
                      <strong>{msg.sender === 'user' ? 'You' : selectedCharacter.name}</strong>{' '}
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
                  {isGeneratingResponse && (
                    <div className="message character-message">
                      <strong>{selectedCharacter.name}</strong>{' '}
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
                    disabled={isGeneratingResponse}
                  />
                  <button onClick={handleSendMessage} disabled={isGeneratingResponse}>
                    {isGeneratingResponse ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </>
            ) : (
              <p>Please select a character to start chatting.</p>
            )}
          </div>
        </div>
      )}

      <Link to="/dashboard">Back to Dashboard</Link>
    </div>
  );
}

export default ChatPage;