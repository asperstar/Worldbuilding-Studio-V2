// src/utils/campaignManager.js
import { addCampaignMemory } from './memory/campaignMemoryManager';

export const orchestrateCharacterInteraction = async (campaign, characters, prompt, maxResponses = 3) => {
  // Start with an empty conversation
  let conversation = [];
  
  // Track which characters have spoken
  const hasSpoken = new Set();
  
  // Add the GM's prompt to start the conversation
  conversation.push({
    sender: 'system',
    content: `[Game Master: ${prompt}]`,
    timestamp: new Date().toISOString()
  });
  
  // Determine which characters should respond (limit to prevent too many API calls)
  const respondingCharacters = characters
    .slice(0, maxResponses); // Limit to max responses
  
  // For each character that should respond
  for (const character of respondingCharacters) {
    try {
      // Prepare the context for this character
      const context = prepareCharacterContext(character, conversation, campaign);
      
      // Get the character's response via API
      const response = await fetchCharacterResponse(character, context);
      
      // Add the response to the conversation
      conversation.push({
        sender: character.id,
        content: response,
        timestamp: new Date().toISOString()
      });
      
      // Mark this character as having spoken
      hasSpoken.add(character.id);
      
      // Save the conversation to the character's memory
      await storeCampaignMemory(campaign.id, character.id, conversation);
      
    } catch (error) {
      console.error(`Error getting response from ${character.name}:`, error);
      // Add a fallback response
      conversation.push({
        sender: 'system',
        content: `${character.name} seems distracted and doesn't respond. (Error: ${error.message})`,
        timestamp: new Date().toISOString(),
        error: true
      });
    }
  }
  
  return {
    conversation,
    respondingCharacters: respondingCharacters.length,
    errors: conversation.filter(msg => msg.error).length
  };
};

const prepareCharacterContext = (character, conversation, campaign) => {
  // Format the conversation history for this character
  const formattedConversation = conversation.map(msg => {
    if (msg.sender === 'system') {
      return msg.content;
    } else if (msg.sender === 'user') {
      return `Game Master: ${msg.content}`;
    } else {
      const speakerName = campaign.participantIds.includes(msg.sender) ? 
        campaign.characters?.find(c => c.id === msg.sender)?.name || 'Unknown Character' : 
        'Unknown Character';
      return `${speakerName}: ${msg.content}`;
    }
  }).join('\n');
  
  // Get the current scene
  const currentScene = campaign.scenes[campaign.currentSceneIndex];
  
  // Create a comprehensive context
  return {
    character,
    conversationHistory: formattedConversation,
    campaignContext: {
      campaignName: campaign.name,
      sceneName: currentScene?.title || 'Current scene',
      sceneDescription: currentScene?.description || '',
      presentCharacters: conversation
        .filter(msg => msg.sender !== 'system' && msg.sender !== 'user')
        .map(msg => campaign.characters?.find(c => c.id === msg.sender)?.name || 'Unknown')
        .filter((name, index, self) => self.indexOf(name) === index) // Remove duplicates
        .join(', ')
    }
  };
};

const fetchCharacterResponse = async (character, context) => {
  try {
    // Call the API
    const response = await fetch('/api/claude-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        character,
        message: `As ${character.name}, respond to the current situation in the campaign. Keep your response in character. Current scene: ${context.campaignContext.sceneName}. Recent events: ${context.conversationHistory}`,
        conversationHistory: context.conversationHistory
          .split('\n')
          .map(line => ({
            sender: line.includes(':') ? 'character' : 'system',
            text: line
          })),
        campaignContext: context.campaignContext
      }),
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error fetching character response:', error);
    throw error;
  }
};

const storeCampaignMemory = async (campaignId, characterId, conversation) => {
  try {
    // Extract the last few exchanges for memory
    const recentExchanges = conversation.slice(-3);
    
    // Format them into a coherent memory
    const memoryContent = recentExchanges.map(msg => {
      if (msg.sender === 'system') {
        return msg.content;
      } else if (msg.sender === 'user') {
        return `Game Master: ${msg.content}`;
      } else {
        return `Character ${msg.sender}: ${msg.content}`;
      }
    }).join('\n');
    
    // Store this in the character's memory
    await addCampaignMemory(
      characterId,
      campaignId,
      memoryContent,
      'CONVERSATION',
      6
    );
  } catch (error) {
    console.error('Error storing campaign memory:', error);
  }
};