// src/utils/character/updatedContextProcessor.js
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getCharacterMemories } from '../memory/memoryManager';

/**
 * Enhances character responses using appropriate API, incorporating character info and memory
 * @param {string} characterId - The ID of the character responding
 * @param {string} userInput - The user's input message
 * @param {Array} previousMessages - Array of previous messages in the conversation
 * @param {Object} options - Options for API call configuration
 * @returns {Promise<Object>} - The response object with the AI's reply
 */
export const enhanceCharacterAPI = async (characterId, userInput, previousMessages, options = {}) => {
  try {
    const {
      temperature = 0.7,
      campaignId,
      enrichedContext = {},
      worldContext = null,
      isGameMaster = false,
      gmPrompt = 'You are a Game Master narrating a fantasy campaign.',
      rpMode = 'lax',
    } = options;

    // Handle Game Master special case
    let character;
    if (characterId === 'GM' || isGameMaster) {
      character = {
        id: 'GM',
        name: 'Game Master',
        personality: 'An engaging and fair Game Master who narrates the campaign, describes scenes, controls NPCs, and guides the story.',
        background: 'As the Game Master, you manage the game world and create an immersive experience for the players.',
        appearance: 'The omniscient narrator and guide of the campaign.',
        traits: 'Fair, creative, descriptive, adaptable',
        isGameMaster: true,
      };
    } else {
      character = await getCharacterById(characterId);
      if (!character) {
        throw new Error(`Character with ID ${characterId} not found`);
      }
    }

    // Process memories if not in a campaign
    let memories = '';
    if (!campaignId) {
      try {
        const characterMemories = await getCharacterMemories(characterId);
        memories = characterMemories.map(memory =>
          `${memory.content} (${memory.metadata?.type || 'memory'}, importance: ${memory.metadata?.importance || 5})`
        ).join('\n');
      } catch (memoryError) {
        console.error('Error fetching memories:', memoryError);
        memories = 'Unable to retrieve memories at this time.';
      }
    }

    // Format previous messages
    const historyMessages = previousMessages
      .slice(-5)
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text || msg.content,
      }));

    // Build contextual information
    let contextualInfo = '';
    let characterInfo = '';

    if (character.isGameMaster || isGameMaster) {
      characterInfo = gmPrompt;

      if (worldContext) {
        contextualInfo += `\nWorld Information:\nName: ${worldContext.name}\n`;
        if (worldContext.description) contextualInfo += `Description: ${worldContext.description}\n`;
        if (worldContext.rules) contextualInfo += `Rules: ${worldContext.rules}\n`;
        if (worldContext.lore) contextualInfo += `Lore: ${worldContext.lore}\n`;
      }

      if (enrichedContext) {
        if (enrichedContext.name) contextualInfo += `\nCampaign: ${enrichedContext.name}\n`;
        if (enrichedContext.description) contextualInfo += `Campaign Description: ${enrichedContext.description}\n`;

        if (enrichedContext.currentScene) {
          const scene = enrichedContext.currentScene;
          contextualInfo += `\nCurrent Scene: ${scene.title || 'Current scene'}\n`;
          if (scene.description) contextualInfo += `Scene Description: ${scene.description}\n`;
        }

        if (enrichedContext.importantMemories) {
          contextualInfo += `\nImportant Campaign Events:\n${enrichedContext.importantMemories}\n`;
        }
      }
    } else {
      characterInfo = `You are roleplaying as ${character.name}.`;
      if (character.personality) characterInfo += `\nPersonality: ${character.personality}`;
      if (character.background) characterInfo += `\nBackground: ${character.background}`;
      if (character.traits) characterInfo += `\nTraits: ${character.traits}`;
      if (character.appearance) characterInfo += `\nAppearance: ${character.appearance}`;

      if (memories.length > 0) {
        contextualInfo += `\nMemories:\n${memories}\n`;
      }
    }

    // Add mode-specific instructions
    const modePrompt = rpMode === 'family-friendly'
      ? `\nAvoid any sexual content, violence, or morally ambiguous themes. Respond with a positive, safe tone.`
      : `\nAvoid sexual content, but you may include violent or morally ambiguous themes as appropriate to your character.`;

    // Build complete system prompt
    const systemPrompt = `${characterInfo}${modePrompt}\n\n${contextualInfo}\n\nConversation History:\n${historyMessages.length > 0 ? historyMessages.map(msg => `${msg.role === 'user' ? 'User' : character.name}: ${msg.content}`).join('\n') : 'No previous conversation'}`;

    // Construct Grok messages
    const grokMessages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: userInput }
    ];

    console.log('Sending request to Grok API with character:', character.name);

    // Use the configured API URL from environment or fallback to relative path
    const API_URL = process.env.REACT_APP_API_URL || '';
    
    // Make the request to your backend API that forwards to Grok
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: grokMessages,
        character: character.name,
        useGrok3: true, // Explicitly request Grok 3
        temperature: temperature
      }),
      // Add a timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      console.error('Empty response from API:', data);
      throw new Error('Received empty response from AI service');
    }

    return {
      response: data.response,
      character: character,
      source: 'grok3-api',
    };
  } catch (error) {
    console.error('Error in enhanceCharacterAPI:', error);
    
    // Provide a meaningful error message to the user
    if (error.name === 'AbortError') {
      return {
        response: "I'm sorry, but the request timed out. Please try again in a moment.",
        error: "Request timeout",
      };
    } else if (error.message.includes('not found')) {
      return {
        response: "I couldn't find this character in the database. Please refresh the page and try again.",
        error: error.message,
      };
    } else {
      return {
        response: "I'm having trouble connecting to my knowledge base right now. Please try again in a few moments.",
        error: error.message,
      };
    }
  }
};

export async function getCharacterById(characterId) {
  console.log(`Fetching character with ID: ${characterId}`);

  // Special case for Game Master
  if (characterId === 'GM') {
    console.log('Creating special GM character');
    return {
      id: 'GM',
      name: 'Game Master',
      personality: 'An engaging and fair Game Master who narrates the campaign, describes scenes, controls NPCs, and guides the story.',
      background: 'As the Game Master, you manage the game world and create an immersive experience for the players.',
      appearance: 'The omniscient narrator and guide of the campaign.',
      traits: 'Fair, creative, descriptive, adaptable',
      isGameMaster: true,
    };
  }

  // Handle null or undefined characterId
  if (!characterId) {
    console.error('Character ID is null or undefined');
    return null;
  }

  try {
    const db = getFirestore();
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const idVariations = [
      characterId,
      `char_${characterId}`,
      characterId.startsWith('char_') ? characterId.replace('char_', '') : `char_${characterId}`,
      characterId.substring(5),
    ];

    let character = null;
    for (const idToTry of idVariations) {
      console.log(`Trying ID variation: ${idToTry}`);
      try {
        const docRef = doc(db, `users/${userId}/characters`, idToTry);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          character = { id: docSnap.id, ...docSnap.data() };
          console.log(`Found character using ID format: ${idToTry}`);
          return character;
        }
      } catch (error) {
        console.warn(`Error fetching character with ID ${idToTry}:`, error);
      }
    }

    console.log(`Falling back to matching by name for ID: ${characterId}`);
    try {
      const q = query(collection(db, `users/${userId}/characters`), where('name', '==', characterId));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        if (doc.exists()) {
          character = { id: doc.id, ...doc.data() };
          console.log(`Found character by name: ${characterId}, ID: ${doc.id}`);
        }
      });
    } catch (error) {
      console.warn(`Error searching for character by name ${characterId}:`, error);
    }

    return character;
  } catch (error) {
    console.error(`Error in getCharacterById for ID ${characterId}:`, error);
    return null;
  }
}