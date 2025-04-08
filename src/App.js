import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './utils/firebase';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { StorageProvider } from './contexts/StorageContext';
import { Link } from 'react-router-dom';
import './App.css';
// In App.js, add this import:
import FantasyMapGenerator from './components/maps/FantasyMapGenerator';
import Dashboard from './pages/Dashboard';
import CharactersPage from './pages/CharactersPage';
import EnvironmentsPage from './pages/EnvironmentsPage';
import MapPage from './pages/MapPage';
import TimelinePage from './pages/TimelinePage';
import ChatPage from './pages/ChatPage';
import ImportExportPage from './pages/ImportExportPage';
import DecorativeElements from './components/DecorativeElements';
// In your App.js or index.js (or whatever is your top-level component)
import ErrorSuppressor from './components/ErrorSuppressor';
import CharacterMemoriesPage from './pages/CharacterMemoriesPage';
// Add these imports at the top of your App.js file
import WorldsPage from './pages/WorldsPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignSessionPage from './pages/CampaignSessionPage';
import CampaignsIndexPage from './pages/CampaignsIndexPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import DocumentationPage from './pages/DocumentationPage';
import DebugPage from './pages/DebugPage';

// Navigation component
function Navigation() {
  return (
    <nav className="navigation">
      <h1>Worldbuilding Studio</h1>
      <ul>
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/characters">Characters</Link></li>
        <li><Link to="/environments">Environments</Link></li>
        <li><Link to="/map">Map</Link></li>
        <li><Link to="/timeline">Timeline</Link></li>
        <li><Link to="/chat">Character Chat</Link></li>
        <li><Link to="/worlds">Worlds</Link></li>
        <li><Link to="/campaigns">Campaign</Link></li>
        <li><Link to="/import-export">Import/Export</Link></li>
        <li><Link to="/profile">Profile</Link></li>
        <li><Link to="/documentation">Documentation</Link></li>
      </ul>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <StorageProvider>
      <HashRouter>
        <div className="app">
          {user ? (
            <>
              <DecorativeElements />
              <Navigation />
              <main className="main-content">
                <ErrorSuppressor>
                  <Routes>
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/characters" element={<ProtectedRoute><CharactersPage /></ProtectedRoute>} />
                    <Route path="/characters/:characterId/memories" element={<ProtectedRoute><CharacterMemoriesPage /></ProtectedRoute>} />
                    <Route path="/environments" element={<ProtectedRoute><EnvironmentsPage /></ProtectedRoute>} />
                    <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
                    <Route path="/timeline" element={<ProtectedRoute><TimelinePage /></ProtectedRoute>} />
                    <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                    <Route path="/import-export" element={<ProtectedRoute><ImportExportPage /></ProtectedRoute>} />
                    <Route path="/worlds" element={<ProtectedRoute><WorldsPage /></ProtectedRoute>} />
                    <Route path="/worlds/:worldId/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
                    <Route path="/campaigns/:campaignId/session" element={<ProtectedRoute><CampaignSessionPage /></ProtectedRoute>} />
                    <Route path="/campaigns" element={<ProtectedRoute><CampaignsIndexPage /></ProtectedRoute>} />
                    <Route path="/map/fantasy" element={<ProtectedRoute><FantasyMapGenerator /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/documentation" element={<ProtectedRoute><DocumentationPage /></ProtectedRoute>} />
                    <Route path="/debug" element={<ProtectedRoute><DebugPage /></ProtectedRoute>} />
                  </Routes>
                </ErrorSuppressor>
              </main>
            </>
          ) : (
            <AuthPage />
          )}
        </div>
      </HashRouter>
    </StorageProvider>
  );
}

// Add to your index.js or main App.js file
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('ResizeObserver loop')) {
      return;
    }
    originalError(...args);
  };
}
export default App;