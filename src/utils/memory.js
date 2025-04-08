// Basic in-memory vector storage simulation
const memoryStore = {};

// Add a memory
export const addMemory = (characterId, content, type = 'conversation', importance = 5) => {
  if (!memoryStore[characterId]) {
    memoryStore[characterId] = [];
  }
  
  const memory = {
    id: Date.now(),
    content,
    type,
    importance,
    timestamp: new Date().toISOString()
  };
  
  memoryStore[characterId].push(memory);
  return memory;
};

// Simple search for relevant memories
export const findRelevantMemories = (characterId, context, limit = 5) => {
  if (!memoryStore[characterId]) return [];
  
  // Simple word matching for relevance
  const contextWords = context.toLowerCase().split(/\W+/);
  
  return memoryStore[characterId]
    .map(memory => {
      const memoryWords = memory.content.toLowerCase().split(/\W+/);
      let matchCount = 0;
      
      contextWords.forEach(word => {
        if (word.length > 3 && memoryWords.includes(word)) {
          matchCount++;
        }
      });
      
      return {
        ...memory,
        relevance: matchCount / contextWords.length
      };
    })
    .filter(m => m.relevance > 0.1)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
};

// Process conversation to extract memories
export const processConversation = async (characterId, messages) => {
  if (!messages || messages.length < 2) return;
  
  const lastUserMessage = messages.find(m => m.sender === 'user');
  const lastCharacterMessage = messages.find(m => m.sender === 'character');
  
  if (lastUserMessage && lastCharacterMessage) {
    // Store the exchange
    addMemory(
      characterId,
      `User said "${lastUserMessage.text}" and I responded "${lastCharacterMessage.text}"`,
      'conversation',
      4
    );
    
    // You could add more sophisticated memory extraction here
  }
};