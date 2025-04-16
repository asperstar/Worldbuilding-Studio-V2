// src/pages/OllamaDiagnosticPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { testOllamaConnection, testOllamaGeneration, ensureMistralAvailable } from '../utils/ollamaTest';
import ollamaService from '../utils/ollamaService';

function OllamaDiagnosticPage() {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [mistralStatus, setMistralStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testMessage, setTestMessage] = useState('Hello, this is a test message');
  const [testResponse, setTestResponse] = useState('');
  const [isTestingCustom, setIsTestingCustom] = useState(false);

  useEffect(() => {
    const runDiagnostics = async () => {
      setIsLoading(true);
      
      try {
        // Test 1: Connection
        const connectionResult = await testOllamaConnection();
        setConnectionStatus(connectionResult);
        
        // If connection successful, proceed to other tests
        if (connectionResult.connected) {
          // Test 2: Mistral availability
          const mistralResult = await ensureMistralAvailable();
          setMistralStatus(mistralResult);
          
          // Test 3: Generation
          const generationResult = await testOllamaGeneration();
          setGenerationStatus(generationResult);
        }
      } catch (error) {
        console.error('Error running diagnostics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    runDiagnostics();
  }, []);
  
  const handleCustomTest = async () => {
    if (!testMessage.trim()) return;
    
    setIsTestingCustom(true);
    
    try {
      const response = await fetch(`${ollamaService.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: ollamaService.model,
          prompt: testMessage,
          options: {
            temperature: 0.7,
            num_predict: 500
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTestResponse(data.response);
    } catch (error) {
      console.error('Custom test error:', error);
      setTestResponse(`Error: ${error.message}`);
    } finally {
      setIsTestingCustom(false);
    }
  };

  const renderStatus = (status, type) => {
    if (!status) return <div className="status-loading">Loading...</div>;
    
    switch (type) {
      case 'connection':
        return status.connected ? 
          <div className="status-success">
            <span className="checkmark">✓</span> Connected to Ollama at {ollamaService.baseUrl}
            <div className="details">
              <strong>Available Models:</strong>
              <ul>
                {status.availableModels?.length ? 
                  status.availableModels.map((model, i) => <li key={i}>{model}</li>) : 
                  <li>No models found</li>
                }
              </ul>
            </div>
          </div> :
          <div className="status-error">
            <span className="error-mark">✗</span> Failed to connect to Ollama
            <div className="error-details">
              <p>{status.error}</p>
              {status.suggestion && <p><strong>Suggestion:</strong> {status.suggestion}</p>}
            </div>
          </div>;
      
      case 'mistral':
        return status.available ? 
          <div className="status-success">
            <span className="checkmark">✓</span> Mistral model is available
            <div className="details">
              <strong>Available variations:</strong>
              <ul>
                {status.models?.length ? 
                  status.models.map((model, i) => <li key={i}>{model.name}</li>) : 
                  <li>No variations found</li>
                }
              </ul>
            </div>
          </div> :
          <div className="status-error">
            <span className="error-mark">✗</span> Mistral model not available
            <div className="error-details">
              <p>{status.message || status.error}</p>
              {status.suggestion && <p><strong>Suggestion:</strong> {status.suggestion}</p>}
            </div>
          </div>;
      
      case 'generation':
        return status.success ? 
          <div className="status-success">
            <span className="checkmark">✓</span> Text generation is working
            <div className="details">
              <p><strong>Response:</strong> {status.response}</p>
              <p><strong>Model used:</strong> {status.model}</p>
            </div>
          </div> :
          <div className="status-error">
            <span className="error-mark">✗</span> Text generation failed
            <div className="error-details">
              <p>{status.error}</p>
            </div>
          </div>;
          
      default:
        return null;
    }
  };

  return (
    <div className="ollama-diagnostic-page">
      <h1>Ollama Diagnostic Tool</h1>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Running diagnostics...</p>
        </div>
      ) : (
        <div className="diagnostic-results">
          <div className="diagnostic-section">
            <h2>1. Connection Status</h2>
            {renderStatus(connectionStatus, 'connection')}
          </div>
          
          {connectionStatus?.connected && (
            <>
              <div className="diagnostic-section">
                <h2>2. Mistral Model Status</h2>
                {renderStatus(mistralStatus, 'mistral')}
              </div>
              
              <div className="diagnostic-section">
                <h2>3. Text Generation Test</h2>
                {renderStatus(generationStatus, 'generation')}
              </div>
              
              <div className="diagnostic-section">
                <h2>4. Custom Test</h2>
                <div className="custom-test-container">
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter a test message"
                    rows={3}
                    disabled={isTestingCustom}
                  />
                  <button 
                    onClick={handleCustomTest} 
                    disabled={isTestingCustom || !testMessage.trim()}
                  >
                    {isTestingCustom ? 'Testing...' : 'Test Message'}
                  </button>
                </div>
                
                {testResponse && (
                  <div className="test-response">
                    <h3>Response:</h3>
                    <div className="response-content">
                      {testResponse}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          <div className="diagnostic-actions">
            <h2>Next Steps</h2>
            <ul className="action-list">
              {!connectionStatus?.connected && (
                <li>
                  <div className="action-icon">🔌</div>
                  <div className="action-content">
                    <h3>Start Ollama</h3>
                    <p>Make sure Ollama is installed and running with <code>ollama serve</code></p>
                  </div>
                </li>
              )}
              
              {connectionStatus?.connected && !mistralStatus?.available && (
                <li>
                  <div className="action-icon">⬇️</div>
                  <div className="action-content">
                    <h3>Download Mistral Model</h3>
                    <p>Run <code>ollama pull mistral</code> in your terminal</p>
                  </div>
                </li>
              )}
              
              {connectionStatus?.connected && mistralStatus?.available && !generationStatus?.success && (
                <li>
                  <div className="action-icon">⚠️</div>
                  <div className="action-content">
                    <h3>Check Ollama Logs</h3>
                    <p>View the Ollama terminal for detailed error messages</p>
                  </div>
                </li>
              )}
              
              {connectionStatus?.connected && mistralStatus?.available && generationStatus?.success && (
                <li>
                  <div className="action-icon">✅</div>
                  <div className="action-content">
                    <h3>All Systems Go!</h3>
                    <p>Your Ollama setup is working correctly. You can now use character chat!</p>
                    <Link to="/chat" className="start-chat-button">Start Chatting</Link>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
      
      <div className="back-link-container">
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    </div>
  );
}

export default OllamaDiagnosticPage;