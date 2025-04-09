// src/components/SidebarNavigation.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './SidebarNavigation.css';

function SidebarNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        <div className={`hamburger ${isOpen ? 'active' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div className="sidebar-backdrop" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar Navigation */}
      <div className={`sidebar-navigation ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1>Worldbuilding Studio</h1>
        </div>

        <nav className="sidebar-menu">
          <ul>
            <li className={isActive('/') ? 'active' : ''}>
              <Link to="/" onClick={() => isMobile && toggleSidebar()}>
                <span className="icon dashboard-icon"></span>
                <span className="label">Dashboard</span>
              </Link>
            </li>
            <li className={isActive('/characters') ? 'active' : ''}>
              <Link to="/characters" onClick={() => isMobile && toggleSidebar()}>
                <span className="icon character-icon"></span>
                <span className="label">Characters</span>
              </Link>
            </li>
            <li className={isActive('/environments') ? 'active' : ''}>
              <Link to="/environments" onClick={() => isMobile && toggleSidebar()}>
                <span className="icon environment-icon"></span>
                <span className="label">Environments</span>
              </Link>
            </li>
            <li className={isActive('/map') ? 'active' : ''}>
              <Link to="/map" onClick={() => isMobile && toggleSidebar()}>
                <span className="icon map-icon"></span>
                <span className="label">Map</span>
              </Link>
            </li>
            <li className={isActive('/timeline') ? 'active' : ''}>
              <Link to="/timeline" onClick={() => isMobile && toggleSidebar()}>
                <span className="icon timeline-icon"></span>
                <span className="label">Timeline</span>
              </Link>
            </li>
            <li className={isActive('/chat') ? 'active' : ''}>
              <Link to="/chat" onClick={() => isMobile && toggleSidebar()}>
                <span className="icon chat-icon"></span>
                <span className="label">Character Chat</span>
              </Link>
            </li>
            <li className={isActive('/worlds') ? 'active' : ''}>
              <Link to="/worlds" onClick={() => isMobile && toggleSidebar()}>
                <span className="icon world-icon"></span>
                <span className="label">Worlds</span>
              </Link>
            </li>
            <li className={isActive('/campaigns') ? 'active' : ''}>
              <Link to="/campaigns" onClick={() => isMobile && toggleSidebar()}>
                <span className="icon campaign-icon"></span>
                <span className="label">Campaigns</span>
              </Link>
            </li>
            <li className={isActive('/import-export') ? 'active' : ''}>
              <Link to="/import-export" onClick={() => isMobile && toggleSidebar()}>
                <span className="icon export-icon"></span>
                <span className="label">Import/Export</span>
              </Link>
            </li>
            <li className={isActive('/profile') ? 'active' : ''}>
              <Link to="/profile" onClick={() => isMobile && toggleSidebar()}>
                <span className="icon profile-icon"></span>
                <span className="label">Profile</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Footer with documentation link */}
        <div className="sidebar-footer">
          <Link to="/documentation" className="documentation-link">
            <span className="icon documentation-icon"></span>
            <span className="label">Documentation</span>
          </Link>
        </div>
      </div>
    </>
  );
}

export default SidebarNavigation;