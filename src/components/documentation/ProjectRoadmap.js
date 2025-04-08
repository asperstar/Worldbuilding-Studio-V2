// src/components/documentation/ProjectRoadmap.js
import React from 'react';

function ProjectRoadmap() {
  return (
    <div className="project-roadmap">
      <h2>Roadmap and Plans</h2>
      
      <div className="roadmap-section">
        <h3>Current Stage</h3>
        <p>
          Right now, this app is in development to be used mainly by my friends and a
          niche of worldbuilders and roleplayers.
        </p>
        <p>
          Through development, we can connect with hundreds of players and creatives!
        </p>
      </div>
      
      <div className="roadmap-timeline">
        <h3>Development Timeline</h3>
        
        <div className="timeline-item current">
          <div className="timeline-marker"></div>
          <div className="timeline-content">
            <h4>Current - Core Functionality</h4>
            <ul>
              <li>Character creation and management</li>
              <li>Environment design</li>
              <li>Basic map functionality</li>
              <li>User authentication</li>
              <li>Timeline events</li>
            </ul>
          </div>
        </div>
        
        <div className="timeline-item">
          <div className="timeline-marker"></div>
          <div className="timeline-content">
            <h4>Near Term (1-2 months)</h4>
            <ul>
              <li>AI-powered image generation</li>
              <li>Enhanced map builder with AI assistance</li>
              <li>Campaign sessions with character dialogue</li>
              <li>Mobile-responsive layouts</li>
              <li>Bug fixes and performance improvements</li>
            </ul>
          </div>
        </div>
        
        <div className="timeline-item">
          <div className="timeline-marker"></div>
          <div className="timeline-content">
            <h4>Medium Term (3-6 months)</h4>
            <ul>
              <li>Sharing functionality between users</li>
              <li>Rich text editing for descriptions</li>
              <li>Enhanced AI character interactions</li>
              <li>Advanced timeline visualization</li>
              <li>Game mechanics integration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectRoadmap;