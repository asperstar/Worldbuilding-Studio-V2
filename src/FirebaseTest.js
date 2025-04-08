import React, { useEffect, useState } from 'react';
import app from '../firebase';
import { getAuth } from 'firebase/auth';

function FirebaseTest() {
  const [status, setStatus] = useState('Testing...');
  
  useEffect(() => {
    try {
      // Test Firebase initialization
      const auth = getAuth(app);
      console.log('Firebase app initialized:', app.name);
      console.log('Auth instance created:', auth);
      
      // Check for environment variables (safely logging without revealing actual values)
      const envVars = [
        'REACT_APP_FIREBASE_API_KEY',
        'REACT_APP_FIREBASE_AUTH_DOMAIN',
        'REACT_APP_FIREBASE_PROJECT_ID',
        'REACT_APP_FIREBASE_STORAGE_BUCKET',
        'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
        'REACT_APP_FIREBASE_APP_ID'
      ];
      
      const results = envVars.map(varName => {
        const value = process.env[varName];
        return {
          name: varName,
          exists: !!value,
          firstChars: value ? `${value.substring(0, 3)}...` : 'N/A'
        };
      });
      
      console.log('Environment variables check:', results);
      setStatus('Firebase initialized successfully! Check console for details.');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      setStatus(`Error: ${error.message}`);
    }
  }, []);
  
  return (
    <div>
      <h2>Firebase Test</h2>
      <p>{status}</p>
    </div>
  );
}

export default FirebaseTest;