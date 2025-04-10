import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';

function WorldSelectionPage() {
  const { getWorlds } = useStorage();
  const [worlds, setWorlds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorlds = async () => {
      setLoading(true);
      try {
        const fetchedWorlds = await getWorlds();
        setWorlds(fetchedWorlds);
      } catch (err) {
        console.error('Error fetching worlds:', err);
        setError('Failed to load worlds. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchWorlds();
  }, [getWorlds]);

  const handleSelectWorld = (worldId) => {
    navigate(`/map/${worldId}`); // Fix: Navigate to `/map/:worldId`
  };

  if (loading) {
    return <div className="loading">Loading worlds...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="world-selection-page">
      <h1>Select a World</h1>
      <Link to="/worlds" className="create-world-button">
        Create New World
      </Link>
      {worlds.length === 0 ? (
        <p>No worlds available. Create a new world to get started.</p>
      ) : (
        <ul>
          {worlds.map(world => (
            <li key={world.id} onClick={() => handleSelectWorld(world.id)}>
              {world.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default WorldSelectionPage;