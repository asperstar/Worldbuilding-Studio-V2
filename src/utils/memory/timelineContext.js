// src/utils/memory/timelineContext.js
/**
 * Helper functions to extract and format timeline data for AI context
 */

/**
 * Extract relevant events for a specific time period
 * @param {Array} events - All timeline events
 * @param {Object} filters - Filtering options
 * @returns {Array} Filtered events
 */
export const getFilteredEvents = (events, filters = {}) => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      return [];
    }
    
    let filteredEvents = [...events];
    
    // Filter by date if specified
    if (filters.date) {
      filteredEvents = filteredEvents.filter(event => event.date === filters.date);
    }
    
    // Filter by date range
    if (filters.startDate) {
      filteredEvents = filteredEvents.filter(event => event.date >= filters.startDate);
    }
    
    if (filters.endDate) {
      filteredEvents = filteredEvents.filter(event => event.date <= filters.endDate);
    }
    
    // Filter by sequence/timeline
    if (filters.sequence) {
      filteredEvents = filteredEvents.filter(event => event.sequence === filters.sequence);
    }
    
    // Filter by character involvement
    if (filters.characterId) {
      filteredEvents = filteredEvents.filter(event => 
        event.characterIds && event.characterIds.includes(filters.characterId)
      );
    }
    
    // Filter by world
    if (filters.worldId) {
      filteredEvents = filteredEvents.filter(event => event.worldId === filters.worldId);
    }
    
    return filteredEvents;
  };
  
  /**
   * Get events surrounding a specific event (before and after)
   * @param {Array} events - All timeline events
   * @param {String|Number} eventId - Target event ID
   * @param {Number} before - Number of events to include before
   * @param {Number} after - Number of events to include after
   * @returns {Object} Events before, current event, and events after
   */
  export const getSurroundingEvents = (events, eventId, before = 2, after = 2) => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      return { before: [], current: null, after: [] };
    }
    
    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => {
      if (a.date === b.date) return 0;
      return a.date < b.date ? -1 : 1;
    });
    
    // Find the index of the target event
    const targetIndex = sortedEvents.findIndex(event => event.id === eventId);
    if (targetIndex === -1) {
      return { before: [], current: null, after: [] };
    }
    
    // Get events before and after
    const eventsBefore = sortedEvents.slice(Math.max(0, targetIndex - before), targetIndex);
    const eventsAfter = sortedEvents.slice(targetIndex + 1, targetIndex + 1 + after);
    
    return {
      before: eventsBefore,
      current: sortedEvents[targetIndex],
      after: eventsAfter
    };
  };
  
  /**
   * Format timeline events for AI context
   * @param {Array} events - Timeline events to format
   * @param {Object} options - Formatting options
   * @returns {String} Formatted timeline context
   */
  export const formatTimelineForAI = (events, options = {}) => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      return '';
    }
    
    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => {
      if (a.date === b.date) return 0;
      return a.date < b.date ? -1 : 1;
    });
    
    // Group events by date for better organization
    const eventsByDate = {};
    sortedEvents.forEach(event => {
      if (!eventsByDate[event.date]) {
        eventsByDate[event.date] = [];
      }
      eventsByDate[event.date].push(event);
    });
    
    // Format the timeline
    let formattedTimeline = "# Timeline of Historical Events\n";
    
    Object.keys(eventsByDate).sort().forEach(date => {
      formattedTimeline += `\n## ${date}\n`;
      
      eventsByDate[date].forEach(event => {
        formattedTimeline += `- **${event.title}**: ${event.description || 'No description'}\n`;
        
        // Add location if available
        if (event.environmentId && options.environmentNames) {
          const locationName = options.environmentNames[event.environmentId] || 'Unknown location';
          formattedTimeline += `  Location: ${locationName}\n`;
        }
        
        // Add involved characters if available
        if (event.characterIds && event.characterIds.length > 0 && options.characterNames) {
          const characters = event.characterIds
            .map(id => options.characterNames[id] || id)
            .join(', ');
          formattedTimeline += `  People involved: ${characters}\n`;
        }
      });
    });
    
    return formattedTimeline;
  };
  
  /**
   * Creates a chronological narrative of events formatted for AI
   * @param {Array} events - Timeline events
   * @param {Object} options - Formatting options
   * @returns {String} Narrative timeline
   */
  export const createTimelineNarrative = (events, options = {}) => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      return '';
    }
    
    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => {
      if (a.date === b.date) return 0;
      return a.date < b.date ? -1 : 1;
    });
    
    let narrative = "# Historical Narrative\n\n";
    
    // Generate narrative paragraphs
    let currentDate = null;
    let paragraph = '';
    
    sortedEvents.forEach((event, index) => {
      // Start a new paragraph for each date
      if (event.date !== currentDate) {
        if (paragraph) {
          narrative += paragraph + "\n\n";
        }
        
        currentDate = event.date;
        paragraph = `In ${event.date}, `;
      } else {
        // Continue the same paragraph
        paragraph += options.useFormalLanguage ? '. Subsequently, ' : '. Then, ';
      }
      
      // Add event description
      paragraph += event.description || event.title;
      
      // Add location context if available
      if (event.environmentId && options.environmentNames) {
        const locationName = options.environmentNames[event.environmentId] || 'an unknown location';
        paragraph += ` at ${locationName}`;
      }
      
      // Add character context if available
      if (event.characterIds && event.characterIds.length > 0 && options.characterNames) {
        const characters = event.characterIds
          .map(id => options.characterNames[id] || 'someone')
          .join(', ');
        
        paragraph += ` involving ${characters}`;
      }
      
      // Add a period at the end if needed
      if (!paragraph.endsWith('.') && !paragraph.endsWith('!') && !paragraph.endsWith('?')) {
        paragraph += '.';
      }
    });
    
    // Add the last paragraph
    if (paragraph) {
      narrative += paragraph;
    }
    
    return narrative;
  };
  
  // src/components/timeline/TimelineContextGenerator.js
  import React, { useState, useEffect } from 'react';
  import { loadTimelineData, loadCharacters, loadEnvironments, loadWorlds } from '../../utils/storageExports';
  import { formatTimelineForAI, createTimelineNarrative, getFilteredEvents } from '../../utils/memory/timelineContext';
  
  function TimelineContextGenerator() {
    const [timelineData, setTimelineData] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [environments, setEnvironments] = useState([]);
    const [worlds, setWorlds] = useState([]);
    const [selectedWorldId, setSelectedWorldId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedSequence, setSelectedSequence] = useState('');
    const [formatType, setFormatType] = useState('standard');
    const [loading, setLoading] = useState(false);
    const [formattedContext, setFormattedContext] = useState('');
    
    // Load data on mount
    useEffect(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          // Load timeline data
          const timeline = await loadTimelineData();
          setTimelineData(timeline);
          
          // Set available sequences
          if (timeline && timeline.sequences && timeline.sequences.length > 0) {
            setSelectedSequence(timeline.sequences[0]);
          }
          
          // Load other data for context
          const charData = await loadCharacters();
          setCharacters(charData);
          
          const envData = await loadEnvironments();
          setEnvironments(envData);
          
          const worldData = await loadWorlds();
          setWorlds(worldData);
        } catch (error) {
          console.error('Error loading timeline data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }, []);
    
    // Generate context
    const generateContext = () => {
      if (!timelineData || !timelineData.events) {
        setFormattedContext('No timeline data available');
        return;
      }
      
      // Create filters
      const filters = {};
      if (selectedWorldId) filters.worldId = parseInt(selectedWorldId);
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (selectedSequence) filters.sequence = selectedSequence;
      
      // Get filtered events
      const filteredEvents = getFilteredEvents(timelineData.events, filters);
      
      if (filteredEvents.length === 0) {
        setFormattedContext('No events match the selected filters');
        return;
      }
      
      // Create lookup maps for names
      const characterNames = {};
      characters.forEach(char => {
        characterNames[char.id] = char.name;
      });
      
      const environmentNames = {};
      environments.forEach(env => {
        environmentNames[env.id] = env.name;
      });
      
      // Format context based on selected format
      let context = '';
      
      if (formatType === 'narrative') {
        context = createTimelineNarrative(filteredEvents, {
          characterNames,
          environmentNames,
          useFormalLanguage: true
        });
      } else {
        context = formatTimelineForAI(filteredEvents, {
          characterNames,
          environmentNames
        });
      }
      
      setFormattedContext(context);
    };
    
    return (
      <div className="timeline-context-generator">
        <h3>Timeline Context Generator</h3>
        
        <div className="generator-controls">
          <div className="control-row">
            <div className="control-group">
              <label>World:</label>
              <select
                value={selectedWorldId}
                onChange={(e) => setSelectedWorldId(e.target.value)}
                disabled={loading}
              >
                <option value="">All Worlds</option>
                {worlds.map(world => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="control-group">
              <label>Timeline:</label>
              <select
                value={selectedSequence}
                onChange={(e) => setSelectedSequence(e.target.value)}
                disabled={loading || !timelineData?.sequences}
              >
                <option value="">All Timelines</option>
                {timelineData?.sequences?.map(sequence => (
                  <option key={sequence} value={sequence}>
                    {sequence}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="control-row">
            <div className="control-group">
              <label>Start Date:</label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="e.g. Year 1000"
                disabled={loading}
              />
            </div>
            
            <div className="control-group">
              <label>End Date:</label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="e.g. Year 1100"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="control-row">
            <div className="control-group">
              <label>Format Type:</label>
              <select
                value={formatType}
                onChange={(e) => setFormatType(e.target.value)}
                disabled={loading}
              >
                <option value="standard">Standard (Date-based)</option>
                <option value="narrative">Narrative (Prose)</option>
              </select>
            </div>
            
            <button
              onClick={generateContext}
              disabled={loading}
              className="generate-button"
            >
              Generate Timeline Context
            </button>
          </div>
        </div>
        
        {formattedContext && (
          <div className="context-display">
            <h4>Timeline Context for AI</h4>
            <div className="context-preview">
              <pre>{formattedContext}</pre>
            </div>
            <div className="context-actions">
              <button onClick={() => navigator.clipboard.writeText(formattedContext)}>
                Copy to Clipboard
              </button>
              <button onClick={() => setFormattedContext('')}>
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  export default TimelineContextGenerator;
  
  // src/utils/memory/timelineMemoryProcessor.js
  /**
   * Functions to process timeline events into memories
   * This helps integrate timeline events with character memory systems
   */
  
  import { addMemory } from './memoryManager';
  
  /**
   * Process timeline events into character memories
   * @param {String|Number} characterId - Character ID 
   * @param {Array} events - Timeline events
   * @param {Object} options - Processing options
   * @returns {Array} Generated memory IDs
   */
  export const processTimelineToMemories = async (characterId, events, options = {}) => {
    if (!characterId || !events || !Array.isArray(events) || events.length === 0) {
      return [];
    }
    
    const memoryIds = [];
    const processedEvents = new Set(); // Track already processed events
    
    // Filter events relevant to this character
    const relevantEvents = events.filter(event => 
      event.characterIds && event.characterIds.includes(characterId)
    );
    
    for (const event of relevantEvents) {
      // Skip if already processed
      if (processedEvents.has(event.id)) continue;
      
      // Determine memory importance (1-10)
      // Higher importance for events explicitly mentioning the character
      const importance = options.defaultImportance || 
        (event.description && event.description.includes(options.characterName || '')) ? 8 : 5;
      
      // Format memory content
      let memoryContent = `${event.date}: ${event.title}`;
      if (event.description) {
        memoryContent += ` - ${event.description}`;
      }
      
      // Add location context if available
      if (event.environmentId && options.environmentNames) {
        memoryContent += ` at ${options.environmentNames[event.environmentId] || 'some location'}`;
      }
      
      // Add other characters involved
      if (event.characterIds && event.characterIds.length > 1 && options.characterNames) {
        const otherCharacters = event.characterIds
          .filter(id => id !== characterId)
          .map(id => options.characterNames[id] || 'someone')
          .join(', ');
        
        if (otherCharacters) {
          memoryContent += ` with ${otherCharacters}`;
        }
      }
      
      // Add memory
      try {
        const memoryId = await addMemory(
          characterId,
          memoryContent,
          'EVENT',
          importance
        );
        memoryIds.push(memoryId);
        processedEvents.add(event.id);
      } catch (error) {
        console.error(`Error creating memory for event ${event.id}:`, error);
      }
    }
    
    return memoryIds;
  };
  
  /**
   * Check if a new event should update existing memories
   * @param {Object} event - Timeline event
   * @param {Array} existingMemories - Existing memories
   * @returns {Object} Result with needsUpdate and relevantMemoryIds
   */
  export const checkForMemoryUpdates = (event, existingMemories) => {
    if (!event || !existingMemories || !Array.isArray(existingMemories)) {
      return { needsUpdate: false, relevantMemoryIds: [] };
    }
    
    // Look for memories that might contain this event
    const relevantMemoryIds = existingMemories
      .filter(memory => {
        // Check if memory mentions the event date
        const mentionsDate = memory.content && memory.content.includes(event.date);
        
        // Check if memory mentions the event title
        const mentionsTitle = memory.content && memory.content.includes(event.title);
        
        return mentionsDate && mentionsTitle;
      })
      .map(memory => memory.id);
    
    return {
      needsUpdate: relevantMemoryIds.length > 0,
      relevantMemoryIds
    };
  };
  
  // src/api/timeline-memories.js
  // A new API endpoint to generate memories from timeline events
  
  module.exports = async (req, res) => {
    // CORS and preflight handling similar to claude-api.js
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const { characterId, events, characterNames, environmentNames } = req.body;
      
      if (!characterId || !events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      
      // Get character name
      const characterName = characterNames && characterNames[characterId];
      
      // Process timeline events to memories
      const memoryIds = await processTimelineToMemories(characterId, events, {
        characterName,
        characterNames,
        environmentNames,
        defaultImportance: 6
      });
      
      return res.status(200).json({
        success: true,
        memoryCount: memoryIds.length,
        memoryIds
      });
      
    } catch (error) {
      console.error('Error processing timeline to memories:', error);
      return res.status(500).json({
        error: "Failed to create memories from timeline",
        message: error.message || "Unknown error"
      });
    }
  };