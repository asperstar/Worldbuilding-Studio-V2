// src/components/ProtectedRoute.js
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  if (isLoading) {
    return <div className="loading-container">
      <div className="loading-spinner">
        <p>Loading...</p>
      </div>
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default ProtectedRoute;