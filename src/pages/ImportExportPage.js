// src/pages/ImportExportPage.js
import React, { useState, useEffect } from 'react';
import { 
  exportAllData, 
  importAllData, 
  loadCharacters, 
  loadEnvironments, 
  loadWorlds, 
  loadMapData, 
  loadTimelineData,
  loadCampaigns
} from '../utils/storage';

function ImportExportPage() {
  const [importStatus, setImportStatus] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportStats, setExportStats] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({
    characters: true,
    environments: true,
    worlds: true,
    campaigns: true,
    map: true,
    timeline: true,
    memories: true,
    chats: true
  });
  const [existingData, setExistingData] = useState({
    characters: 0,
    environments: 0,
    worlds: 0,
    campaigns: 0,
    mapNodes: 0,
    timelineEvents: 0
  });
  
  // Load existing data counts on mount
  useEffect(() => {
    const loadDataCounts = async () => {
      try {
        const characters = await loadCharacters();
        const environments = await loadEnvironments();
        const worlds = await loadWorlds();
        const mapData = await loadMapData();
        const timelineData = await loadTimelineData();
        const campaigns = await loadCampaigns() || [];
        
        setExistingData({
          characters: characters.length,
          environments: environments.length,
          worlds: worlds.length,
          campaigns: campaigns.length,
          mapNodes: (mapData?.nodes?.length || 0) + (mapData?.edges?.length || 0),
          timelineEvents: timelineData?.events?.length || 0
        });
      } catch (error) {
        console.error('Error loading data counts:', error);
      }
    };
    
    loadDataCounts();
  }, []);
  
  const handleOptionsChange = (e) => {
    const { name, checked } = e.target;
    setSelectedOptions(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const handleExport = async () => {
    try {
      setExportStatus('processing');
      const exportData = await exportAllData(selectedOptions);
      
      // Set stats about what was exported
      setExportStats({
        characters: exportData.characters?.length || 0,
        environments: exportData.environments?.length || 0,
        worlds: exportData.worlds?.length || 0,
        campaigns: exportData.campaigns?.length || 0,
        mapNodes: (exportData.mapData?.nodes?.length || 0) + (exportData.mapData?.edges?.length || 0),
        timelineEvents: exportData.timelineData?.events?.length || 0,
        chatMessages: Object.keys(exportData.chatData || {}).length,
        memories: Object.keys(exportData.memories || {}).length
      });
      
      // Create a download link
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      // Create and click a download link
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `worldbuilding-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setExportStatus('success');
      
      // Clear status after a delay
      setTimeout(() => setExportStatus(null), 5000);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
    }
  };
  
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setImportStatus('processing');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        // Filter import data based on selected options
        const filteredData = {};
        if (selectedOptions.characters && importData.characters) filteredData.characters = importData.characters;
        if (selectedOptions.environments && importData.environments) filteredData.environments = importData.environments;
        if (selectedOptions.worlds && importData.worlds) filteredData.worlds = importData.worlds;
        if (selectedOptions.campaigns && importData.campaigns) filteredData.campaigns = importData.campaigns;
        if (selectedOptions.map && importData.mapData) filteredData.mapData = importData.mapData;
        if (selectedOptions.timeline && importData.timelineData) filteredData.timelineData = importData.timelineData;
        if (selectedOptions.memories && importData.memories) filteredData.memories = importData.memories;
        if (selectedOptions.chats && importData.chatData) filteredData.chatData = importData.chatData;
        
        // Perform the import
        const success = await importAllData(filteredData);
        
        setImportStatus(success ? 'success' : 'error');
        
        // Reset file input
        event.target.value = null;
        
        // Clear status after a delay
        setTimeout(() => setImportStatus(null), 5000);
      } catch (error) {
        console.error('Import error:', error);
        setImportStatus('error');
      }
    };
    
    reader.onerror = () => {
      setImportStatus('error');
    };
    
    reader.readAsText(file);
  };
  
  return (
    <div className="import-export-page">
      <h1>Import & Export</h1>
      
      <div className="data-options">
        <h2>Data Selection</h2>
        <p>Choose what data to include in imports and exports:</p>
        
        <div className="options-grid">
          <label className="option-checkbox">
            <input
              type="checkbox"
              name="characters"
              checked={selectedOptions.characters}
              onChange={handleOptionsChange}
            />
            Characters ({existingData.characters})
          </label>
          
          <label className="option-checkbox">
            <input
              type="checkbox"
              name="environments"
              checked={selectedOptions.environments}
              onChange={handleOptionsChange}
            />
            Environments ({existingData.environments})
          </label>
          
          <label className="option-checkbox">
            <input
              type="checkbox"
              name="worlds"
              checked={selectedOptions.worlds}
              onChange={handleOptionsChange}
            />
            Worlds ({existingData.worlds})
          </label>
          
          <label className="option-checkbox">
            <input
              type="checkbox"
              name="campaigns"
              checked={selectedOptions.campaigns}
              onChange={handleOptionsChange}
            />
            Campaigns ({existingData.campaigns})
          </label>
          
          <label className="option-checkbox">
            <input
              type="checkbox"
              name="map"
              checked={selectedOptions.map}
              onChange={handleOptionsChange}
            />
            Map Data ({existingData.mapNodes} nodes/connections)
          </label>
          
          <label className="option-checkbox">
            <input
              type="checkbox"
              name="timeline"
              checked={selectedOptions.timeline}
              onChange={handleOptionsChange}
            />
            Timeline Events ({existingData.timelineEvents})
          </label>
          
          <label className="option-checkbox">
            <input
              type="checkbox"
              name="memories"
              checked={selectedOptions.memories}
              onChange={handleOptionsChange}
            />
            Character Memories
          </label>
          
          <label className="option-checkbox">
            <input
              type="checkbox"
              name="chats"
              checked={selectedOptions.chats}
              onChange={handleOptionsChange}
            />
            Chat History
          </label>
        </div>
      </div>
      
      <div className="import-export-container">
        <div className="export-section">
          <h2>Export Your World</h2>
          <p>
            Download all your selected worldbuilding data as a JSON file. This can be used as a backup or for sharing with others.
          </p>
          
          <button 
            className="export-button"
            onClick={handleExport}
            disabled={exportStatus === 'processing'}
          >
            {exportStatus === 'processing' ? 'Exporting...' : 'Export Selected Data'}
          </button>
          
          {exportStatus === 'success' && exportStats && (
            <div className="status-message success">
              <h3>Export Successful!</h3>
              <p>Your data has been downloaded to your computer.</p>
              <div className="export-summary">
                <h4>Exported:</h4>
                <ul>
                  {exportStats.characters > 0 && <li>{exportStats.characters} characters</li>}
                  {exportStats.environments > 0 && <li>{exportStats.environments} environments</li>}
                  {exportStats.worlds > 0 && <li>{exportStats.worlds} worlds</li>}
                  {exportStats.campaigns > 0 && <li>{exportStats.campaigns} campaigns</li>}
                  {exportStats.mapNodes > 0 && <li>{exportStats.mapNodes} map nodes/connections</li>}
                  {exportStats.timelineEvents > 0 && <li>{exportStats.timelineEvents} timeline events</li>}
                  {exportStats.chatMessages > 0 && <li>Chat history for {exportStats.chatMessages} characters</li>}
                  {exportStats.memories > 0 && <li>Memories for {exportStats.memories} characters</li>}
                </ul>
              </div>
            </div>
          )}
          
          {exportStatus === 'error' && (
            <div className="status-message error">
              There was an error exporting your data. Please try again.
            </div>
          )}
        </div>
        
        <div className="import-section">
          <h2>Import Data</h2>
          <p>
            Import worldbuilding data from a JSON file. This will merge with or replace your current data based on IDs.
          </p>
          <p className="warning">
            <strong>Warning:</strong> Importing may overwrite existing data with the same IDs. Consider exporting your current data first as a backup.
          </p>
          
          <label className="import-label">
            <span>{importStatus === 'processing' ? 'Importing...' : 'Select Import File'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={importStatus === 'processing'}
            />
          </label>
          
          {importStatus === 'success' && (
            <div className="status-message success">
              Import successful! Your data has been imported.
              Refresh the page to see your imported content.
            </div>
          )}
          
          {importStatus === 'error' && (
            <div className="status-message error">
              There was an error importing your data. Make sure you're using a valid export file and try again.
            </div>
          )}
        </div>
      </div>
      
      <div className="sharing-tips">
        <h2>Data Management Tips</h2>
        <ul>
          <li>
            <strong>Regular Backups:</strong> Export your data regularly to prevent loss. Browser data can be cleared accidentally.
          </li>
          <li>
            <strong>Collaboration:</strong> Export your world and share the file with others who can import it.
          </li>
          <li>
  <strong>Version Control:</strong> Keep dated exports to track changes and go back to previous versions of your world if needed.
</li>
<li>
  <strong>Moving Data:</strong> Use exports/imports to move your content between devices or browsers.
</li>
<li>
  <strong>Selective Import:</strong> Use the checkboxes to only import specific data types when needed.
</li>
<li>
  <strong>Large Files:</strong> For very complex worlds with many assets, the export file may become large. Consider exporting sections separately.
  </li>
        </ul>
      </div>
    </div>
  );
}

export default ImportExportPage;
