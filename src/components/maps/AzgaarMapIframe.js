import React, { useEffect, useRef } from 'react';
import { saveMapData } from '../../utils/storage';

function AzgaarMapIframe({ onMapGenerated }) {
  const iframeRef = useRef(null);
  
  useEffect(() => {
    // Set up message listener to receive data from the iframe
    const handleMessage = (event) => {
      // Make sure the message is from our iframe
      if (event.data && event.data.type === 'mapData') {
        console.log('Received map data:', event.data.mapData);
        
        // Save the map data
        saveMapData(event.data.mapData);
        
        // Call the callback if provided
        if (onMapGenerated) {
          onMapGenerated(event.data.mapData);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Cleanup when component unmounts
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onMapGenerated]);
  
  return (
    <div className="azgaar-iframe-container">
      <div className="iframe-instructions">
        <h3>Fantasy Map Generator</h3>
        <p>Use the tools in the iframe below to create your map, then click "Save Map to App" to import it.</p>
      </div>
      
      <iframe 
        ref={iframeRef}
        src="/azgaar-map.html" 
        title="Fantasy Map Generator"
        width="100%"
        height="800px"
        style={{ border: '1px solid #ccc', borderRadius: '4px' }}
      />
    </div>
  );
}

export default AzgaarMapIframe;