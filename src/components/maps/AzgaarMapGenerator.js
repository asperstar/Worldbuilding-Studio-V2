// src/components/maps/AzgaarMapGenerator.js
import React, { useEffect, useRef } from 'react';
import { saveMapData } from '../../utils/storage';

function AzgaarMapGenerator({ onMapGenerated }) {
  const containerRef = useRef(null);
  const mapInitialized = useRef(false);
  
  useEffect(() => {
    if (containerRef.current && !mapInitialized.current) {
      // Load the necessary scripts
      const scripts = [
        '/lib/fantasy-map-generator/dragndrop.js',
        '/lib/fantasy-map-generator/FileSaver.js',
        '/lib/fantasy-map-generator/generators.js',
        '/lib/fantasy-map-generator/main.js',
        '/lib/fantasy-map-generator/mapping.js',
        '/lib/fantasy-map-generator/modules/ui/editors.js',
        '/lib/fantasy-map-generator/modules/ui/general.js',
        '/lib/fantasy-map-generator/modules/ui/tools.js',
      ];
      
      // Load scripts sequentially
      const loadScript = (index) => {
        if (index >= scripts.length) {
          // All scripts loaded, initialize the map
          if (window.generateMapOnLoad) {
            window.generateMapOnLoad();
            mapInitialized.current = true;
          }
          return;
        }
        
        const script = document.createElement('script');
        script.src = scripts[index];
        script.onload = () => loadScript(index + 1);
        document.body.appendChild(script);
      };
      
      loadScript(0);
      
      // Handle export button clicks
      if (containerRef.current) {
        const exportButton = containerRef.current.querySelector('#exportButton');
        if (exportButton) {
          exportButton.addEventListener('click', handleExport);
        }
      }
    }
    
    return () => {
      // Cleanup
      if (containerRef.current) {
        const exportButton = containerRef.current.querySelector('#exportButton');
        if (exportButton) {
          exportButton.removeEventListener('click', handleExport);
        }
      }
    };
  }, []);
  
  const handleExport = () => {
    if (window.map && onMapGenerated) {
      // Extract map data in a format compatible with your app
      const mapData = convertAzgaarMapToAppFormat(window.map);
      
      // Save map data
      saveMapData(mapData);
      
      // Call the callback
      onMapGenerated(mapData);
    }
  };
  
  const convertAzgaarMapToAppFormat = (azgaarMap) => {
    // Extract relevant data from Azgaar's map format
    const nodes = [];
    const edges = [];
    
    // Convert burgs (settlements) to nodes
    if (azgaarMap.burgs) {
      azgaarMap.burgs.forEach((burg, index) => {
        if (burg.i === 0) return; // Skip the first empty entry
        
        nodes.push({
          id: `settlement-${burg.i}`,
          type: 'environment',
          position: { x: burg.x, y: burg.y },
          data: {
            label: burg.name,
            description: `A ${burg.type} in ${azgaarMap.states[burg.state]?.name || 'unknown territory'}`,
            climate: azgaarMap.cells.h[burg.cell] > 70 ? 'Mountain' : 
                    azgaarMap.cells.h[burg.cell] < 20 ? 'Coastal' : 'Temperate',
            population: burg.population
          }
        });
      });
    }
    
    // Convert states (countries) to region nodes
    if (azgaarMap.states) {
      azgaarMap.states.forEach((state, index) => {
        if (state.i === 0) return; // Skip the first empty entry
        
        // Find center point of the state
        const centerCell = azgaarMap.cells.state.indexOf(state.i);
        let x = 400, y = 300; // Default fallback
        
        if (centerCell !== -1) {
          x = azgaarMap.cells.p[centerCell][0];
          y = azgaarMap.cells.p[centerCell][1];
        }
        
        nodes.push({
          id: `region-${state.i}`,
          type: 'environment',
          position: { x, y },
          data: {
            label: state.name,
            description: `A ${state.type} realm with ${state.burgs} settlements`,
            climate: 'Various'
          }
        });
      });
    }
    
    // Create edges for connections
    // Rivers connect to settlements
    if (azgaarMap.rivers && azgaarMap.burgs) {
      azgaarMap.rivers.forEach((river, riverIndex) => {
        river.forEach(cell => {
          azgaarMap.burgs.forEach((burg, burgIndex) => {
            if (burg.cell === cell) {
              edges.push({
                id: `river-settlement-${riverIndex}-${burgIndex}`,
                source: `river-${riverIndex}`,
                target: `settlement-${burg.i}`,
                type: 'custom',
                animated: true,
                style: { stroke: '#4682B4', strokeWidth: 3 }
              });
            }
          });
        });
      });
    }
    
    return {
      nodes,
      edges,
      metadata: {
        name: azgaarMap.info.name || 'Fantasy Map',
        description: azgaarMap.info.description || 'Generated with Azgaar\'s Fantasy Map Generator',
        generatedBy: 'Azgaar',
        timestamp: new Date().toISOString()
      }
    };
  };
  
  // Inject necessary CSS
  const injectStyles = () => {
    return {
      __html: `
        <link rel="stylesheet" href="/lib/fantasy-map-generator/style.css">
        <style>
          .azgaar-container {
            width: 100%;
            height: 800px;
            position: relative;
            overflow: hidden;
          }
        </style>
      `
    };
  };

  return (
    <div className="azgaar-map-generator">
      <div dangerouslySetInnerHTML={injectStyles()} />
      
      <div className="generator-controls">
        <button onClick={() => window.regenerateMap && window.regenerateMap()}>
          Generate New Map
        </button>
        
        <button onClick={handleExport}>
          Save to App
        </button>
      </div>
      
      <div className="azgaar-container" ref={containerRef}>
        {/* Azgaar's map will be injected here */}
        <div id="map"></div>
        <div id="tooltip"></div>
        <div id="optionsContainer"></div>
      </div>
    </div>
  );
}

export default AzgaarMapGenerator;