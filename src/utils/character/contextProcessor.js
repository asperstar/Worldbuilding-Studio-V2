// src/utils/character/contextProcessor.js
/* eslint-disable no-unused-vars */ 
import { auth } from '../firebase';
import { 
  getCharacterMemories, 
  getRelevantMemories,
  getPersonalityMemories
} from '../memory/memoryManager';
import { 
  loadCharacters,
  loadWorldById,
  loadWorldTimeline,
  loadMapData,
  loadWorlds,
  loadTimelineData,
  loadEnvironments,
  loadCampaign
} from '../storage';
import { 
  getCharacterRelationships,
  getWorldById,
  getEnvironmentById,
  getCampaignById
} from '../storage';

/**
 * Filter out sensitive or unnecessary character data
 */
const filterSensitiveCharacterData = (character) => {
  // Create a clean copy without sensitive data
  return {
    id: character.id,
    name: character.name,
    personality: character.personality || '',
    traits: character.traits || '',
    background: character.background || '',
    appearance: character.appearance || '',
    relationships: character.relationships || [],
    worldId: character.worldId
  };
};

/**
 * Primary function to build comprehensive context for a character
 * Aggregates data from all relevant sources:
 * - Character details
 * - Memories
 * - Related world information
 * - Timeline events
 * - Map relationships
 */
export const buildCharacterContext = async (character, conversationContext = '', options = {}) => {
  if (!character || !character.id) {
    throw new Error('Invalid character provided to context builder');
  }
  
  // Start with basic character information
  const mode = options.mode || 'chat';

  let contextData = {
    character: filterSensitiveCharacterData(character),
    memories: [],
    worldInfo: null,
    worldTimeline: null,
    mapRelationships: null,
    conversations: []
  };
  
  // Add map relationship data if requested
  if (options.includeMapInfo !== false) {
    try {
      const mapData = await loadMapData();
      if (mapData && mapData.nodes && mapData.edges) {
        // Find nodes related to this character
        const characterNodeId = mapData.nodes.find(node => 
          node.data?.characterId === character.id
        )?.id;
        
        if (characterNodeId) {
          // Find all directly connected nodes
          const connections = mapData.edges
            .filter(edge => edge.source === characterNodeId || edge.target === characterNodeId)
            .map(edge => {
              // Get the connected node (the other end of the relationship)
              const connectedNodeId = edge.source === characterNodeId ? edge.target : edge.source;
              const connectedNode = mapData.nodes.find(node => node.id === connectedNodeId);
              
              if (connectedNode) {
                return {
                  id: connectedNodeId,
                  type: connectedNode.type,
                  name: connectedNode.data?.label || 'Unknown',
                  relationshipType: edge.type || 'connected',
                  isEnvironment: connectedNode.type === 'environment',
                  isCharacter: connectedNode.type === 'character'
                };
              }
              return null;
            })
            .filter(Boolean);
            
          contextData.mapRelationships = {
            directConnections: connections,
            totalConnections: connections.length,
            environmentConnections: connections.filter(c => c.isEnvironment).length,
            characterConnections: connections.filter(c => c.isCharacter).length
          };
        }
      }
    } catch (mapError) {
      console.error('Error retrieving map relationship data:', mapError);
    }
  }
  
  // Add memory context based on relevance to conversation
  try {
    // Get relevant memories based on conversation context
    const relevantMemories = conversationContext ? 
      await getRelevantMemories(character.id, conversationContext) : 
      [];
    
    // Get personality-defining memories
    const personalityMemories = await getPersonalityMemories(character.id);
    
    // Get recent memories (limited set)
    const allMemories = await getCharacterMemories(character.id);
    const recentMemories = allMemories
      .sort((a, b) => new Date(b.metadata?.timestamp || 0) - new Date(a.metadata?.timestamp || 0))
      .slice(0, 10);
    
    // Combine all memories, removing duplicates
    const combinedMemories = [...relevantMemories];
    
    // Add personality memories if not already included
    personalityMemories.forEach(memory => {
      if (!combinedMemories.some(m => m.id === memory.id)) {
        combinedMemories.push(memory);
      }
    });
    
    // Add recent memories if not already included
    recentMemories.forEach(memory => {
      if (!combinedMemories.some(m => m.id === memory.id)) {
        combinedMemories.push(memory);
      }
    });
    
    // Format memories for context
    contextData.memories = combinedMemories.map(memory => ({
      content: memory.content,
      type: memory.metadata?.type || 'unknown',
      timestamp: memory.metadata?.timestamp || '',
      importance: memory.metadata?.importance || 5
    }));
  } catch (error) {
    console.error('Error retrieving character memories:', error);
  }
  
  // Add world information if character has a worldId
  if (character.worldId && options.includeWorldInfo !== false) {
    try {
      const world = await loadWorldById(character.worldId);
      
      if (world) {
        if (mode === 'campaign') {
          // For campaign mode, include full world context
          contextData.worldInfo = {
            name: world.name,
            description: world.description,
            rules: world.rules
          };
      
          // Add relevant timeline events from this world
          try {
            const timeline = await loadWorldTimeline(character.worldId);
            if (timeline && timeline.events && timeline.events.length > 0) {
              contextData.worldTimeline = timeline.events
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(event => ({
                  title: event.title,
                  date: event.date,
                  description: event.description,
                  // Only include if character is involved
                  relevantToCharacter: event.characterIds?.includes(character.id) || false
                }));
            }
          } catch (timelineError) {
            console.error('Error retrieving world timeline:', timelineError);
          }
        } else {
          // For chat mode, provide a more minimal world context
          contextData.worldInfo = {
            name: world.name,
            // Indicate this is not a focus of conversation
            chatModeHint: "In chat mode, you should acknowledge your world origin if directly asked, but don't focus on it. This is a casual conversation, not a roleplay in your fictional setting."
          };
        }
      }
    } catch (worldError) {
      console.error('Error retrieving world info:', worldError);
    }
  } else if (mode === 'chat' && !character.worldId) {
    // For chat mode with no specific world, use a neutral context
    contextData.worldInfo = {
      name: "Character Lounge",
      chatModeHint: "You're in a casual conversation outside your normal fictional setting. Focus on your personality and background, but don't reference any specific setting unless asked."
    };
  }
  
  // Format all data into a context string for Claude
  return formatContextForLLM(contextData, options);
};

/**
 * Format the context data into a string optimized for the LLM
 */
const formatContextForLLM = (contextData, options = {}) => {
  const { character, memories, worldInfo, worldTimeline, mapRelationships } = contextData;
  const mode = options.mode || 'chat';
  
  let contextString = `## Character Information\n`;
  contextString += `Name: ${character.name}\n`;
  
  if (character.personality) {
    contextString += `Personality: ${character.personality}\n`;
  }
  
  if (character.traits) {
    contextString += `Traits: ${character.traits}\n`;
  }
  
  if (character.background) {
    contextString += `Background: ${character.background}\n`;
  }
  
  if (character.appearance) {
    contextString += `Appearance: ${character.appearance}\n`;
  }
  
  // Add relationships if available
  if (character.relationships && character.relationships.length > 0) {
    contextString += `\n## Character Relationships\n`;
    character.relationships.forEach(rel => {
      contextString += `- ${rel.name}: ${rel.relationship}\n`;
    });
  }
  
  // Add memories section if we have any
  if (memories && memories.length > 0) {
    contextString += `\n## Character Memories\n`;
    
    // Group memories by type for better organization
    const groupedMemories = {};
    memories.forEach(memory => {
      const type = memory.type || 'other';
      if (!groupedMemories[type]) {
        groupedMemories[type] = [];
      }
      groupedMemories[type].push(memory);
    });
    
    // Format each memory type section
    Object.keys(groupedMemories).forEach(type => {
      contextString += `\n### ${type.charAt(0).toUpperCase() + type.slice(1)} Memories\n`;
      
      // Sort by importance, then by timestamp (newest first)
      const sortedMemories = groupedMemories[type].sort((a, b) => {
        if (b.importance !== a.importance) {
          return b.importance - a.importance;
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      
      // Add each memory
      sortedMemories.forEach(memory => {
        contextString += `- ${memory.content}\n`;
      });
    });
  }
  
  // Add world information if available, with mode-specific hints
  if (worldInfo) {
    contextString += `\n## World Information\n`;
    contextString += `World Name: ${worldInfo.name}\n`;
    
    if (worldInfo.chatModeHint && mode === 'chat') {
      contextString += `\n### Chat Mode Context\n${worldInfo.chatModeHint}\n`;
    } else {
      if (worldInfo.description) {
        contextString += `\n### World Description\n${worldInfo.description}\n`;
      }
      
      if (worldInfo.rules) {
        contextString += `\n### World Rules\n${worldInfo.rules}\n`;
      }
    }
  }
  
  // Add timeline events if available
  if (worldTimeline && worldTimeline.length > 0) {
    contextString += `\n## Timeline Events\n`;
    
    // Prioritize events that are relevant to the character
    const relevantEvents = worldTimeline.filter(event => event.relevantToCharacter);
    const otherEvents = worldTimeline.filter(event => !event.relevantToCharacter);
    
    if (relevantEvents.length > 0) {
      contextString += `\n### Events Involving This Character\n`;
      relevantEvents.forEach(event => {
        contextString += `- ${event.date}: ${event.title} - ${event.description}\n`;
      });
    }
    
    // Only include a few of the other events as general world context
    if (otherEvents.length > 0) {
      contextString += `\n### Other World Events\n`;
      // Limit to 5 important events to avoid overloading context
      otherEvents.slice(0, 5).forEach(event => {
        contextString += `- ${event.date}: ${event.title} - ${event.description}\n`;
      });
    }
  }
  
  // Add map relationships if available
  if (mapRelationships && mapRelationships.directConnections) {
    contextString += `\n## Spatial Relationships\n`;
    
    if (mapRelationships.directConnections.length > 0) {
      contextString += `This character has connections to the following:\n`;
      
      // First list character connections
      const characterConnections = mapRelationships.directConnections.filter(conn => conn.isCharacter);
      if (characterConnections.length > 0) {
        contextString += `\n### Connected Characters\n`;
        characterConnections.forEach(conn => {
          contextString += `- ${conn.name}\n`;
        });
      }
      
      // Then list environment connections
      const environmentConnections = mapRelationships.directConnections.filter(conn => conn.isEnvironment);
      if (environmentConnections.length > 0) {
        contextString += `\n### Connected Locations\n`;
        environmentConnections.forEach(conn => {
          contextString += `- ${conn.name}\n`;
        });
      }
    } else {
      contextString += `This character has no mapped connections to other characters or locations.\n`;
    }
  }
  
  // Provide a final instruction to use this information when responding
  contextString += `\n## Response Guidance\nWhen responding as ${character.name}, incorporate relevant aspects of the character's personality, memories, and knowledge of their world. Stay true to character traits and history while interacting naturally.`;
  
  return contextString;
};

// Add these new functions at the top of the file
function summarizeContext(context) {
  return {
    character: {
      name: context.character.name,
      description: context.character.description?.substring(0, 100) || '',
      personality: context.character.personality?.substring(0, 100) || '',
      currentGoal: context.character.goals?.split('\n')[0] || ''
    },
    world: context.world ? {
      name: context.world.name,
      currentSetting: context.world.description?.substring(0, 100) || ''
    } : null,
    environment: context.environment ? {
      name: context.environment.name,
      currentLocation: context.environment.description?.substring(0, 100) || ''
    } : null,
    recentEvents: context.campaign ? {
      currentScene: context.campaign.currentScene?.substring(0, 100) || ''
    } : null
  };
}

function rotateContextWindow(context, maxItems = 3) {
  return {
    ...context,
    character: {
      ...context.character,
      memories: context.character.memories.slice(0, maxItems),
      relationships: context.character.relationships.slice(0, maxItems)
    },
    conversationHistory: context.conversationHistory.slice(-maxItems)
  };
}

// Modify the enhanceCharacterAPI function
export async function enhanceCharacterAPI(characterId, message, previousMessages = [], options = {}) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Load only essential character data
    const character = await getCharacterById(characterId);
    if (!character) {
      throw new Error(`Character with ID ${characterId} not found`);
    }

    // Create minimal context
    const minimalContext = {
      character: {
        name: character.name,
        description: (character.description || '').substring(0, 50),
        personality: (character.personality || '').substring(0, 50)
      },
      lastMessage: previousMessages.length > 0 ? previousMessages[previousMessages.length - 1].text : ''
    };

    // Try Ollama first with minimal context
    try {
      const prompt = `You are ${minimalContext.character.name}. 
Description: ${minimalContext.character.description}
Personality: ${minimalContext.character.personality}
${minimalContext.lastMessage ? `Last message: ${minimalContext.lastMessage}` : ''}

User's message: "${message}"

Please respond in character.`;

      const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "mistral",
          prompt: prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            top_p: options.topP || 0.9,
            num_predict: options.maxTokens || 500
          }
        })
      });

      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        return {
          response: data.response,
          context: minimalContext,
          source: 'ollama'
        };
      }
    } catch (ollamaError) {
      console.log('Ollama not available, falling back to Claude:', ollamaError);
    }

    // Fall back to Claude with minimal context
    const token = await user.getIdToken();
    const response = await fetch('/api/claude-api-dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        characterId,
        message,
        context: minimalContext,
        options: {
          maxTokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7,
          topP: options.topP || 0.9
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      response: data.response,
      context: minimalContext,
      source: 'claude'
    };
  } catch (error) {
    console.error('Error in enhanceCharacterAPI:', error);
    throw error;
  }
}

export async function getCharacterById(characterId) {
  try {
    const characters = await loadCharacters();
    const character = characters.find(char => char.id === characterId);
    
    if (!character) {
      console.error(`Character with ID ${characterId} not found`);
      throw new Error(`Character with ID ${characterId} not found`);
    }
    
    return character;
  } catch (error) {
    console.error('Error in getCharacterById:', error);
    throw error;
  }
}

function formatConversationHistory(messages) {
  if (!Array.isArray(messages)) {
    console.warn('formatConversationHistory received non-array messages:', messages);
    return [];
  }
  
  return messages.map(msg => ({
    type: 'message',
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text || '',
    // Ensure consistent timestamp format - accept ISO string or convert number to ISO
    timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : 
               (msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString())
  }));
}