import React, { useState, useEffect } from 'react';
import { loadCharacters, loadEnvironments, saveTimelineData, loadTimelineData, loadWorlds } from '../utils/storage';

function TimelinePage() {
  const [events, setEvents] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    sequence: '',
    characterIds: [],
    environmentId: '',
    color: '#3498db',
    worldId: ''
  });
  const [sequences, setSequences] = useState(['Main Timeline']);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newSequence, setNewSequence] = useState('');
  const [activeView, setActiveView] = useState('visual'); // 'visual' or 'list'
  const [availableWorlds, setAvailableWorlds] = useState([]);
  
  // Load all data on mount
  useEffect(() => {
    // Load worlds data
    const worlds = loadWorlds();
    setAvailableWorlds(worlds);
    
    // Load characters and environments
    setCharacters(loadCharacters());
    setEnvironments(loadEnvironments());
    
    // Load timeline data
    const timelineData = loadTimelineData();
    if (timelineData) {
      setEvents(timelineData.events || []);
      setSequences(timelineData.sequences || ['Main Timeline']);
    }
  }, []);
  
  // Save timeline data when it changes
  useEffect(() => {
    saveTimelineData({
      events,
      sequences
    });
  }, [events, sequences]);
  
  // Handle form field changes
  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setNewEvent({
      ...newEvent,
      [name]: value
    });
  };
  
  // Handle character selection checkboxes
  const handleCharacterChange = (e) => {
    const characterId = e.target.value;
    const isChecked = e.target.checked;
    
    setNewEvent(prev => {
      if (isChecked) {
        return {
          ...prev,
          characterIds: [...prev.characterIds, characterId]
        };
      } else {
        return {
          ...prev,
          characterIds: prev.characterIds.filter(id => id !== characterId)
        };
      }
    });
  };
  
  // Start editing an existing event
  const startEditing = (event) => {
    setEditingEvent(event);
    setNewEvent({
      ...event,
      // Make sure characterIds is always an array
      characterIds: event.characterIds || []
    });
    
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Add a new timeline sequence
  const addSequence = () => {
    if (newSequence.trim() && !sequences.includes(newSequence.trim())) {
      setSequences([...sequences, newSequence.trim()]);
      setNewSequence('');
    }
  };
  
  // Save a new event or update an existing one
  const saveEvent = () => {
    // Validate required fields
    if (!newEvent.title) {
      alert("Please enter an event title");
      return;
    }
    
    if (!newEvent.date) {
      alert("Please enter a date for this event");
      return;
    }
    
    if (!newEvent.sequence) {
      alert("Please select a timeline sequence");
      return;
    }
    
    if (editingEvent) {
      // Update existing event
      const updatedEvents = events.map(event => 
        event.id === editingEvent.id 
          ? { ...newEvent, id: event.id }
          : event
      );
      setEvents(updatedEvents);
      
      // Save to storage
      saveTimelineData({
        events: updatedEvents,
        sequences
      });
      
      setEditingEvent(null);
    } else {
      // Add new event with unique ID
      const newEventWithId = { 
        ...newEvent, 
        id: Date.now().toString()
      };
      
      const updatedEvents = [...events, newEventWithId];
      setEvents(updatedEvents);
      
      // Save to storage
      saveTimelineData({
        events: updatedEvents,
        sequences
      });
    }
    
    // Reset form
    setNewEvent({
      title: '',
      description: '',
      date: '',
      sequence: sequences[0],
      characterIds: [],
      environmentId: '',
      worldId: '', 
      color: '#3498db'
    });
  };
  
  // Cancel editing and reset form
  const cancelEditing = () => {
    setEditingEvent(null);
    setNewEvent({
      title: '',
      description: '',
      date: '',
      sequence: sequences[0],
      characterIds: [],
      environmentId: '',
      worldId: '',
      color: '#3498db'
    });
  };
  
  // Delete an event
  const deleteEvent = (eventId) => {
    const updatedEvents = events.filter(event => event.id !== eventId);
    setEvents(updatedEvents);
    
    // Also update storage
    saveTimelineData({
      events: updatedEvents,
      sequences
    });
  };
  
  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => {
    // Parse dates as strings for sorting
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateA.localeCompare(dateB);
  });
  
  // Group events by sequence
  const eventsBySequence = {};
  sequences.forEach(sequence => {
    eventsBySequence[sequence] = sortedEvents.filter(event => event.sequence === sequence);
  });
  
  // Get unique dates for the timeline
  const uniqueDates = Array.from(new Set(sortedEvents.map(event => event.date))).filter(Boolean);
  
  return (
    <div className="timeline-page">
      <h1>Timeline</h1>
      
      <div className="timeline-container">
        <div className="timeline-form-section">
          <h2>{editingEvent ? 'Edit Event' : 'Add New Event'}</h2>
          
          <div className="timeline-form">
            <form onSubmit={(e) => {
              e.preventDefault();
              saveEvent();
            }}>
              <div className="form-group">
                <label htmlFor="event-title">Event Title:</label>
                <input 
                  type="text"
                  id="event-title"
                  name="title"
                  value={newEvent.title}
                  onChange={handleEventChange}
                  required
                  placeholder="Battle of Emerald Plains, Royal Wedding, etc."
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="event-date">Date/Time:</label>
                  <input 
                    type="text"
                    id="event-date"
                    name="date"
                    value={newEvent.date}
                    onChange={handleEventChange}
                    required
                    placeholder="Year 1023, Day 7 of Summer, etc."
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="event-color">Event Color:</label>
                  <input 
                    type="color"
                    id="event-color"
                    name="color"
                    value={newEvent.color}
                    onChange={handleEventChange}
                    className="color-picker"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="event-sequence">Timeline Sequence:</label>
                <div className="sequence-selector">
                  <select 
                    id="event-sequence"
                    name="sequence"
                    value={newEvent.sequence}
                    onChange={handleEventChange}
                    required
                  >
                    <option value="">-- Select Timeline --</option>
                    {sequences.map(seq => (
                      <option key={seq} value={seq}>{seq}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="event-world">Associated World:</label>
                <select
                  id="event-world"
                  name="worldId"
                  value={newEvent.worldId || ''}
                  onChange={handleEventChange}
                >
                  <option value="">-- No Associated World --</option>
                  {availableWorlds && availableWorlds.map(world => (
                    <option key={world.id} value={world.id}>{world.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="new-sequence">Add New Timeline:</label>
                <div className="new-sequence">
                  <input 
                    type="text"
                    id="new-sequence"
                    value={newSequence}
                    onChange={(e) => setNewSequence(e.target.value)}
                    placeholder="New Timeline Name"
                  />
                  <button 
                    type="button" 
                    onClick={addSequence} 
                    className="add-sequence-button"
                    disabled={!newSequence.trim()}
                  >
                    Add Timeline
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="event-description">Description:</label>
                <textarea
                  id="event-description"
                  name="description"
                  value={newEvent.description}
                  onChange={handleEventChange}
                  rows="3"
                  placeholder="What happened during this event?"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="event-location">Location:</label>
                <select
                  id="event-location"
                  name="environmentId"
                  value={newEvent.environmentId}
                  onChange={handleEventChange}
                >
                  <option value="">-- No Location --</option>
                  {environments.map(env => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group characters-group">
                <label>Characters Involved:</label>
                <div className="characters-selector">
                  {characters.length === 0 ? (
                    <p>No characters available</p>
                  ) : (
                    <div className="character-checkboxes">
                      {characters.map(char => (
                        <div key={char.id} className="character-checkbox">
                          <input
                            type="checkbox"
                            id={`char-${char.id}`}
                            value={char.id}
                            checked={newEvent.characterIds.includes(char.id)}
                            onChange={handleCharacterChange}
                          />
                          <label htmlFor={`char-${char.id}`}>
                            {char.imageUrl ? (
                              <img 
                                src={char.imageUrl} 
                                alt={char.name}
                                className="character-thumbnail"
                              />
                            ) : (
                              <span className="character-initial">
                                {char.name ? char.name[0] : '?'}
                              </span>
                            )}
                            {char.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="submit-button">
                  {editingEvent ? 'Update Event' : 'Add to Timeline'}
                </button>
                
                {editingEvent && (
                  <button type="button" className="cancel-button" onClick={cancelEditing}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        
        <div className="timeline-view-section">
          <div className="view-header">
            <h2>Your Timeline</h2>
            
            <div className="view-toggle">
              <button 
                className={`view-button ${activeView === 'visual' ? 'active' : ''}`}
                onClick={() => setActiveView('visual')}
              >
                Visual Timeline
              </button>
              <button 
                className={`view-button ${activeView === 'list' ? 'active' : ''}`}
                onClick={() => setActiveView('list')}
              >
                List View
              </button>
            </div>
          </div>
          
          {events.length === 0 ? (
            <p className="empty-timeline">Add events to start building your timeline</p>
          ) : activeView === 'visual' ? (
            <div className="visual-timeline">
              <div className="timeline-ruler">
                {uniqueDates.map((date, index) => (
                  <div key={date} className="date-marker" style={{ top: `${index * 160 + 80}px` }}>
                    <div className="date-line"></div>
                    <div className="date-label">{date}</div>
                  </div>
                ))}
              </div>
              
              <div className="timeline-content">
                {sequences.map((sequence, seqIndex) => (
                  <div key={sequence} className="sequence-lane" style={{ left: `${seqIndex * 300 + 120}px` }}>
                    <div className="sequence-title">{sequence}</div>
                    
                    {eventsBySequence[sequence].map((event, eventIndex) => {
                      const dateIndex = uniqueDates.indexOf(event.date);
                      return (
                        <div 
                          key={event.id} 
                          className="timeline-event-card"
                          style={{ 
                            top: `${dateIndex * 160 + 50}px`,
                            backgroundColor: event.color || '#3498db',
                          }}
                        >
                          <h3>{event.title}</h3>
                          {event.description && <p className="event-description">{event.description.substring(0, 60)}...</p>}
                          
                          <div className="event-meta">
                            {event.environmentId && (
                              <div className="event-location">
                                📍 {environments.find(env => env.id === event.environmentId)?.name || 'Unknown'}
                              </div>
                            )}
                            
                            {event.worldId && (
                              <div className="event-world">
                                🌍 {availableWorlds.find(world => world.id === event.worldId)?.name || 'Unknown World'}
                              </div>
                            )}
                            
                            {event.characterIds && event.characterIds.length > 0 && (
                              <div className="event-characters">
                                👤 {event.characterIds.length} character{event.characterIds.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                          
                          <div className="event-actions">
                            <button onClick={() => startEditing(event)} className="edit-btn">Edit</button>
                            <button onClick={() => deleteEvent(event.id)} className="delete-btn">Delete</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="list-timeline">
              {uniqueDates.map(date => (
                <div key={date} className="timeline-date-group">
                  <h3 className="date-header">{date}</h3>
                  
                  <div className="date-events">
                    {sequences.map(sequence => {
                      const sequenceEvents = eventsBySequence[sequence].filter(event => event.date === date);
                      
                      return sequenceEvents.length > 0 ? (
                        <div key={sequence} className="sequence-events">
                          <h4 className="sequence-name">{sequence}</h4>
                          
                          <div className="event-cards">
                            {sequenceEvents.map(event => (
                              <div 
                                key={event.id} 
                                className="timeline-event"
                                style={{ 
                                  borderLeftColor: event.color || '#3498db'
                                }}
                              >
                                <div className="event-content">
                                  <h3>{event.title}</h3>
                                  
                                  {event.description && (
                                    <div className="event-description">{event.description}</div>
                                  )}
                                  
                                  <div className="event-details">
                                    {event.environmentId && (
                                      <div className="event-location">
                                        <strong>Location:</strong> {environments.find(env => env.id === event.environmentId)?.name || 'Unknown'}
                                      </div>
                                    )}
                                    
                                    {event.worldId && (
                                      <div className="event-world">
                                        <strong>World:</strong> {availableWorlds.find(world => world.id === event.worldId)?.name || 'Unknown World'}
                                      </div>
                                    )}
                                    
                                    {event.characterIds && event.characterIds.length > 0 && (
                                      <div className="event-characters">
                                        <strong>Characters:</strong> {event.characterIds.map(id => 
                                          characters.find(char => char.id === id)?.name || 'Unknown'
                                        ).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="event-actions">
                                    <button onClick={() => startEditing(event)} className="edit-button">Edit</button>
                                    <button onClick={() => deleteEvent(event.id)} className="delete-button">Delete</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TimelinePage;