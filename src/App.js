import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './utils/firebase';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { StorageProvider } from './contexts/StorageContext';
import { Link } from 'react-router-dom';
import './App.css';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

// Import components and pages
import Dashboard from './pages/Dashboard';
import CharactersPage from './pages/CharactersPage';
import EnvironmentsPage from './pages/EnvironmentsPage';
import MapPage from './pages/MapPage';
import TimelinePage from './pages/TimelinePage';
import ChatPage from './pages/ChatPage';
import ImportExportPage from './pages/ImportExportPage';
import ErrorSuppressor from './components/ErrorSuppressor';
import CharacterMemoriesPage from './pages/CharacterMemoriesPage';
import WorldsPage from './pages/WorldsPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignSessionPage from './pages/CampaignSessionPage';
import CampaignsIndexPage from './pages/CampaignsIndexPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import DocumentationPage from './pages/DocumentationPage';
import DebugPage from './pages/DebugPage';
import DecorativeElements from './components/DecorativeElements';
import AzgaarMapIframe from './components/maps/AzgaarMapIframe';
import LoginPage from 'pages/LoginPage';
import WorldSelectionPage from './pages/WorldSelectionPage'; // Add this import

function App() {
  const [user, setUser] = useState(null);
  const [loading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading Worldbuilding Studio...</p>
      </div>
    );
  }

  return (
    <StorageProvider>
      <HashRouter>
        <div className="app">
          {user ? (
            <>
              <DecorativeElements />

              {/* Toggle Button */}
              <button
                className="sidebar-toggle-button"
                onClick={toggleSidebar}
                aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
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
                  <li><Link to="/map" onClick={() => setIsSidebarOpen(false)}>Map</Link></li>
                  <li><Link to="/timeline" onClick={() => setIsSidebarOpen(false)}>Timeline</Link></li>
                  <li><Link to="/chat" onClick={() => setIsSidebarOpen(false)}>Character Chat</Link></li>
                  <li><Link to="/worlds" onClick={() => setIsSidebarOpen(false)}>Worlds</Link></li>
                  <li><Link to="/campaigns" onClick={() => setIsSidebarOpen(false)}>Campaign</Link></li>
                  <li><Link to="/import-export" onClick={() => setIsSidebarOpen(false)}>Import/Export</Link></li>
                  <li><Link to="/profile" onClick={() => setIsSidebarOpen(false)}>Profile</Link></li>
                  <li><Link to="/documentation" onClick={() => setIsSidebarOpen(false)}>Documentation</Link></li>
                </ul>
              </nav>

              {/* Main Content */}
              <main className={`main-content ${isSidebarOpen ? 'main-content-with-sidebar' : 'main-content-full'}`}>
                <ErrorSuppressor>
                  <Routes>
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/characters" element={<ProtectedRoute><CharactersPage /></ProtectedRoute>} />
                    <Route path="/characters/:characterId/memories" element={<ProtectedRoute><CharacterMemoriesPage /></ProtectedRoute>} />
                    <Route path="/environments" element={<ProtectedRoute><EnvironmentsPage /></ProtectedRoute>} />
                    <Route path="/map" element={<ProtectedRoute><WorldSelectionPage /></ProtectedRoute>} /> {/* Updated to WorldSelectionPage */}
                    <Route path="/map/:worldId" element={<ProtectedRoute><MapPage /></ProtectedRoute>} /> {/* Add ProtectedRoute */}
                    <Route path="/timeline" element={<ProtectedRoute><TimelinePage /></ProtectedRoute>} />
                    <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                    <Route path="/import-export" element={<ProtectedRoute><ImportExportPage /></ProtectedRoute>} />
                    <Route path="/worlds" element={<ProtectedRoute><WorldsPage /></ProtectedRoute>} />
                    <Route path="/worlds/:worldId/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
                    <Route path="/campaigns/:campaignId/session" element={<ProtectedRoute><CampaignSessionPage /></ProtectedRoute>} />
                    <Route path="/campaigns" element={<ProtectedRoute><CampaignsIndexPage /></ProtectedRoute>} />
                    <Route path="/worlds/:worldId/map/fantasy" element={<ProtectedRoute><AzgaarMapIframe /></ProtectedRoute>} />
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

// Suppress ResizeObserver errors
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