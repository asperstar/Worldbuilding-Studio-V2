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
      worldContext = null, // Only used for campaigns, not regular chat
      isGameMaster = false,
      gmPrompt = 'You are a Game Master narrating a fantasy campaign.',
      rpMode = 'lax', // Default to lax mode if not specified
    } = options;

    // Fetch complete character details
    const character = await getCharacterById(characterId);
    if (!character) {
      throw new Error(`Character with ID ${characterId} not found`);
    }

    // Prepare character memories if not in a campaign
    let memories = '';
    if (!campaignId) {
      try {
        // Get memories relevant to the conversation
        const characterMemories = await getCharacterMemories(characterId);
        // Format memories as strings
        memories = characterMemories.map(memory => 
          `${memory.content} (${memory.metadata?.type || 'memory'}, importance: ${memory.metadata?.importance || 5})`
        ).join('\n');
      } catch (memoryError) {
        console.error('Error fetching memories:', memoryError);
      }
    }

    // Prepare the conversation history
    const historyText = previousMessages
      .slice(-5) // Only use last 5 messages for context
      .map(msg => {
        const speaker = msg.speaker || (msg.sender === 'user' ? 'User' : character.name);
        return `${speaker}: ${msg.text || msg.content}`;
      })
      .join('\n');

    // Build appropriate context based on whether this is a campaign or regular chat
    let contextualInfo = '';
    let characterInfo = '';
    
    if (isGameMaster) {
      // Game Master mode (for campaigns)
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
      // Regular character mode
      characterInfo = `You are ${character.name}.`;
      if (character.personality) characterInfo += `\nPersonality: ${character.personality}`;
      if (character.background) characterInfo += `\nBackground: ${character.background}`;
      if (character.traits) characterInfo += `\nTraits: ${character.traits}`;
      if (character.appearance) characterInfo += `\nAppearance: ${character.appearance}`;
      
      // For chat, we don't add world context
      if (memories.length > 0) {
        contextualInfo += `\nMemories:\n${memories}\n`;
      }
    }
    
    // Add RP mode guidance
    const modePrompt = rpMode === 'family-friendly'
      ? `\nAvoid any sexual content, violence, or morally ambiguous themes. Respond with a positive, safe tone.`
      : `\nAvoid sexual content, but you may include violent or morally ambiguous themes as appropriate to your character.`;
    
    // Assemble the complete prompt
    const fullPrompt = `${characterInfo}${modePrompt}\n\n${contextualInfo}\n\nConversation History:\n${historyText || 'No previous conversation'}\n\n${isGameMaster ? 'Player' : 'User'}: ${userInput}\n\n${character.name}:`;

    console.log('Sending prompt to API:', fullPrompt);
    
    // Call API to generate response
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemPrompt: fullPrompt,
        userMessage: userInput,
        temperature: temperature,
        maxTokens: 800
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();

    return {
      response: data.response || "I'm having trouble responding right now.",
      character: character,
      source: 'api',
    };
  } catch (error) {
    console.error('Error in enhanceCharacterAPI:', error);
    // Provide a graceful fallback response
    return {
      response: "I'm having trouble responding right now. Please try again later.",
      error: error.message
    };
  }
};

// Keep the existing getCharacterById function
export async function getCharacterById(characterId) {
    console.log(`Fetching character with ID: ${characterId}`);
    
    // Special case for GM
    if (characterId === 'GM') {
      console.log('Creating special GM character');
      return {
        id: 'GM',
        name: 'Game Master',
        personality: 'An engaging and fair Game Master who narrates the campaign, describes scenes, controls NPCs, and guides the story.',
        background: 'As the Game Master, you manage the game world and create an immersive experience for the players.',
        appearance: 'The omniscient narrator and guide of the campaign.',
        traits: 'Fair, creative, descriptive, adaptable',
        isGameMaster: true
      };
    }
    
    const db = getFirestore();
    const idVariations = [
      characterId,
      `char_${characterId}`,
      characterId.startsWith('char_') ? characterId.replace('char_', '') : `char_${characterId}`,
      characterId.substring(5),
    ];
    
    let character = null;
    for (const idToTry of idVariations) {
      console.log(`Trying ID variation: ${idToTry}`);
      const docRef = doc(db, 'characters', idToTry);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        character = { id: docSnap.id, ...docSnap.data() };
        console.log(`Found character using ID format: ${idToTry}`);
        return character;
      }
    }
    
    // Fallback: Match by name
    console.log(`Falling back to matching by name for ID: ${characterId}`);
    const q = query(collection(db, 'characters'), where('name', '==', characterId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      if (doc.exists()) {
        character = { id: doc.id, ...doc.data() };
        console.log(`Found character by name: ${characterId}, ID: ${doc.id}`);
      }
    });
    
    if (character) return character;
  
    // Log if character is not found
    console.log(`Character not found with any ID variation. Tried: ${idVariations.join(', ')}`);
    return null;
}