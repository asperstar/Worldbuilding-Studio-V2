// src/pages/Dashboard.js
import React from 'react';
import { Link } from 'react-router-dom';
import ImageGenerator from '../components/ImageGenerator'; // This import is correctly added

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="welcome-container">
          <h1>Welcome to Worldbuilding Studio!</h1>
          <div className="welcome-underline"></div>
          <p className="dashboard-subtitle">Create, organize, and bring your fictional worlds to life</p>
        </div>
      </div>
      
      <div className="feature-grid">
        {/* Characters Card */}
        <div className="feature-card">
          <div className="feature-icon character-icon"></div>
          <h2>Characters</h2>
          <p>Create detailed characters with personalities, traits and backgrounds</p>
          <Link to="/characters" className="feature-button">Create Characters</Link>
        </div>
        
        {/* Environments Card */}
        <div className="feature-card">
          <div className="feature-icon environment-icon"></div>
          <h2>Environments</h2>
          <p>Design locations with descriptions, climate and terrain details</p>
          <Link to="/environments" className="feature-button">Make Environments</Link>
        </div>
        
        {/* Map Card */}
        <div className="feature-card">
          <div className="feature-icon map-icon"></div>
          <h2>World Map</h2>
          <p>Create a visual map connecting characters and locations</p>
          <Link to="/map" className="feature-button">Build Map</Link>
        </div>
        
        {/* Timeline Card */}
        <div className="feature-card">
          <div className="feature-icon timeline-icon"></div>
          <h2>Timeline</h2>
          <p>Organize events and track your world's history</p>
          <Link to="/timeline" className="feature-button">Create Timeline</Link>
        </div>
        
        {/* Character Chat Card */}
        <div className="feature-card">
          <div className="feature-icon chat-icon"></div>
          <h2>Character Chat</h2>
          <p>Talk with your characters based on their personalities</p>
          <Link to="/chat" className="feature-button">Start Chatting</Link>
        </div>
        
        {/* AI Image Generator Card */}
        <div className="feature-card">
          <div className="feature-icon image-icon"></div>
          <h2>AI Image Generator</h2>
          <p>Generate images for characters and environments</p>
          <button 
            className="feature-button" 
            onClick={() => document.getElementById('image-generator-section').scrollIntoView({ behavior: 'smooth' })}
          >
            Generate Images
          </button>
        </div>
        
        {/* Import & Export Card */}
        <div className="feature-card">
          <div className="feature-icon export-icon"></div>
          <h2>Import & Export</h2>
          <p>Share your creations and collaborate with others</p>
          <Link to="/import-export" className="feature-button">Share Worlds</Link>
        </div>
        
        {/* Make Worlds Feature */}
        <div className="feature-card">
          <div className="feature-icon world-icon"></div>
          <h2>World Settings</h2>
          <p>Configure global settings for your fictional world</p>
          <Link to="/world-settings" className="feature-button">Configure World</Link>
        </div>
      </div>
      
      {/* AI Image Generator Section */}
      <div id="image-generator-section" className="dashboard-section">
        <h2>AI Image Generator</h2>
        <p>Create images for your characters, environments, and more.</p>
        <ImageGenerator />
      </div>
    </div>
  );
}

export default Dashboard;