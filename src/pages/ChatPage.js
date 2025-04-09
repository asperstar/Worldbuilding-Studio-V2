// src/pages/ChatPage.js
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  loadCharacters,
  loadWorldById,
  loadEnvironments,
  loadCampaign,
  testStorage,
  loadCharacter
} from '../utils/storage';
import { processConversation, getCharacterMemories } from '../utils/memory/memoryManager';
import { enhanceCharacterAPI, getCharacterById } from '../utils/character/contextProcessor';
import { analyzeImage } from '../utils/visionAPI';


// At the top of your ChatPage.js, add these diagnostic logs
console.log("Environment variables:", {
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  NODE_ENV: process.env.NODE_ENV
});


// Add diagnostic function
async function testOllamaConnection() {
  const tests = [
    {
      name: "Basic Hello Test",
      prompt: "Say hello",
      options: {}
    },
    {
      name: "Simple Character Test",
      prompt: "You are a helpful assistant. User: Hello\nAssistant:",
      options: { temperature: 0.7, top_p: 0.9, num_predict: 50 }
    },
    {
      name: "Minimal Character Test",
      prompt: "You are Test. You are a test character.\nUser: Hi\nTest:",
      options: { temperature: 0.7, top_p: 0.9, num_predict: 50 }
    }
  ];

  const results = [];
  
  for (const test of tests) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "mistral",
          prompt: test.prompt,
          stream: false,
          options: test.options
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        results.push({
          test: test.name,
          status: response.status,
          error: `Status: ${response.status} - ${errorText}`
        });
        continue;
      }

      const data = await response.json();
      results.push({
        test: test.name,
        status: response.status,
        success: true,
        response: data.response.substring(0, 100) + "..."
      });
    } catch (error) {
      results.push({
        test: test.name,
        status: "Error",
        error: error.message
      });
    }
  }

  return results;
}
// In your ChatPage.js
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://my-backend-jet-two.vercel.app'
  : 'http://localhost:3002';
//to Claude (or ai): the above code is very sensative to change, any time I change it to anything else , it breaks the chat feature. please don't chnage it unless you want to help me troubleshoot it 

function ChatPage() {
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isApiEnabled, setIsApiEnabled] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [context, setContext] = useState(null);
  
  const testApiConnection = async () => {
    let claudeStatus = 'Disconnected';
    let claudeError = null;
  
    try {
      console.log('Testing Claude API connection...');
      
      const response = await fetch(`${API_URL}/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      console.log('Full response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        ok: response.ok
      });
      
      const data = await response.json();
      
      if (data.message === 'Server is running!') {
        claudeStatus = 'Connected';
        console.log('Local server connected successfully');
      } else {
        claudeError = 'Unexpected response from server';
        console.warn('Unexpected server response:', data);
      }
    } catch (error) {
      claudeError = `Error connecting to local server: ${error.message}`;
      console.error('Detailed API connection error:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    
    setMessages(prev => [...prev, {
      sender: 'system',
      text: `API Connection Status:\n- Claude API: ${claudeStatus}${claudeError ? `\n  Error: ${claudeError}` : ''}`,
      timestamp: new Date().toISOString()
    }]);
  };

  const sendMessage = async (message, character, contextData) => {
    try {
      if (!message || !message.trim()) {
        throw new Error('Message cannot be empty');
      }

      if (!character) {
        throw new Error('Character is required');
      }

      if (!contextData) {
        throw new Error('Context data is required');
      }

      const userMessageContent = message.trim();
      
      // Prepare conversation history string
      const historyString = contextData.conversationHistory
        ?.map(msg => `${msg.sender === 'user' ? 'User' : character.name}: ${msg.text}`)
        .join('\n') || '';
        
      // Prepare relationships string
      const relationshipsString = contextData.relationships
        ?.map(rel => `- ${rel.name} (${rel.relationship})`)
        .join('\n') || 'None';

      // Construct the full prompt with context
      const systemPrompt = `You are ${character.name}, a character in the world of ${contextData.world?.name || 'this world'}.
Personality: ${character.personality || 'Not defined'}
Background: ${character.background || 'Not defined'}
Goals: ${character.goals || 'Not defined'}
Traits: ${character.traits || 'Not defined'}

Relationships:
${relationshipsString}

World Information:
Name: ${contextData.world?.name || 'N/A'}
Description: ${contextData.world?.description || 'N/A'}
Rules: ${contextData.world?.rules || 'Standard fantasy rules apply.'}

Current Environment: ${contextData.environment?.name || 'An unknown location'} (${contextData.environment?.description || 'N/A'})

Current Campaign/Scene Context (if any):
Campaign: ${contextData.campaign?.name || 'N/A'}
Current Scene: ${contextData.campaign?.scenes?.[contextData.campaign.currentSceneIndex]?.title || 'N/A'}
Scene Description: ${contextData.campaign?.scenes?.[contextData.campaign.currentSceneIndex]?.description || 'N/A'}

Recent Conversation History (last 10 messages):
${historyString}

Now, respond to the user's message as ${character.name}. Be in character.`;

      // Log the request preparation
      console.log('Request preparation:', {
        messageContent: userMessageContent,
        messageLength: userMessageContent.length,
        systemPromptLength: systemPrompt.length,
        hasCharacter: !!character,
        characterName: character.name
      });

      // Create the request body
      const requestBody = {
        systemPrompt,
        userMessage: userMessageContent
      };

      // Make the request
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Server error response:', errorData);
        throw new Error(errorData?.error || `Server error: ${response.status}`);
      }

      // Parse the response
      const data = await response.json();
      console.log('Server response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Update messages with the response
      setMessages(prev => [...prev, {
        sender: character.name,
        text: data.response,
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  };

  const simplifiedCharacterAPI = async (message, character) => {
    try {
      // Build a minimal prompt with just essential character info
      const prompt = `${character.name}: ${message}`;
      
      // Create request body and log size
      const requestBody = { prompt };
      const requestSize = new Blob([JSON.stringify(requestBody)]).size;
      console.log(`Request payload size: ${requestSize} bytes`);
      console.log('Request body:', requestBody);
      
      // Create minimal request with explicit headers
      const response = await fetch('/api/claude-chat', {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(requestBody),
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit'
      });
      
      // Log request and response details
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries([...response.headers]));
      
      let data;
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      try {
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }
      
      if (!response.ok) {
        console.error('API error:', response.status, data);
        throw new Error(`API error: ${response.status} - ${data?.error || response.statusText}`);
      }
      
      if (!data.success) {
        console.error('API success false:', data);
        throw new Error(data.error || 'Unknown error');
      }
      
      return data.response;
    } catch (error) {
      console.error('API call failed:', error);
      return `I'm having trouble connecting right now. [Error: ${error.message}]`;
    }
  };

  const debugMemories = async () => {
    if (!selectedCharacter) {
      setMessages(prev => [...prev, {
        sender: 'system',
        text: 'Please select a character first',
        timestamp: new Date().toISOString()
      }]);
      return;
    }

    try {
      const memories = await getCharacterMemories(selectedCharacter.id);
      setMessages(prev => [...prev, {
        sender: 'system',
        text: `Memories for ${selectedCharacter.name}: ${JSON.stringify(memories, null, 2)}`,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        sender: 'system',
        text: `Error retrieving memories: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const generateGreeting = (character) => {
    const name = character.name;
    const personality = character.personality?.toLowerCase() || '';
    const traits = character.traits?.toLowerCase() || '';
    
    if (traits.includes('shy') || traits.includes('reserved') || personality.includes('shy')) {
      return `*${name} glances up briefly* Um... hello there. I'm ${name}.`;
    }
    
    if (traits.includes('arrogant') || traits.includes('proud') || personality.includes('arrogant')) {
      return `*${name} looks you over* Well, well. I suppose you wish to speak with me? I am ${name}, of course.`;
    }
    
    if (traits.includes('cheerful') || traits.includes('friendly') || personality.includes('cheerful')) {
      return `*${name} smiles brightly* Hey there! It's so great to meet you! I'm ${name}!`;
    }
    
    if (traits.includes('mysterious') || personality.includes('mysterious')) {
      return `*${name} regards you with an unreadable expression* Hello. You may call me ${name}.`;
    }
    
    return `Hello! I'm ${name}. It's nice to meet you.`;
  };

  const selectCharacter = useCallback((character, isReload = false) => {
    setSelectedCharacter(character);
    localStorage.setItem('selected-character-id', character.id.toString());
    
    const savedMessages = localStorage.getItem(`chat-messages-${character.id}`);
    
    if (savedMessages && (JSON.parse(savedMessages).length > 0 || isReload)) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([
        {
          sender: 'character',
          text: generateGreeting(character),
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const loadedCharacters = await loadCharacters();
        if (!Array.isArray(loadedCharacters)) {
          throw new Error('Characters data is not in the expected format');
        }
        setCharacters(loadedCharacters);
        
        // Try to restore selected character
        const savedCharacterId = localStorage.getItem('selected-character-id');
        if (savedCharacterId) {
          const character = loadedCharacters.find(c => c.id === savedCharacterId);
          if (character) {
            setSelectedCharacter(character);
          }
        }
      } catch (err) {
        console.error('Error loading characters:', err);
        setError(err.message);
        setMessages(prev => [...prev, {
          sender: 'system',
          text: `Error loading characters: ${err.message}`,
          timestamp: new Date().toISOString()
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCharacter) {
      localStorage.setItem(`chat-messages-${selectedCharacter.id}`, JSON.stringify(messages));
    }
  }, [messages, selectedCharacter]);
  
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const parseDocument = async (file) => {
    try {
      const fileType = file.name.split('.').pop().toLowerCase();
      
      if (fileType === 'txt' || fileType === 'md') {
        return await readFileAsText(file);
      } 
      else if (fileType === 'docx' || fileType === 'pdf') {
        const fileTypeUpper = fileType.toUpperCase();
        return `${fileTypeUpper} parsing is currently not supported in this deployment. For best results, please convert your ${fileTypeUpper} to a text (.txt) file and upload again.`;
      }
      else {
        return "Unsupported file type. Please upload a .txt, .md, .docx, or .pdf file.";
      }
    } catch (error) {
      console.error("Error parsing document:", error);
      return "Error parsing document: " + error.message;
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      setIsTyping(true);
      setUploadedFile(file);
      setIsProcessingFile(true);
      
      if (!selectedCharacter) {
        setMessages(prev => [...prev, {
          sender: 'system',
          text: `Please select a character before uploading files.`,
          timestamp: new Date().toISOString()
        }]);
        return;
      }
      
      if (file.type.startsWith('image/')) {
        try {
          setMessages(prev => [...prev, {
            sender: 'system',
            text: `Analyzing image ${file.name}...`,
            timestamp: new Date().toISOString()
          }]);
          
          const analysisResult = await analyzeImage(file);
          
          const imagePreviewUrl = URL.createObjectURL(file);
          
          setMessages(prev => [...prev, {
            sender: 'user',
            text: `[Uploaded image: ${file.name}]`,
            imageUrl: imagePreviewUrl,
            timestamp: new Date().toISOString()
          }]);
          
          if (isApiEnabled) {
            await processImageWithCharacter(analysisResult, file.name, imagePreviewUrl);
          }
        } catch (error) {
          console.error("Image analysis error:", error);
          setMessages(prev => [...prev, {
            sender: 'system',
            text: `Error analyzing image: ${error.message}`,
            timestamp: new Date().toISOString()
          }]);
        }
      } else {
        const content = await parseDocument(file);
        
        const contentLength = content.length;
        
        setMessages(prev => [...prev, {
          sender: 'system',
          text: `File uploaded: "${file.name}" (${(file.size / 1024).toFixed(1)} KB) - Successfully extracted ${contentLength} characters of text.`,
          timestamp: new Date().toISOString()
        }]);
        
        if (isApiEnabled && content) {
          await processDocumentWithCharacter(content, file.name);
        }
      }
    } catch (error) {
      console.error("File upload error:", error);
      setMessages(prev => [...prev, {
        sender: 'system',
        text: `Error uploading file: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
      setIsProcessingFile(false);
    }
  };

  const processImageWithCharacter = async (analysisData, fileName, imageUrl) => {
    // Validate required data
    if (!selectedCharacter || !analysisData || !fileName || !imageUrl) {
      setMessages(prev => [...prev, {
        sender: 'system',
        text: 'Missing required data for image processing',
        timestamp: new Date().toISOString()
      }]);
      return;
    }

    try {
      setIsTyping(true);
      
      // Format the conversation history
      const formattedMessages = messages.slice(-5).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
        timestamp: msg.timestamp
      }));

      // Create the user message about the image
      const userImageMessage = {
        role: 'user',
        content: `I've just shown you an image. Based on the analysis, this image contains: ${analysisData.description}`,
        timestamp: new Date().toISOString()
      };

      // Add the image message to the conversation history
      const updatedMessages = [...formattedMessages, userImageMessage];
      
      // Get the character's response
      const response = await enhanceCharacterAPI(
        selectedCharacter.id,
        userImageMessage.content,
        updatedMessages,
        {
          mode: 'chat',
          includeWorldInfo: true,
          includeMapInfo: true,
          worldId: selectedCharacter.worldId,
          imageUrl: imageUrl,
          imageAltText: `Image of ${fileName}`
        }
      );
      
      // Create the character's response message
      const characterMessage = {
        sender: 'character',
        text: response.response,
        timestamp: new Date().toISOString()
      };
      
      // Update the messages state
      setMessages(prev => [...prev, {
        sender: 'user',
        text: `[Showed an image: "${fileName}"]`,
        imageUrl: imageUrl,
        timestamp: new Date().toISOString()
      }, characterMessage]);
      
      // Process the conversation for memory
      await processConversation(selectedCharacter.id, [
        ...messages,
        {
          sender: 'user',
          text: `[Showed an image: "${fileName}"]`,
          imageUrl: imageUrl,
          timestamp: new Date().toISOString()
        },
        characterMessage
      ]);
      
    } catch (error) {
      console.error('Error processing image with character:', error);
      setMessages(prev => [...prev, {
        sender: 'system',
        text: `Error getting character's response to image: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const processDocumentWithCharacter = async (content, fileName) => {
    // Validate required data
    if (!selectedCharacter || !content || !fileName) {
      setMessages(prev => [...prev, {
        sender: 'system',
        text: 'Missing required data for document processing',
        timestamp: new Date().toISOString()
      }]);
      return;
    }

    try {
      setIsTyping(true);
      
      // Format the conversation history
      const formattedMessages = messages.slice(-5).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
        timestamp: msg.timestamp
      }));

      // Create the user message about the document
      const userDocumentMessage = {
        role: 'user',
        content: `I've just uploaded a document named "${fileName}". Please review it and share your thoughts: \n\n${content.substring(0, 8000)}`,
        timestamp: new Date().toISOString()
      };

      // Add the document message to the conversation history
      const updatedMessages = [...formattedMessages, userDocumentMessage];
      
      // Get the character's response
      const response = await enhanceCharacterAPI(
        selectedCharacter.id,
        userDocumentMessage.content,
        updatedMessages,
        {
          mode: 'chat',
          includeWorldInfo: true,
          includeMapInfo: true,
          worldId: selectedCharacter.worldId
        }
      );
      
      // Create the character's response message
      const characterMessage = {
        sender: 'character',
        text: response.response,
        timestamp: new Date().toISOString()
      };
      
      // Update the messages state
      setMessages(prev => [...prev, {
        sender: 'user',
        text: `[Uploaded document: "${fileName}"]`,
        timestamp: new Date().toISOString()
      }, characterMessage]);
      
      // Process the conversation for memory
      await processConversation(selectedCharacter.id, [
        ...messages,
        {
          sender: 'user',
          text: `[Uploaded document: "${fileName}"]`,
          timestamp: new Date().toISOString()
        },
        characterMessage
      ]);
      
    } catch (error) {
      console.error('Error processing document with character:', error);
      setMessages(prev => [...prev, {
        sender: 'system',
        text: `Error getting character's response to document: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedCharacter) return;

    const userMessageText = input.trim(); // Store and trim user input
    console.log("Sending message:", {
      message: userMessageText,
      characterId: selectedCharacter.id,
      characterName: selectedCharacter.name
    });

    const userMessage = {
      sender: 'user',
      text: userMessageText,
      timestamp: new Date().toISOString()
    };

    // Update messages state optimistically
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput(''); // Clear input after capturing
    setIsTyping(true);

    try {
      // --- Gather Context ---
      let currentContext = context; 
      // If context isn't loaded yet for the character, try loading it
      if (!currentContext || currentContext.character?.name !== selectedCharacter.name) {
         console.log("Context not loaded or outdated, attempting to load...");
         currentContext = await loadCharacterContext(selectedCharacter.id);
         if (!currentContext) {
           throw new Error("Failed to load character context before sending message.");
         }
      }

      console.log("Context loaded:", {
        hasWorld: !!currentContext.world,
        hasEnvironment: !!currentContext.environment,
        hasCampaign: !!currentContext.campaign,
        characterName: currentContext.character?.name
      });

      // Get last 10 messages (including the one we just added optimistically)
      const conversationHistory = updatedMessages.slice(-10); 

      // Load full relationship details
      let detailedRelationships = [];
      if (selectedCharacter.relationships && Array.isArray(selectedCharacter.relationships)) {
        detailedRelationships = await Promise.all(
          selectedCharacter.relationships.map(async (rel) => {
            try {
              const relatedChar = await loadCharacter(rel.characterId);
              return { 
                name: relatedChar?.name || 'Unknown Character', 
                relationship: rel.relationship 
              };
            } catch (err) {
              console.error(`Failed to load related character ${rel.characterId}:`, err);
              return { name: 'Unknown Character', relationship: rel.relationship };
            }
          })
        );
      }

      const contextData = {
        world: currentContext.world,
        environment: currentContext.environment,
        campaign: currentContext.campaign,
        relationships: detailedRelationships,
        conversationHistory: conversationHistory 
      };

      console.log("Sending to sendMessage with:", {
        messageLength: userMessageText.length,
        message: userMessageText,
        hasCharacter: !!selectedCharacter,
        hasContextData: !!contextData,
        contextDataKeys: Object.keys(contextData)
      });

      // Pass message text and context to sendMessage
      await sendMessage(userMessageText, selectedCharacter, contextData);

    } catch (error) {
      console.error('Message Send Error:', error);
      setMessages([...updatedMessages, { 
        sender: 'system',
        text: `Error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Function to load initial character context
  const loadCharacterContext = async (characterId) => {
    console.log(`Loading context for character ID: ${characterId}`);
    try {
      // Ensure we load the base character data first
      const character = await loadCharacter(characterId);
      if (!character) {
        console.error(`Character not found for ID: ${characterId}`);
        setError(`Character with ID ${characterId} not found.`);
        return null;
      }

      // Now load related data
      const memories = await getCharacterMemories(characterId);
      const worldContext = character.worldId ? await loadWorldById(character.worldId) : null;
      const environments = await loadEnvironments();
      const environmentContext = character.environmentId 
        ? environments.find(env => env.id === character.environmentId) : null;
      const campaignContext = character.campaignId ? await loadCampaign(character.campaignId) : null;

      const initialContext = {
        character: {
          name: character.name,
          personality: character.personality || '',
          background: character.background || '',
          goals: character.goals || '',
          traits: character.traits || '',
          relationships: character.relationships || []
        },
        world: worldContext,
        environment: environmentContext,
        campaign: campaignContext,
        memories: memories
      };

      console.log("Context loaded:", initialContext);
      setContext(initialContext);
      return initialContext;
    } catch (error) {
      console.error('Error loading character context:', error);
      setError(`Failed to load context: ${error.message}`);
      return null;
    }
  };

  // Update context when character changes
  useEffect(() => {
    if (selectedCharacter) {
      loadCharacterContext(selectedCharacter.id);
    } else {
      setContext(null);
    }
  }, [selectedCharacter]);

  return (
    <div className="chat-page">
      {isLoading ? (
        <div className="loading-message">Loading characters...</div>
      ) : error ? (
        <div className="error-message">
          Error: {error}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <>
          <div className="character-selector">
            <h2>Select a Character</h2>
            {Array.isArray(characters) && characters.length > 0 ? (
              <div className="character-list">
                {characters.map(char => (
                  <button
                    key={char.id}
                    className={`character-button ${selectedCharacter?.id === char.id ? 'selected' : ''}`}
                    onClick={() => selectCharacter(char)}
                  >
                    {char.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="no-characters">
                No characters available. Please create a character first.
              </div>
            )}
          </div>
          
          <div className="chat-container">
            <div className="chat-area">
              {selectedCharacter ? (
                <>
                  <div className="chat-header">
                    {selectedCharacter.imageUrl && (
                      <div className="character-avatar">
                        <img src={selectedCharacter.imageUrl} alt={selectedCharacter.name} />
                      </div>
                    )}
                    <h2>{selectedCharacter.name}</h2>
                  </div>
                  
                  <div className="messages-container">
                    {messages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`message ${msg.sender === 'user' ? 'user-message' : 
                                            msg.sender === 'system' ? 'system-message' : 
                                            'character-message'}`}
                      >
                        <div className="message-bubble">
                          {msg.text}
                          {msg.imageUrl && (
                            <div className="message-image">
                              <img src={msg.imageUrl} alt="Uploaded" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="message character-message">
                        <div className="message-bubble typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  <div className="message-input">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                    />
                    <button onClick={handleSendMessage}>Send</button>
                  </div>
                </>
              ) : (
                <div className="select-prompt">
                  <p>Select a character to start chatting</p>
                </div>
              )}
            </div>
            
            <div className="file-upload-section">
              <h3>Upload Document</h3>
              <p className="upload-info">Upload a document for {selectedCharacter?.name} to analyze.</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md,.docx,.pdf"
                style={{ display: 'none' }}
                id="document-upload"
              />
              <button 
                className="upload-button"
                onClick={() => fileInputRef.current.click()}
                disabled={isProcessingFile}
              >
                {isProcessingFile ? 'Processing...' : uploadedFile ? 'Replace File' : 'Upload File'}
              </button>
              {uploadedFile && (
                <div className="file-info">
                  <p>
                    <strong>Current file:</strong> {uploadedFile.name}
                    <small>({(uploadedFile.size / 1024).toFixed(1)} KB)</small>
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="debug-actions">
            <button onClick={testApiConnection}>Test API Connection</button>
            <button onClick={debugMemories}>Debug Memories</button>
          </div>
          
          <button 
            onClick={async () => {
              setIsTyping(true);
              try {
                const results = await testOllamaConnection();
                const resultText = results.map(r => 
                  `Test: ${r.test}\nStatus: ${r.status}\n${r.success ? `Response: ${r.response}` : `Error: ${r.error}`}`
                ).join('\n\n');
                
                setMessages(prev => [...prev, {
                  sender: 'system',
                  text: `Ollama Diagnostic Results:\n\n${resultText}`,
                  timestamp: new Date().toISOString()
                }]);
              } catch (error) {
                setMessages(prev => [...prev, {
                  sender: 'system',
                  text: `Diagnostic Error: ${error.message}`,
                  timestamp: new Date().toISOString()
                }]);
              } finally {
                setIsTyping(false);
              }
            }}
          >
            Run Ollama Diagnostics
          </button>
        </>
      )}
    </div>
  );
}

export default ChatPage;