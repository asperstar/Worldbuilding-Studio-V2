// src/utils/memory/campaignMemoryIntegration.js
import { addMemory, getCharacterMemories } from './memoryManager';
import { getEnhancedContextMemories, extractConversationInsights } from './enhancedMemoryManager';
import { loadCampaign } from '../storage';

// Campaign-specific memory types
export const CAMPAIGN_MEMORY_TYPES = {
  EVENT: 'campaign_event',
  CHARACTER_INTERACTION: 'character_interaction', 
  PLAYER_DECISION: 'player_decision',
  WORLD_CHANGE: 'world_change',
  QUEST_PROGRESS: 'quest_progress'
};

/**
 * Store a campaign-specific memory for a character
 */
export const addCampaignMemory = async (
  characterId, 
  campaignId, 
  content, 
  type = CAMPAIGN_MEMORY_TYPES.EVENT, 
  importance = 6
) => {
  // Tag memory with campaign ID to make it filterable
  const taggedContent = `[Campaign: ${campaignId}] ${content}`;
  
  return await addMemory(
    characterId,
    taggedContent,
    type,
    importance
  );
};

/**
 * Process and store character interactions in a campaign
 * Creates memories for both the speaker and any witnesses
 */
export const processCampaignInteraction = async (
  campaignId,
  speakingCharacterId,
  speakingCharacterName,
  message,
  witnessIds = []
) => {
  // Create memory for the speaking character
  await addCampaignMemory(
    speakingCharacterId,
    campaignId,
    `I said: "${message}"`,
    CAMPAIGN_MEMORY_TYPES.CHARACTER_INTERACTION,
    6
  );
  
  // Create memories for witnesses
  for (const witnessId of witnessIds) {
    if (witnessId !== speakingCharacterId) {
      await addCampaignMemory(
        witnessId,
        campaignId,
        `${speakingCharacterName} said: "${message}"`,
        CAMPAIGN_MEMORY_TYPES.CHARACTER_INTERACTION,
        5
      );
    }
  }
};

/**
 * Record a significant campaign event for all involved characters
 */
export const recordCampaignEvent = async (
  campaignId,
  event,
  involvedCharacterIds = [],
  importance = 7
) => {
  for (const characterId of involvedCharacterIds) {
    await addCampaignMemory(
      characterId,
      campaignId,
      event,
      CAMPAIGN_MEMORY_TYPES.EVENT,
      importance
    );
  }
};

/**
 * Record a player decision in the campaign
 */
export const recordPlayerDecision = async (
  campaignId,
  characterId,
  decision,
  consequences = '',
  importance = 8
) => {
  let content = `Made decision: ${decision}`;
  if (consequences) {
    content += `. Consequences: ${consequences}`;
  }
  
  await addCampaignMemory(
    characterId,
    campaignId,
    content,
    CAMPAIGN_MEMORY_TYPES.PLAYER_DECISION,
    importance
  );
};

/**
 * Get campaign-relevant memories for a character
 */
export const getCampaignMemories = async (characterId, campaignId, currentContext) => {
  const options = {
    campaignId: campaignId,
    campaignContext: null
  };
  
  // Try to load campaign details to enhance context
  try {
    const campaign = await loadCampaign(campaignId);
    if (campaign) {
      const currentScene = campaign.scenes?.[campaign.currentSceneIndex || 0];
      
      options.campaignContext = {
        name: campaign.name,
        description: campaign.description,
        currentScene: currentScene ? {
          title: currentScene.title,
          description: currentScene.description
        } : null
      };
    }
  } catch (error) {
    console.error('Error loading campaign for memory retrieval:', error);
  }
  
  // Use the enhanced memory system with campaign filtering
  return await getEnhancedContextMemories(characterId, currentContext, [], options);
};

/**
 * Extract insights from campaign conversation
 */
export const extractCampaignInsights = async (
  campaignId,
  characterId,
  conversation,
  characterName
) => {
  try {
    // First, use the general insight extraction
    const insight = await extractConversationInsights(
      characterId,
      conversation,
      characterName
    );
    
    // If an insight was found, store it as a campaign memory too
    if (insight) {
      await addCampaignMemory(
        characterId,
        campaignId,
        insight,
        CAMPAIGN_MEMORY_TYPES.CHARACTER_INTERACTION,
        7
      );
    }
    
    // Use Grok for campaign-specific insights instead of Ollama
    // Define a function to generate insights using fetch to your Grok API endpoint
    const generateInsightWithGrok = async (prompt) => {
      try {
        // Modify this to match your Grok API endpoint
        const grokApiUrl = process.env.REACT_APP_GROK_API_URL || 'http://localhost:3000/api/generate';
        
        const response = await fetch(grokApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt,
            max_tokens: 100,
            temperature: 0.2
          })
        });
        
        if (!response.ok) {
          throw new Error(`Grok API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.text || data.output || data.response || '';
      } catch (error) {
        console.error('Error using Grok API:', error);
        return null;
      }
    };

    let campaignInsight = null;
    
    // Generate insight with Grok
    const insightPrompt = `Analyze this campaign conversation for campaign-specific insights:

${conversation.map(msg => `${msg.sender === 'user' ? 'Player' : characterName}: ${msg.text}`).join('\n')}

Identify ONE important campaign insight like quest progress, world changes, or important character relationships.
Format: [CAMPAIGN_INSIGHT]: Your insight here`;
    
    const grokResponse = await generateInsightWithGrok(insightPrompt);
    
    if (grokResponse) {
      const insightMatch = grokResponse.match(/\[CAMPAIGN_INSIGHT\]:\s*(.*?)(\n|$)/i);
      if (insightMatch && insightMatch[1]) {
        campaignInsight = insightMatch[1].trim();
      }
    }
    
    // If a campaign-specific insight was found, store it
    if (campaignInsight) {
      const memoryType = 
        campaignInsight.toLowerCase().includes('quest') 
          ? CAMPAIGN_MEMORY_TYPES.QUEST_PROGRESS
          : campaignInsight.toLowerCase().includes('world') || campaignInsight.toLowerCase().includes('environment')
            ? CAMPAIGN_MEMORY_TYPES.WORLD_CHANGE
            : CAMPAIGN_MEMORY_TYPES.CHARACTER_INTERACTION;
            
      await addCampaignMemory(
        characterId,
        campaignId,
        campaignInsight,
        memoryType,
        8
      );
    }
    
    return insight || campaignInsight;
  } catch (error) {
    console.error('Error extracting campaign insights:', error);
    return null;
  }
};

/**
 * Update the campaign context based on memory
 * Helps enrich the context sent to the AI model
 */
export const enrichCampaignContext = async (campaignId, campaignContext) => {
  if (!campaignId || !campaignContext) return campaignContext;
  
  try {
    // Load the campaign
    const campaign = await loadCampaign(campaignId);
    if (!campaign) return campaignContext;
    
    // Get participating character IDs
    const participantIds = campaign.participantIds || [];
    if (participantIds.length === 0) return campaignContext;
    
    // For each character, get their top 2 most important campaign memories
    const characterMemories = {};
    let allImportantMemories = [];
    
    for (const characterId of participantIds) {
      const memories = await getCharacterMemories(characterId);
      
      // Filter for campaign memories only
      const campaignMemories = memories.filter(mem => 
        mem.content && mem.content.includes(`[Campaign: ${campaignId}]`)
      );
      
      // Sort by importance
      const sortedMemories = campaignMemories.sort((a, b) => 
        (b.metadata?.importance || 5) - (a.metadata?.importance || 5)
      );
      
      // Get top 2
      const topMemories = sortedMemories.slice(0, 2);
      characterMemories[characterId] = topMemories;
      allImportantMemories = [...allImportantMemories, ...topMemories];
    }
    
    // Sort all memories by importance and take top 5
    const topCampaignMemories = allImportantMemories
      .sort((a, b) => (b.metadata?.importance || 5) - (a.metadata?.importance || 5))
      .slice(0, 5);
    
    // Format them for the context
    const formattedMemories = topCampaignMemories.map(mem => {
      // Remove the campaign tag for cleaner display
      const cleanContent = mem.content.replace(`[Campaign: ${campaignId}]`, '').trim();
      const type = mem.metadata?.type || 'unknown';
      return `[${type}] ${cleanContent}`;
    }).join('\n');
    
    // Add the memories to the campaign context
    return {
      ...campaignContext,
      importantMemories: formattedMemories
    };
  } catch (error) {
    console.error('Error enriching campaign context:', error);
    return campaignContext;
  }
};

export default {
  addCampaignMemory,
  processCampaignInteraction,
  recordCampaignEvent,
  recordPlayerDecision,
  getCampaignMemories,
  extractCampaignInsights,
  enrichCampaignContext,
  CAMPAIGN_MEMORY_TYPES
};