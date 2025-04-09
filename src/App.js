// src/App.js
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './utils/firebase';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { StorageProvider } from './contexts/StorageContext';
import './App.css';

// Import components
import SidebarNavigation from './components/SidebarNavigation';
import AzgaarMapIframe from './components/maps/AzgaarMapIframe'; // Updated import
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
import DebugEnv from './DebugEnv';
import DecorativeElements from './components/DecorativeElements';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
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
          <DebugEnv />
          {user ? (
            <>
              <DecorativeElements />
              <SidebarNavigation />
              <main className="main-content main-content-with-sidebar">
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
                    <Route path="/map/fantasy" element={<ProtectedRoute><AzgaarMapIframe /></ProtectedRoute>} /> {/* Updated component */}
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