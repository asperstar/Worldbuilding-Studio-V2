// src/pages/TimelinePage.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useStorage } from '../contexts/StorageContext';
import './TimelinePage.css';



function TimelinePage() {
  const { currentUser } = useStorage();
  const [worlds, setWorlds] = useState([]);
  const [selectedWorld, setSelectedWorld] = useState(null);
  const [timelines, setTimelines] = useState([]);
  const [selectedTimeline, setSelectedTimeline] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [events, setEvents] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [newPeriod, setNewPeriod] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    tone: 'light'
  });
  const [newEvent, setNewEvent] = useState({
    periodId: '',
    title: '',
    description: '',
    date: '',
    characterIds: [],
    environmentId: '',
    color: '#3498db',
    worldId: ''
  });
  const [newCollision, setNewCollision] = useState({
    sourceTimelineId: '',
    sourceEventId: '',
    targetTimelineId: '',
    targetPeriodId: '',
    description: ''
  });
  const [collisions, setCollisions] = useState([]);
  const [newTimelineName, setNewTimelineName] = useState('');
  const [activeView, setActiveView] = useState('visual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setError('Please log in.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        // Load worlds (unchanged)
      const worldsCollection = collection(db, 'worlds');
      const worldsQuery = query(worldsCollection, where('userId', '==', currentUser.uid));
      const worldsSnapshot = await getDocs(worldsQuery);
      const worldsList = worldsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
      setWorlds(worldsList);
      if (worldsList.length > 0 && !selectedWorld) {
        setSelectedWorld(worldsList[0]);
      }

      // Load characters for selected world
      if (selectedWorld) {
        const charactersCollection = collection(db, 'characters');
        const charactersQuery = query(
          charactersCollection,
          where('userId', '==', currentUser.uid),
          where('projectId', '==', selectedWorld.id) // Add this filter
        );
        const charactersSnapshot = await getDocs(charactersQuery);
        const charactersList = charactersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
        setCharacters(charactersList);

        // Load environments for selected world
        const environmentsCollection = collection(db, 'environments');
        const environmentsQuery = query(
          environmentsCollection,
          where('userId', '==', currentUser.uid),
          where('projectId', '==', selectedWorld.id) // Add this filter
        );
        const environmentsSnapshot = await getDocs(environmentsQuery);
        const environmentsList = environmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
        setEnvironments(environmentsList);
      }

        // Load collisions - only get ones relevant to this user
        const collisionsCollection = collection(db, 'collisions');
        const collisionsQuery = query(collisionsCollection, where('userId', '==', currentUser.uid));
        const collisionsSnapshot = await getDocs(collisionsQuery);
        const collisionsList = collisionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
        setCollisions(collisionsList);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser, selectedWorld]);

  useEffect(() => {
    const fetchTimelinesAndPeriods = async () => {
      if (!selectedWorld || !currentUser) return;
  
      try {
        setLoading(true);
  
        // Query timelines for the selected world and current user
        const timelineCollection = collection(db, 'timelines');
        const timelineQuery = query(
          timelineCollection,
          where('worldId', '==', selectedWorld.id),
          where('userId', '==', currentUser.uid)
        );
        const timelineSnapshot = await getDocs(timelineQuery);
        const worldTimelines = timelineSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
        setTimelines(worldTimelines);
  
        if (worldTimelines.length > 0) {
          setSelectedTimeline(worldTimelines[0]);
  
          // Query periods for the selected timeline
          const periodsCollection = collection(db, 'periods');
          const periodsQuery = query(
            periodsCollection,
            where('timelineId', '==', worldTimelines[0].id),
            where('userId', '==', currentUser.uid)
          );
          const periodsSnapshot = await getDocs(periodsQuery);
          const timelinePeriods = periodsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
          setPeriods(timelinePeriods);
  
          // Query events for the selected timeline
          const eventsCollection = collection(db, 'events');
          const eventsQuery = query(
            eventsCollection,
            where('timelineId', '==', worldTimelines[0].id),
            where('userId', '==', currentUser.uid)
          );
          const eventsSnapshot = await getDocs(eventsQuery);
          const timelineEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
          setEvents(timelineEvents);
        } else {
          setPeriods([]);
          setEvents([]);
        }
      } catch (err) {
        console.error('Error fetching timelines and periods:', err);
        setError('Failed to load timelines and periods.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchTimelinesAndPeriods();
  }, [selectedWorld, currentUser]);

  const createTimeline = async () => {
    if (!newTimelineName.trim() || !selectedWorld) {
      alert('Please enter a timeline name and select a world.');
      return;
    }
  
    try {
      setLoading(true);
      const newTimeline = {
        name: newTimelineName.trim(),
        userId: currentUser.uid,
        worldId: selectedWorld.id,
        createdAt: new Date().toISOString(),
        updated: new Date().toISOString()
      };
      
      const timelineRef = await addDoc(collection(db, 'timelines'), newTimeline);
      const createdTimeline = { ...newTimeline, id: timelineRef.id };
      setTimelines([...timelines, createdTimeline]);
      setSelectedTimeline(createdTimeline);
      setPeriods([]);
      setEvents([]);
      setNewTimelineName('');
    } catch (err) {
      console.error('Error creating timeline:', err);
      setError('Failed to create timeline.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTimeline = async (timelineId) => {
    try {
      await deleteDoc(doc(db, 'timelines', timelineId));
      setTimelines(timelines.filter(timeline => timeline.id !== timelineId));
      if (selectedTimeline?.id === timelineId) {
        setSelectedTimeline(timelines[0] || null);
        setPeriods([]);
        setEvents([]);
      }
    } catch (err) {
      console.error('Error deleting timeline:', err);
      setError('Failed to delete timeline.');
    }
  };

  const switchTimeline = async (timeline) => {
    setSelectedTimeline(timeline);
  
    try {
      // Query periods for the selected timeline
      const periodsCollection = collection(db, 'periods');
      const periodsQuery = query(
        periodsCollection,
        where('timelineId', '==', timeline.id),
        where('userId', '==', currentUser.uid)
      );
      const periodsSnapshot = await getDocs(periodsQuery);
      const timelinePeriods = periodsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
      setPeriods(timelinePeriods);
  
      // Query events for the selected timeline
      const eventsCollection = collection(db, 'events');
      const eventsQuery = query(
        eventsCollection,
        where('timelineId', '==', timeline.id),
        where('userId', '==', currentUser.uid)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const timelineEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
      setEvents(timelineEvents);
    } catch (err) {
      console.error('Error switching timeline:', err);
      setError('Failed to load periods and events for the selected timeline.');
    }
  };

  const addPeriod = async () => {
    if (!newPeriod.title.trim() || !selectedTimeline) {
      alert('Please enter a period title and select a timeline.');
      return;
    }
  
    try {
      setLoading(true);
      const periodData = {
        ...newPeriod,
        timelineId: selectedTimeline.id,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        updated: new Date().toISOString()
      };
      
      const periodRef = await addDoc(collection(db, 'periods'), periodData);
      setPeriods([...periods, { ...periodData, id: periodRef.id }]);
      setNewPeriod({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        tone: 'light'
      });
    } catch (err) {
      console.error('Error adding period:', err);
      setError('Failed to add period.');
    } finally {
      setLoading(false);
    }
  };

  const deletePeriod = async (periodId) => {
    try {
      await deleteDoc(doc(db, 'periods', periodId));
      setPeriods(periods.filter(period => period.id !== periodId));
      setEvents(events.filter(event => event.periodId !== periodId));
    } catch (err) {
      console.error('Error deleting period:', err);
      setError('Failed to delete period.');
    }
  };

  const addEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.periodId) {
      alert('Please fill in all required event fields.');
      return;
    }

    try {
      const eventData = {
        ...newEvent,
        timelineId: selectedTimeline.id,
        worldId: selectedWorld.id,
        userId: currentUser.uid, // Add userId to match Firebase rules
        createdAt: new Date().toISOString()
      };
      const eventRef = await addDoc(collection(db, 'events'), eventData);
      setEvents([...events, { ...eventData, id: eventRef.id }]);
      setNewEvent({
        periodId: '',
        title: '',
        description: '',
        date: '',
        characterIds: [],
        environmentId: '',
        color: '#3498db',
        worldId: ''
      });
    } catch (err) {
      console.error('Error adding event:', err);
      setError('Failed to add event.');
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setEvents(events.filter(event => event.id !== eventId));
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event.');
    }
  };

  const addCollision = async () => {
    if (!newCollision.sourceTimelineId || !newCollision.sourceEventId || !newCollision.targetTimelineId || !newCollision.targetPeriodId) {
      alert('Please fill in all collision fields.');
      return;
    }

    try {
      const collisionData = {
        ...newCollision,
        userId: currentUser.uid, // Add userId to match Firebase rules
        createdAt: new Date().toISOString()
      };
      const collisionRef = await addDoc(collection(db, 'collisions'), collisionData);
      setCollisions([...collisions, { ...collisionData, id: collisionRef.id }]);
      setNewCollision({
        sourceTimelineId: '',
        sourceEventId: '',
        targetTimelineId: '',
        targetPeriodId: '',
        description: ''
      });
    } catch (err) {
      console.error('Error adding collision:', err);
      setError('Failed to add collision.');
    }
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setNewEvent({ ...newEvent, [name]: value });
  };

  const handleCharacterChange = (e) => {
    const characterId = e.target.value;
    const isChecked = e.target.checked;
    setNewEvent(prev => ({
      ...prev,
      characterIds: isChecked
        ? [...prev.characterIds, characterId]
        : prev.characterIds.filter(id => id !== characterId)
    }));
  };

  const handlePeriodChange = (e) => {
    const { name, value } = e.target;
    setNewPeriod({ ...newPeriod, [name]: value });
  };

  const handleCollisionChange = (e) => {
    const { name, value } = e.target;
    setNewCollision({ ...newCollision, [name]: value });
  };

  if (loading) {
    return <div className="loading-container">Loading timelines...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => window.location.reload()} className="retry-button">Try Again</button>
      </div>
    );
  }

  if (!currentUser) {
    return <div className="unauthorized">Please log in to access timelines.</div>;
  }

  return (
    <div className="timeline-page">
      <h1>Timelines</h1>

      {/* World Selector */}
      <div className="world-selector">
        <h2>Select World</h2>
        <select
          value={selectedWorld?.id || ''}
          onChange={(e) => {
            const world = worlds.find(w => w.id === e.target.value);
            setSelectedWorld(world);
          }}
        >
          {worlds.length === 0 ? (
            <option value="">No worlds available</option>
          ) : (
            worlds.map(world => (
              <option key={world.id} value={world.id}>{world.name}</option>
            ))
          )}
        </select>
      </div>

      {/* Timeline Selector */}
      <div className="timeline-selector">
        <h2>Timelines in {selectedWorld?.name || 'Selected World'}</h2>
        <div className="timeline-tabs">
          {timelines.map(timeline => (
            <div
              key={timeline.id}
              className={`timeline-tab ${selectedTimeline?.id === timeline.id ? 'active' : ''}`}
              onClick={() => switchTimeline(timeline)}
            >
              {timeline.name}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTimeline(timeline.id);
                }} 
                className="delete-btn"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="new-timeline">
          <input
            type="text"
            value={newTimelineName}
            onChange={(e) => setNewTimelineName(e.target.value)}
            placeholder="New Timeline Name"
            disabled={!selectedWorld}
          />
          <button 
            onClick={createTimeline} 
            disabled={!newTimelineName.trim() || !selectedWorld}
          >
            Create Timeline
          </button>
        </div>
      </div>

      {/* Add Period Form */}
      <div className="period-form-section">
        <h2>Add Period</h2>
        <div className="period-form">
          <input
            type="text"
            name="title"
            value={newPeriod.title}
            onChange={handlePeriodChange}
            placeholder="Period Title"
            disabled={!selectedTimeline}
          />
          <textarea
            name="description"
            value={newPeriod.description}
            onChange={handlePeriodChange}
            placeholder="Description"
            disabled={!selectedTimeline}
          />
          <input
            type="text"
            name="startDate"
            value={newPeriod.startDate}
            onChange={handlePeriodChange}
            placeholder="Start Date"
            disabled={!selectedTimeline}
          />
          <input
            type="text"
            name="endDate"
            value={newPeriod.endDate}
            onChange={handlePeriodChange}
            placeholder="End Date"
            disabled={!selectedTimeline}
          />
          <select 
            name="tone" 
            value={newPeriod.tone} 
            onChange={handlePeriodChange}
            disabled={!selectedTimeline}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <button 
            onClick={addPeriod} 
            disabled={!selectedTimeline || !newPeriod.title}
          >
            Add Period
          </button>
        </div>
      </div>

      {/* Add Event Form */}
      <div className="event-form-section">
        <h2>Add Event</h2>
        <div className="event-form">
          <select
            name="periodId"
            value={newEvent.periodId}
            onChange={handleEventChange}
            disabled={!selectedTimeline || periods.length === 0}
          >
            <option value="">Select Period</option>
            {periods.map(period => (
              <option key={period.id} value={period.id}>{period.title}</option>
            ))}
          </select>
          <input
            type="text"
            name="title"
            value={newEvent.title}
            onChange={handleEventChange}
            placeholder="Event Title"
            disabled={!newEvent.periodId}
          />
          <textarea
            name="description"
            value={newEvent.description}
            onChange={handleEventChange}
            placeholder="Description"
            disabled={!newEvent.periodId}
          />
          <input
            type="text"
            name="date"
            value={newEvent.date}
            onChange={handleEventChange}
            placeholder="Date"
            disabled={!newEvent.periodId}
          />
          <input
            type="color"
            name="color"
            value={newEvent.color}
            onChange={handleEventChange}
            disabled={!newEvent.periodId}
          />
          <select
            name="environmentId"
            value={newEvent.environmentId}
            onChange={handleEventChange}
            disabled={!newEvent.periodId}
          >
            <option value="">Select Location</option>
            {environments.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <div className="characters-selector">
            {characters.map(char => (
              <label key={char.id}>
                <input
                  type="checkbox"
                  value={char.id}
                  checked={newEvent.characterIds.includes(char.id)}
                  onChange={handleCharacterChange}
                  disabled={!newEvent.periodId}
                />
                {char.name}
              </label>
            ))}
          </div>
          <button 
            onClick={addEvent} 
            disabled={!newEvent.title || !newEvent.date || !newEvent.periodId}
          >
            Add Event
          </button>
        </div>
      </div>

      {/* Add Collision Form */}
      <div className="collision-form-section">
        <h2>Add Timeline Collision</h2>
        <div className="collision-form">
          <select
            name="sourceTimelineId"
            value={newCollision.sourceTimelineId}
            onChange={handleCollisionChange}
            disabled={timelines.length === 0}
          >
            <option value="">Source Timeline</option>
            {timelines.map(timeline => (
              <option key={timeline.id} value={timeline.id}>{timeline.name}</option>
            ))}
          </select>
          <select
            name="sourceEventId"
            value={newCollision.sourceEventId}
            onChange={handleCollisionChange}
            disabled={!newCollision.sourceTimelineId || events.filter(event => event.timelineId === newCollision.sourceTimelineId).length === 0}
          >
            <option value="">Source Event</option>
            {events
              .filter(event => event.timelineId === newCollision.sourceTimelineId)
              .map(event => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
          </select>
          <select
            name="targetTimelineId"
            value={newCollision.targetTimelineId}
            onChange={handleCollisionChange}
            disabled={!newCollision.sourceTimelineId}
          >
            <option value="">Target Timeline</option>
            {timelines.map(timeline => (
              <option key={timeline.id} value={timeline.id}>{timeline.name}</option>
            ))}
          </select>
          <select
            name="targetPeriodId"
            value={newCollision.targetPeriodId}
            onChange={handleCollisionChange}
            disabled={!newCollision.targetTimelineId || periods.filter(period => period.timelineId === newCollision.targetTimelineId).length === 0}
          >
            <option value="">Target Period</option>
            {periods
              .filter(period => period.timelineId === newCollision.targetTimelineId)
              .map(period => (
                <option key={period.id} value={period.id}>{period.title}</option>
              ))}
          </select>
          <textarea
            name="description"
            value={newCollision.description}
            onChange={handleCollisionChange}
            placeholder="Collision Description"
            disabled={!newCollision.targetPeriodId}
          />
          <button 
            onClick={addCollision}
            disabled={!newCollision.sourceTimelineId || !newCollision.sourceEventId || !newCollision.targetTimelineId || !newCollision.targetPeriodId}
          >
            Add Collision
          </button>
        </div>
      </div>

      {/* Timeline View */}
      <div className="timeline-view-section">
        <div className="view-header">
          <h2>{selectedTimeline?.name || 'Timeline'}</h2>
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

        {activeView === 'visual' ? (
          <div className="visual-timeline">
            {selectedTimeline ? (
              <div key={selectedTimeline.id} className="timeline-lane">
                <h3>{selectedTimeline.name}</h3>
                {periods
                  .filter(period => period.timelineId === selectedTimeline.id)
                  .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
                  .map(period => (
                    <div
                      key={period.id}
                      className={`period-block ${period.tone}`}
                      style={{ marginBottom: '20px' }}
                    >
                      <h4>{period.title} ({period.startDate || 'unknown'} - {period.endDate || 'unknown'})</h4>
                      <p>{period.description || 'No description'}</p>
                      <button onClick={() => deletePeriod(period.id)}>Delete Period</button>
                      <div className="events">
                        {events
                          .filter(event => event.periodId === period.id)
                          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                          .map(event => (
                            <div
                              key={event.id}
                              className="event-card"
                              style={{ backgroundColor: event.color || '#3498db' }}
                            >
                              <h5>{event.title} ({event.date || 'unknown'})</h5>
                              <p>{event.description || 'No description'}</p>
                              <p>Location: {environments.find(env => env.id === event.environmentId)?.name || 'None'}</p>
                              <p>Characters: {event.characterIds ? event.characterIds.map(id => characters.find(char => char.id === id)?.name || 'Unknown').join(', ') : 'None'}</p>
                              <button onClick={() => deleteEvent(event.id)}>Delete</button>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="no-timeline-message">Select or create a timeline to view it</p>
            )}
            
            {/* Display Collisions */}
            {collisions.length > 0 && (
              <div className="collisions">
                <h3>Timeline Collisions</h3>
                {collisions.map(collision => {
                  const sourceEvent = events.find(e => e.id === collision.sourceEventId);
                  const targetPeriod = periods.find(p => p.id === collision.targetPeriodId);
                  const sourceTimeline = timelines.find(t => t.id === collision.sourceTimelineId);
                  const targetTimeline = timelines.find(t => t.id === collision.targetTimelineId);
                  
                  return (
                    <div key={collision.id} className="collision-line">
                      <p>
                        {sourceEvent?.title || 'Unknown Event'} in {sourceTimeline?.name || 'Unknown Timeline'} → 
                        {targetPeriod?.title || 'Unknown Period'} in {targetTimeline?.name || 'Unknown Timeline'}: 
                        {collision.description || 'No description'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="list-timeline">
            {selectedTimeline ? (
              <div key={selectedTimeline.id}>
                <h3>{selectedTimeline.name}</h3>
                {periods
                  .filter(period => period.timelineId === selectedTimeline.id)
                  .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
                  .map(period => (
                    <div key={period.id} className="period-list-item">
                      <h4>{period.title} ({period.startDate || 'unknown'} - {period.endDate || 'unknown'}) - {period.tone}</h4>
                      <p>{period.description || 'No description'}</p>
                      <button onClick={() => deletePeriod(period.id)}>Delete Period</button>
                      <ul>
                        {events
                          .filter(event => event.periodId === period.id)
                          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                          .map(event => (
                            <li key={event.id}>
                              <strong>{event.title} ({event.date || 'unknown'})</strong>: {event.description || 'No description'}
                              <br />
                              Location: {environments.find(env => env.id === event.environmentId)?.name || 'None'}
                              <br />
                              Characters: {event.characterIds ? event.characterIds.map(id => characters.find(char => char.id === id)?.name || 'Unknown').join(', ') : 'None'}
                              <button onClick={() => deleteEvent(event.id)}>Delete</button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="no-timeline-message">Select or create a timeline to view it</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TimelinePage;