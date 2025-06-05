// src/App.js - REPLACE your current App.js with this
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import './App.css';

// Import pages (keeping the ones that work)
import Dashboard from './pages/Dashboard';
import CharactersPage from './pages/CharactersPage';
import EnvironmentsPage from './pages/EnvironmentsPage';
import WorldsPage from './pages/WorldsPage';
import AuthPage from './pages/AuthPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignSessionPage from './pages/CampaignSessionPage';
import ChatPage from './pages/UpdatedChatPage';

// Import components
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const { currentUser, loading, error, logout } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading Worldbuilding Studio...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="app">
        {/* Show error if there is one */}
        {error && (
          <div className="global-error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Refresh</button>
          </div>
        )}

        {currentUser ? (
          <>
            {/* Toggle Button */}
            <button
              className="sidebar-toggle-button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? '✖' : '☰'}
            </button>

            {/* Sidebar Navigation */}
            <nav className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
              <h1>Worldbuilding Studio</h1>
              <ul className="sidebar-menu">
                <li><Link to="/" onClick={() => setIsSidebarOpen(false)}>Dashboard</Link></li>
                <li><Link to="/characters" onClick={() => setIsSidebarOpen(false)}>Characters</Link></li>
                <li><Link to="/environments" onClick={() => setIsSidebarOpen(false)}>Environments</Link></li>
                <li><Link to="/worlds" onClick={() => setIsSidebarOpen(false)}>Worlds</Link></li>
                <li><Link to="/campaigns" onClick={() => setIsSidebarOpen(false)}>Campaigns</Link></li>
                <li><Link to="/chat" onClick={() => setIsSidebarOpen(false)}>Character Chat</Link></li>
                <li><button onClick={logout} className="logout-button">Logout</button></li>
              </ul>
            </nav>

            {/* Main Content */}
            <main className={`main-content ${isSidebarOpen ? 'main-content-with-sidebar' : 'main-content-full'}`}>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/characters" element={<ProtectedRoute><CharactersPage /></ProtectedRoute>} />
                  <Route path="/environments" element={<ProtectedRoute><EnvironmentsPage /></ProtectedRoute>} />
                  <Route path="/worlds" element={<ProtectedRoute><WorldsPage /></ProtectedRoute>} />
                  <Route path="/worlds/:worldId/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
                  <Route path="/campaigns/:campaignId/session" element={<ProtectedRoute><CampaignSessionPage /></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                </Routes>
              </ErrorBoundary>
            </main>
          </>
        ) : (
          <AuthPage />
        )}
      </div>
    </HashRouter>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;