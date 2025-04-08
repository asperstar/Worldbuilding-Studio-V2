// src/pages/CampaignsIndexPage.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadWorlds } from '../utils/storage';

function CampaignsIndexPage() {
  const [worlds, setWorlds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadWorldsData = async () => {
      try {
        setIsLoading(true);
        const loadedWorlds = await loadWorlds();
        setWorlds(loadedWorlds || []);
      } catch (err) {
        console.error('Error loading worlds:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorldsData();
  }, []);

  if (isLoading) {
    return <div className="loading">Loading worlds...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="campaigns-index-page">
      <h1>Campaigns</h1>
      
      {worlds.length === 0 ? (
        <div className="empty-worlds">
          <p>You need to create a world first to host campaigns.</p>
          <Link to="/worlds" className="create-world-button">Create a World</Link>
        </div>
      ) : (
        <div className="worlds-list">
          <h2>Select a World to View Its Campaigns</h2>
          <ul className="world-link-cards">
            {worlds.map(world => (
              <li key={world.id} className="world-link-card">
                <h3>{world.name}</h3>
                <p>{world.description || 'No description available.'}</p>
                <Link to={`/worlds/${world.id}/campaigns`} className="view-campaigns-button">
                  View Campaigns
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CampaignsIndexPage;