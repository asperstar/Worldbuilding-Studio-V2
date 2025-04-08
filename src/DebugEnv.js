// src/DebugEnv.js
import React from 'react';

function DebugEnv() {
  const firebaseVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];

  return (
    <div>
      <h2>Environment Variables Debug</h2>
      <ul>
        {firebaseVars.map(varName => (
          <li key={varName}>
            {varName}: {process.env[varName] ? 
              `${process.env[varName].substring(0, 5)}...` : 
              'undefined'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DebugEnv;