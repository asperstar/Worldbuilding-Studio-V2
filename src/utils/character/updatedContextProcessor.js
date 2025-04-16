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

    const character = await getCharacterById(characterId);
    if (!character) {
      throw new Error(`Character with ID ${characterId} not found`);
    }

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

    const historyMessages = previousMessages
      .slice(-5)
      .map(msg => ({
        role: msg.sender,
        content: msg.text || msg.content,
      }));

    let contextualInfo = '';
    let characterInfo = '';

    if (isGameMaster) {
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
      characterInfo = `You are ${character.name}.`;
      if (character.personality) characterInfo += `\nPersonality: ${character.personality}`;
      if (character.background) characterInfo += `\nBackground: ${character.background}`;
      if (character.traits) characterInfo += `\nTraits: ${character.traits}`;
      if (character.appearance) characterInfo += `\nAppearance: ${character.appearance}`;

      if (memories.length > 0) {
        contextualInfo += `\nMemories:\n${memories}\n`;
      }
    }

    const modePrompt = rpMode === 'family-friendly'
      ? `\nAvoid any sexual content, violence, or morally ambiguous themes. Respond with a positive, safe tone.`
      : `\nAvoid sexual content, but you may include violent or morally ambiguous themes as appropriate to your character.`;

    const context = `${characterInfo}${modePrompt}\n\n${contextualInfo}\n\nConversation History:\n${historyMessages.length > 0 ? historyMessages.map(msg => `${msg.role === 'user' ? 'User' : character.name}: ${msg.content}`).join('\n') : 'No previous conversation'}`;

    const messages = [
      ...historyMessages,
      { role: 'user', content: userInput },
    ];

    console.log('Sending request to /api/chat:', { messages, character: character.name, context });

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        character: character.name,
        context,
      }),
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
    return {
      response: "I'm having trouble responding right now. Please try again later.",
      error: error.message,
    };
  }
};

export async function getCharacterById(characterId) {
  console.log(`Fetching character with ID: ${characterId}`);

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
    const docRef = doc(db, `users/${userId}/characters`, idToTry);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      character = { id: docSnap.id, ...docSnap.data() };
      console.log(`Found character using ID format: ${idToTry}`);
      return character;
    }
  }

  console.log(`Falling back to matching by name for ID: ${characterId}`);
  const q = query(collection(db, `users/${userId}/characters`), where('name', '==', characterId));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
    if (doc.exists()) {
      character = { id: doc.id, ...doc.data() };
      console.log(`Found character by name: ${characterId}, ID: ${doc.id}`);
    }
  });

  if (character) return character;

  console.log(`Character not found with any ID variation. Tried: ${idVariations.join(', ')}`);
  return null;
}