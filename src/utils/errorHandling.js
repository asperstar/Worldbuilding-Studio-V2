// src/utils/errorHandling.js
export const validateCampaignStructure = (campaign) => {
    const errors = [];
    
    // Check required fields
    if (!campaign.id) errors.push('Campaign is missing ID');
    if (!campaign.name) errors.push('Campaign is missing name');
    if (!campaign.worldId) errors.push('Campaign is missing worldId');
    
    // Check for valid relationships
    if (!campaign.scenes || !Array.isArray(campaign.scenes)) {
      errors.push('Campaign has no scenes array');
    }
    
    if (!campaign.participantIds || !Array.isArray(campaign.participantIds)) {
      errors.push('Campaign has no participantIds array');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  export const validateSceneStructure = (scene) => {
    const errors = [];
    
    // Check required fields
    if (!scene.id) errors.push('Scene is missing ID');
    if (!scene.title) errors.push('Scene is missing title');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  // Check storage consistency
  export const verifyStorageConsistency = () => {
    const issues = [];
    
    try {
      // Check if worlds reference valid campaigns
      const worlds = loadWorlds();
      worlds.forEach(world => {
        if (world.campaignIds && Array.isArray(world.campaignIds)) {
          world.campaignIds.forEach(campaignId => {
            const campaign = loadCampaign(campaignId);
            if (!campaign) {
              issues.push(`World ${world.name} (ID: ${world.id}) references non-existent campaign ID: ${campaignId}`);
            }
          });
        }
      });
      
      // Check if campaigns reference valid scenes
      worlds.forEach(world => {
        if (world.campaignIds && Array.isArray(world.campaignIds)) {
          world.campaignIds.forEach(campaignId => {
            const campaign = loadCampaign(campaignId);
            if (campaign) {
              if (campaign.currentSceneIndex >= campaign.scenes.length) {
                issues.push(`Campaign ${campaign.name} has invalid currentSceneIndex: ${campaign.currentSceneIndex}`);
              }
            }
          });
        }
      });
      
      return {
        isConsistent: issues.length === 0,
        issues
      };
    } catch (error) {
      return {
        isConsistent: false,
        issues: [`Storage consistency check failed: ${error.message}`]
      };
    }
  };