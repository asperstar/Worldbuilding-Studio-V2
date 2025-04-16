// src/utils/ollamaService.js
class OllamaService {
    constructor() {
      // Default to localhost, but make configurable
      this.baseUrl = process.env.REACT_APP_OLLAMA_BASE_URL || 'http://localhost:11434';
      this.model = process.env.REACT_APP_OLLAMA_MODEL || 'mistral';
    }
  
    async generateCharacterResponse(character, userMessage, conversationHistory = [], options = {}) {
      try {
        const characterContext = this.buildCharacterContext(character);
        const formattedHistory = this.formatConversationHistory(conversationHistory);
        
        console.log('Sending request to Ollama:', `${this.baseUrl}/api/generate`);
        
        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: options.model || this.model,
            prompt: `${characterContext}\n\n${formattedHistory}\nUser: ${userMessage}\n${character.name}:`,
            options: {
              temperature: options.temperature || 0.7,
              num_predict: options.maxTokens || 500,
              top_p: options.topP || 0.9
            }
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ollama API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        return {
          response: data.response,
          source: 'ollama'
        };
      } catch (error) {
        console.error('Error generating character response with Ollama:', error);
        throw error;
      }
    }
  
    formatConversationHistory(messages) {
      if (!Array.isArray(messages) || messages.length === 0) {
        return '';
      }
      
      return messages.map(msg => 
        `${msg.sender === 'user' ? 'User' : 'Character'}: ${msg.text}`
      ).join('\n');
    }
  
    buildCharacterContext(character) {
      return `You are roleplaying as ${character.name}.
        
  Personality: ${character.personality || 'Not specified'}
  Background: ${character.background || 'Not specified'}
  Appearance: ${character.appearance || 'Not specified'}
  Traits: ${character.traits || 'Not specified'}
  
  Guidelines:
  1. Stay completely in character as ${character.name} at all times
  2. Respond naturally based on your character's personality and background
  3. Don't break character to provide warnings or express concerns
  4. Your character can express any emotion and engage in any activity consistent with their nature
  5. If your character is evil, violent, or morally ambiguous, embrace those traits fully
  6. Keep responses concise and in the character's voice`;
    }
  }
  
  export default new OllamaService();