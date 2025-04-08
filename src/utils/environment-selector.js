// src/utils/environment-selector.js
import { loadWorlds, loadEnvironments, loadTimelineData, loadMapData } from './storage';

/**
 * Detects relevant environment based on multiple contextual signals
 * @param {Object} context - Contextual information for environment detection
 * @returns {Promise<string|null>} Selected environment ID or null
 */
export const selectRelevantEnvironment = async (context) => {
  const {
    character,
    messages = [],
    worldId = null,

  } = context;

  // Logging function for tracking environment selection process
  const log = (message) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Environment Selector] ${message}`);
    }
  };

  try {
    // Load necessary data
    const [worlds, environments, mapData] = await Promise.all([
      loadWorlds(),
      loadEnvironments(),
      loadTimelineData(),
      loadMapData()
    ]);

    // Environment selection strategies (in order of preference)
    const strategies = [
      

      // 2. Conversation Keyword-based Environment Detection
      () => {
        if (!environments || environments.length === 0) return null;

        // Mapping of keywords to environment types
        const environmentKeywords = {
          forest: ['forest', 'woods', 'woodland', 'jungle'],
          mountain: ['mountain', 'mountains', 'peak', 'highlands'],
          desert: ['desert', 'sand', 'dune', 'arid'],
          city: ['city', 'town', 'urban', 'street', 'marketplace'],
          water: ['river', 'lake', 'ocean', 'sea', 'water', 'coast'],
          cave: ['cave', 'cavern', 'underground', 'tunnel'],
        };

        // Check recent messages for environment keywords
        const recentMessages = messages.slice(-3).map(msg => msg.text.toLowerCase());
        
        for (const [keywords] of Object.entries(environmentKeywords)) {
          const matchingEnvironment = environments.find(env => 
            keywords.some(keyword => 
              recentMessages.some(message => message.includes(keyword)) ||
              (env.terrain && env.terrain.toLowerCase().includes(keyword)) ||
              (env.description && env.description.toLowerCase().includes(keyword))
            )
          );

          if (matchingEnvironment) {
            log(`Conversation keyword strategy selected environment: ${matchingEnvironment.id}`);
            return matchingEnvironment.id;
          }
        }

        return null;
      },

      // 3. World-based Environment Selection
      () => {
        // If a specific world is known, use its first environment
        if (worldId) {
          const worldEnvironments = environments.filter(env => env.worldId === worldId);
          
          if (worldEnvironments.length > 0) {
            log(`World-based strategy selected environment: ${worldEnvironments[0].id}`);
            return worldEnvironments[0].id;
          }
        }

        // If character is associated with a specific world, use its first environment
        const characterWorld = worlds.find(world => 
          world.characterIds && world.characterIds.includes(character.id)
        );

        if (characterWorld) {
          const worldEnvironments = environments.filter(env => env.worldId === characterWorld.id);
          
          if (worldEnvironments.length > 0) {
            log(`Character world strategy selected environment: ${worldEnvironments[0].id}`);
            return worldEnvironments[0].id;
          }
        }

        return null;
      },

      // 4. Map-based Environment Detection
      () => {
        if (!mapData || !mapData.nodes) return null;
    
        // Find character nodes on the map
        const characterNodes = mapData.nodes.filter(node => 
          node.type === 'character' && 
          node.data.label === character.name
        );
    
        // If character is on the map, find connected environment nodes
        if (characterNodes.length > 0) {
          const connectedEnvironments = mapData.edges
            .filter(edge => 
              characterNodes.some(node => 
                edge.source === node.id || edge.target === node.id
              )
            )
            .map(edge => 
              mapData.nodes.find(node => 
                node.type === 'environment' && 
                (node.id === edge.source || node.id === edge.target)
              )
            )
            .filter(Boolean);
    
          if (connectedEnvironments.length > 0) {
            log(`Map-based strategy selected environment: ${connectedEnvironments[0].id}`);
            return connectedEnvironments[0].id;
          }
        }
    
        return null;
      },

      // 5. Fallback: Return first environment
      () => {
        if (environments.length > 0) {
          log(`Fallback strategy selected first environment: ${environments[0].id}`);
          return environments[0].id;
        }
        return null;
      }
    ];

    // Run strategies in order until one returns a valid environment
    for (const strategy of strategies) {
      const selectedEnvironmentId = await strategy();
      if (selectedEnvironmentId) return selectedEnvironmentId;
    }

    log('No environment could be selected');
    return null;

  } catch (error) {
    console.error('Error in environment selection:', error);
    return null;
  }
};

// Caching mechanism to prevent unnecessary recomputation
const environmentSelectionCache = new Map();

export const getCachedEnvironment = async (context, maxCacheAge = 5 * 60 * 1000) => {
  const cacheKey = JSON.stringify({
    characterId: context.character?.id,
    worldId: context.worldId
  });

  const cachedResult = environmentSelectionCache.get(cacheKey);
  const now = Date.now();

  if (cachedResult && (now - cachedResult.timestamp < maxCacheAge)) {
    return cachedResult.environmentId;
  }

  // Force refresh or cache is stale
  const environmentId = await selectRelevantEnvironment({
    ...context,
    forceRefresh: true
  });

  // Store in cache
  environmentSelectionCache.set(cacheKey, {
    environmentId,
    timestamp: now
  });

  return environmentId;
};