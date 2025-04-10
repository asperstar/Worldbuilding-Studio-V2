// src/pages/DebugPage.js
import React, { useState } from 'react';
import { testStorage } from '../utils/storageExports';

function DebugPage() {
  const [result, setResult] = useState(null);
  
  const runTest = async () => {
    try {
      const testResult = await testStorage();
      setResult(testResult);
    } catch (error) {
      setResult({ error: error.message });
    }
  };
  
  return (
    <div className="debug-page">
      <h1>System Diagnostic</h1>
      
      <button onClick={runTest}>Test Firebase Connection</button>
      
      {result && (
        <pre style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      
      <div style={{ marginTop: '30px' }}>
        <h2>Browser Information</h2>
        <p>User Agent: {navigator.userAgent}</p>
        <p>Environment: {process.env.NODE_ENV}</p>
        <p>Firebase Config: {process.env.REACT_APP_FIREBASE_PROJECT_ID ? 'Available' : 'Missing'}</p>
      </div>
    </div>
  );
}

export default DebugPage;