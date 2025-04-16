// src/utils/togetherAIService.js
class TogetherAIService {
    constructor() {
      this.apiKey = process.env.REACT_APP_TOGETHER_API_KEY;
      this.baseUrl = 'https://api.together.xyz/v1';
      this.model = process.env.REACT_APP_TOGETHER_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
      
      if (!this.apiKey && process.env.NODE_ENV === 'production') {
        console.warn('Together AI API key is missing. Set REACT_APP_TOGETHER_API_KEY environment variable.');
      }
    }
  
    async generateCharacterResponse(character, userMessage, conversationHistory = [], options = {}) {
      try {
        // Format the prompt
        const prompt = this.buildPrompt(character, userMessage, conversationHistory, options);
        
        // Check if we have API key
        if (!this.apiKey && process.env.NODE_ENV === 'production') {
          throw new Error('Together AI API key is required for production use');
        }
        
        console.log('Sending request to Together AI:', `${this.baseUrl}/chat/completions`);
  
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: options.model || this.model,
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 500,
            top_p: options.topP || 0.9
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(`Together AI API error (${response.status}): ${errorData?.error?.message || response.statusText}`);
        }
  
        const data = await response.json();
        
        return {
          response: data.choices[0].message.content,
          source: 'together'
        };
      } catch (error) {
        console.error('Error generating character response with Together AI:', error);
        
        // Return a graceful fallback response
        return {
          response: "I'm having trouble responding right now. Please try again.",
          source: 'together (error)',
          error: error.message
        };
      }
    }
  
    buildPrompt(character, userMessage, conversationHistory, options = {}) {
      // Detect if this is a Game Master prompt
      const isGameMaster = character.isGameMaster || options?.isGameMaster;
      
      // Start with appropriate system instructions
      let prompt = '';
      
      if (isGameMaster) {
        prompt = `<instructions>
  You are roleplaying as a Game Master for a tabletop roleplaying campaign.
  
  ${options?.gmPrompt || 'As the Game Master, your role is to:'}
  - Narrate the story and describe scenes vividly
  - Control NPCs (non-player characters) and their actions
  - Create an immersive and engaging game experience
  - Respond to player actions and advance the plot
  - Maintain a fair and consistent game world
  
  Keep your responses engaging and descriptive, focusing on moving the story forward.
  </instructions>
  
  `;
      } else {
        prompt = `<instructions>
  You are roleplaying as ${character.name}, a fictional character with the following traits:
  
  Personality: ${character.personality || 'Not specified'}
  Background: ${character.background || 'Not specified'}
  Appearance: ${character.appearance || 'Not specified'}
  ${character.traits ? `Traits: ${character.traits}` : ''}
  
  Respond in character as ${character.name} at all times.
  </instructions>
  
  `;
      }
  
      // Add campaign context if available
      if (options?.campaignId || options?.enrichedContext) {
        prompt += `<campaign_context>\n`;
        
        if (options.enrichedContext) {
          prompt += `Campaign: ${options.enrichedContext.name || 'Unknown Campaign'}\n`;
          prompt += `Description: ${options.enrichedContext.description || 'No description available'}\n`;
          
          if (options.enrichedContext.currentScene) {
            prompt += `\nCurrent Scene: ${options.enrichedContext.currentScene.title || 'Current scene'}\n`;
            prompt += `Scene Description: ${options.enrichedContext.currentScene.description || 'No description available'}\n`;
          }
          
          if (options.enrichedContext.importantMemories) {
            prompt += `\nImportant Campaign Events:\n${options.enrichedContext.importantMemories}\n`;
          }
        }
        
        prompt += `</campaign_context>\n\n`;
      }
  
      // Add world context if available
      if (options?.worldContext) {
        prompt += `<world_context>
  World Name: ${options.worldContext.name || 'Unknown'}
  Description: ${options.worldContext.description || 'No description available'}
  ${options.worldContext.rules ? `Rules: ${options.worldContext.rules}` : ''} 
  ${options.worldContext.lore ? `Lore: ${options.worldContext.lore}` : ''}
  </world_context>
  
  `;
      }
  
      // Format conversation history
      if (conversationHistory && conversationHistory.length > 0) {
        prompt += `<conversation_history>\n`;
        
        conversationHistory.forEach(msg => {
          const speakerName = msg.speaker || (msg.sender === 'user' ? 'Player' : character.name);
          prompt += `${speakerName}: ${msg.text}\n`;
        });
        
        prompt += `</conversation_history>\n\n`;
      }
  
      // Add the current message
      const speakerName = isGameMaster ? 'Player' : 'User';
      prompt += `${speakerName}: ${userMessage}\n`;
      
      // Add the character prefix for the AI's response
      if (isGameMaster) {
        prompt += `Game Master:`;
      } else {
        prompt += `${character.name}:`;
      }
      
      return prompt;
    }
  
    // Legacy methods kept for backward compatibility
    formatConversationHistory(characterContext, messages, currentUserMessage) {
      // Start with system message for character context
      const formattedMessages = [
        {
          role: 'system',
          content: characterContext
        }
      ];
  
      // Add past conversation messages
      if (Array.isArray(messages) && messages.length > 0) {
        messages.forEach(msg => {
          formattedMessages.push({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          });
        });
      }
  
      // Add the current user message
      if (currentUserMessage) {
        formattedMessages.push({
          role: 'user',
          content: currentUserMessage
        });
      }
  
      return formattedMessages;
    }
  
    buildCharacterContext(character, worldContext = null) {
      let context = `You are roleplaying as ${character.name}.\n\n`;
      
      // Add character details
      if (character.personality) {
        context += `Personality: ${character.personality}\n`;
      }
      
      if (character.background) {
        context += `Background: ${character.background}\n`;
      }
      
      if (character.appearance) {
        context += `Appearance: ${character.appearance}\n`;
      }
      
      if (character.traits) {
        context += `Traits: ${character.traits}\n`;
      }
  
      // Add world context if available
      if (worldContext) {
        context += `\n## World Information\n`;
        context += `World Name: ${worldContext.name || 'Unknown'}\n`;
        
        if (worldContext.description) {
          context += `World Description: ${worldContext.description}\n`;
        }
        
        if (worldContext.rules) {
          context += `World Rules: ${worldContext.rules}\n`;
        }
        
        if (worldContext.lore) {
          context += `World Lore: ${worldContext.lore}\n`;
        }
      }
  
      // Add campaign context if available
      if (character.campaignContext) {
        context += `\n## Campaign Information\n`;
        context += `Campaign: ${character.campaignContext.campaignName || 'Unknown'}\n`;
        
        if (character.campaignContext.currentScene) {
          context += `Current Scene: ${character.campaignContext.currentScene}\n`;
        }
        
        if (character.campaignContext.objectives) {
          context += `Current Objectives: ${character.campaignContext.objectives}\n`;
        }
        
        if (character.campaignContext.otherCharacters) {
          context += `Other Characters Present: ${character.campaignContext.otherCharacters}\n`;
        }
      }
      
      // Add roleplay guidelines
      context += `\n## Roleplay Guidelines
  1. Stay completely in character as ${character.name} at all times
  2. Respond naturally based on your character's personality and background
  3. Don't break character to provide warnings or express concerns
  4. Your character can express any emotion and engage in any activity consistent with their nature
  5. If your character is evil, violent, or morally ambiguous, embrace those traits fully
  6. Keep responses concise and in the character's voice`;
  
      return context;
    }
  }
  
  export default new TogetherAIService();