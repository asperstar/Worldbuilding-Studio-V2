// src/components/documentation/ProjectRoadmap.js
import React from 'react';
import './ProjectRoadmap.css';

function ProjectRoadmap() {
  return (
    <div className="project-roadmap">
      <h2>Roadmap and Plans</h2>
      
      <div className="roadmap-introduction">
        <p>
          Worldbuilding Studio is being developed to serve worldbuilders and roleplayers looking to
          organize and bring their fictional worlds to life. Starting with a core user base of friends
          and niche creative users, we aim to expand and connect with hundreds of players and creatives!
        </p>
      </div>
      
      <div className="roadmap-timeline">
        <div className="timeline-item current">
          <div className="timeline-marker"></div>
          <div className="timeline-content">
            <h3>Current Phase - Core Functionality</h3>
            <ul>
              <li>
                <strong>Character Creation</strong> - In-depth and customizable fields, 
                document upload, and writing samples for proper placement, 
                storage, and use of characters
              </li>
              <li>
                <strong>Environment Design</strong> - Create detailed locations with 
                descriptions, climate and terrain details
              </li>
              <li>
                <strong>Basic Map Functionality</strong> - Drag and drop environments and 
                characters onto a field, create connections
              </li>
              <li>
                <strong>User Authentication</strong> - Basic login and account management
              </li>
              <li>
                <strong>Timeline Events</strong> - Create a series of events for your world history
              </li>
              <li>
                <strong>Character Chat</strong> - Talk with your characters based on their personalities
              </li>
            </ul>
          </div>
        </div>
        
        <div className="timeline-item">
          <div className="timeline-marker"></div>
          <div className="timeline-content">
            <h3>Near Term (1-2 months)</h3>
            <ul>
              <li>
                <strong>Enhanced Map Builder</strong> - AI-assisted map generation, 
                connect locations, lay them out, describe parts of the map, and 
                feed to an AI to generate visual representations
              </li>
              <li>
                <strong>Campaign Sessions</strong> - Add characters to a world, build a storyline, 
                and let the AI play out the story in a roleplay
              </li>
              <li>
                <strong>Bug Fixes</strong> - Address timeline functionality issues, fix map nodes 
                not showing up, and resolve storage data inconsistencies
              </li>
              <li>
                <strong>Mobile-Responsive Layouts</strong> - Improve usability on various screen sizes
              </li>
              <li>
                <strong>Image Generation</strong> - Implement AI-powered image generation for characters
                and environments
              </li>
            </ul>
          </div>
        </div>
        
        <div className="timeline-item">
          <div className="timeline-marker"></div>
          <div className="timeline-content">
            <h3>Medium Term (3-6 months)</h3>
            <ul>
              <li>
                <strong>User Accounts</strong> - Enhanced user profiles and cross-device syncing
              </li>
              <li>
                <strong>Forums</strong> - Make forums and places to chat with other users about 
                your campaigns and roleplays
              </li>
              <li>
                <strong>Collaborative Campaigns</strong> - Invite other players and users to 
                play on your campaign
              </li>
              <li>
                <strong>Rich Text Editing</strong> - Enhanced editing for descriptions and notes
              </li>
              <li>
                <strong>Advanced Timeline Visualization</strong> - Interactive and visually 
                appealing timeline displays
              </li>
              <li>
                <strong>Game Mechanics Integration</strong> - Support for various RPG rule systems
              </li>
            </ul>
          </div>
        </div>
        
        <div className="timeline-item">
          <div className="timeline-marker"></div>
          <div className="timeline-content">
            <h3>Long Term (6+ months)</h3>
            <ul>
              <li>
                <strong>Monetization</strong> - Premium features to support ongoing development
              </li>
              <li>
                <strong>Public App Release</strong> - Move beyond friends and niche users to 
                broader availability
              </li>
              <li>
                <strong>AI-Generated Content</strong> - Enhanced AI integration for world elements,
                plot generation, and more
              </li>
              <li>
                <strong>Advanced Customization</strong> - More options to personalize your 
                worlds and campaigns
              </li>
              <li>
                <strong>API Access</strong> - Allow integration with other tools and platforms
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="current-challenges">
        <h3>Current Development Challenges</h3>
        <ul>
          <li>
            <strong>Storage of Data</strong> - Inconsistencies between updates and data persistence
          </li>
          <li>
            <strong>Map Functionality</strong> - Issues with map nodes not showing up correctly
          </li>
          <li>
            <strong>Timeline Feature</strong> - Currently broken and needs improvement
          </li>
          <li>
            <strong>AI Integration</strong> - Optimizing prompts and responses for character interactions
          </li>
          <li>
            <strong>Mobile Support</strong> - Improving layout and usability on mobile devices
          </li>
        </ul>
      </div>
      
      <div className="worlds-vs-environments">
        <h3>Design Concepts</h3>
        <p>
          <strong>Worlds vs Environments:</strong> Worlds are universes with their own defined rules that 
          are assigned in chats and roleplays and fed to the AI to show them what they can and cannot do!
          Environments are areas inside those worlds.
        </p>
        <p>
          <strong>Characters:</strong> Detailed profiles with personality, background, goals, and relationships
          that inform how they interact in chat sessions and campaigns.
        </p>
      </div>
    </div>
  );
}

export default ProjectRoadmap;