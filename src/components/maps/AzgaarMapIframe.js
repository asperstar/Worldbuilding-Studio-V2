// src/components/maps/AzgaarMapIframe.js
import React, { useState, useEffect, useRef } from 'react';
import { saveMapData } from '../../utils/storageExports';
import './AzgaarMapIframe.css';

function AzgaarMapIframe({ onMapGenerated }) {
  const iframeRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [mapPreviewUrl, setMapPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleMessage = (event) => {
      // Validate the origin of the message
      const allowedOrigins = [
        'http://localhost:55596',
        'https://worldbuilding-studio.firebaseapp.com',
        'https://worldbuilding-app-plum.vercel.app',
        'https://worldbuilding.studio',
      ];
      if (!allowedOrigins.some(origin => event.origin === origin)) {
        console.warn('Received message from unauthorized source:', event.origin);
        return;
      }

      if (!event.data) return;

      try {
        if (event.data.type === 'mapReady') {
          console.log('Map generator is ready');
          setIsMapReady(true);
          setGenerationStatus('Map generator loaded successfully.');
          setError(null);
        } else if (event.data.type === 'mapGenerated') {
          console.log('Map has been generated');
          setMapPreviewUrl(event.data.imageUrl);
          setGenerationStatus('Map generated successfully!');
          setError(null);
        } else if (event.data.type === 'mapData') {
          console.log('Received map data from generator');
          handleMapData(event.data.mapData);
        } else if (event.data.type === 'error') {
          console.error('Error from map generator:', event.data.message);
          setGenerationStatus(`Error: ${event.data.message}`);
          setError(event.data.message);
        } else if (event.data.type === 'status') {
          setGenerationStatus(event.data.message);
        }
      } catch (err) {
        console.error('Error processing message from map generator:', err);
        setGenerationStatus('Error processing data from map generator.');
        setError(err.message);
      }
    };

    window.addEventListener('message', handleMessage);

    // Test if the iframe content loads
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onerror = () => {
        const errorMsg = 'Failed to load map generator iframe. Check if /azgaar-map.html is accessible.';
        setError(errorMsg);
        setGenerationStatus(errorMsg);
      };
      iframe.onload = () => {
        console.log('Iframe loaded successfully');
      };
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onMapGenerated]);

  const handleMapData = async (mapData) => {
    try {
      await saveMapData(mapData);
      setGenerationStatus('Map saved to your account!');
      setError(null);
      if (onMapGenerated) {
        onMapGenerated(mapData);
      }
    } catch (error) {
      console.error('Error saving map data:', error);
      setGenerationStatus(`Error saving map: ${error.message}`);
      setError(error.message);
    }
  };

  const generateNewMap = () => {
    if (!iframeRef.current) {
      setError('Iframe not found. Please refresh the page.');
      return;
    }

    setGenerationStatus('Requesting new map generation...');
    setError(null);
    iframeRef.current.contentWindow.postMessage({ command: 'generateNewMap' }, '*');
  };

  const exportMap = () => {
    if (!iframeRef.current) {
      setError('Iframe not found. Please refresh the page.');
      return;
    }

    setGenerationStatus('Requesting map export...');
    setError(null);
    iframeRef.current.contentWindow.postMessage({ command: 'exportMap' }, '*');
  };

  return (
    <div className="azgaar-map-iframe">
      <div className="generator-header">
        <h3>Fantasy Map Generator</h3>
        {error && (
          <div className="error-message">
            <p>Failed to load map generator: {error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        <p className="status-message">{generationStatus}</p>
      </div>

      <div className="generator-controls">
        <button
          onClick={generateNewMap}
          disabled={!isMapReady}
          className="control-button generate-button"
        >
          Generate New Map
        </button>
        <button
          onClick={exportMap}
          disabled={!isMapReady}
          className="control-button export-button"
        >
          Save Map to App
        </button>
      </div>

      <div className="azgaar-iframe-container">
        <iframe
          ref={iframeRef}
          src="/azgaar-map.html"
          title="Fantasy Map Generator"
          width="100%"
          height="800px"
          style={{ border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>

      {mapPreviewUrl && (
        <div className="map-preview">
          <h3>Map Preview</h3>
          <img
            src={mapPreviewUrl}
            alt="Generated fantasy map"
            className="preview-image"
          />
        </div>
      )}
    </div>
  );
}

export default AzgaarMapIframe;