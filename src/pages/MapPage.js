import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Panel,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import './MapStyles.css'; // Import the CSS

function MapPage() {
  const { worldId } = useParams(); // Add this line
  const { currentUser, getMapData, updateMapData, getEnvironments, getCharacters } = useStorage();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [environments, setEnvironments] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [activeTab, setActiveTab] = useState('environments');
  const [connectionStartNode, setConnectionStartNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser || !worldId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const mapData = await getMapData();
        const fetchedEnvironments = await getEnvironments(worldId); // Pass worldId
        const fetchedCharacters = await getCharacters(worldId); // Pass worldId
        setEnvironments(fetchedEnvironments || []);
        setCharacters(fetchedCharacters || []);
        
        console.log('Map data in MapPage:', mapData);
        
        if (mapData && mapData.nodes && mapData.edges) {
          const formattedNodes = mapData.nodes.map(node => {
            console.log('Processing node:', node);
            return {
              ...node,
              id: node.id ? node.id.toString() : `node_${Date.now()}`,
              position: node.position || { x: 0, y: 0 },
              data: {
                ...node.data,
                label: node.data?.label || node.label || 'Node',
                type: node.data?.type || 'default'
              }
            };
          });
          
          const formattedEdges = mapData.edges.map(edge => {
            console.log('Processing edge:', edge);
            return {
              ...edge,
              id: edge.id ? edge.id.toString() : `edge_${Date.now()}`,
              source: edge.source ? edge.source.toString() : '',
              target: edge.target ? edge.target.toString() : '',
              type: edge.type || 'default'
            };
          });
          
          setNodes(formattedNodes);
          setEdges(formattedEdges);
        } else {
          setNodes([]);
          setEdges([]);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load map data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser, getMapData, getEnvironments, getCharacters, worldId]); // Add worldId

  const saveMapData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      await updateMapData({
        nodes,
        edges,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error saving map data:', err);
      setError('Failed to save map changes. Please try again.');
    }
  }, [nodes, edges, currentUser, updateMapData]);

  const handleAddNode = (type, data) => {
    const newNode = {
      id: `${type}_${Date.now()}`,
      type: 'default',
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400
      },
      data: {
        label: data.name || 'New Node',
        type,
        entityId: data.id,
        ...data
      }
    };
    
    setNodes(prevNodes => [...prevNodes, newNode]);
    setTimeout(saveMapData, 500);
  };

  const onConnect = useCallback((params) => {
    setEdges(eds => {
      const newEdges = addEdge({
        ...params,
        id: `edge_${Date.now()}`,
        type: 'default',
        animated: false,
        style: { stroke: '#555' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20
        }
      }, eds);
      
      setTimeout(saveMapData, 500);
      return newEdges;
    });
  }, [saveMapData]);

  const onNodesDelete = useCallback((deleted) => {
    setTimeout(saveMapData, 500);
  }, [saveMapData]);

  const onEdgesDelete = useCallback((deleted) => {
    setTimeout(saveMapData, 500);
  }, [saveMapData]);

  const renderSidebarContent = () => {
    switch (activeTab) {
      case 'environments':
        return (
          <div className="sidebar-content">
            <h3>Environments</h3>
            {environments.length === 0 ? (
              <p>No environments created yet. Go to the Environments page to create some.</p>
            ) : (
              <ul className="entity-list">
                {environments.map(env => (
                  <li key={env.id} className="entity-item">
                    <div className="entity-name">{env.name}</div>
                    <button 
                      onClick={() => handleAddNode('environment', env)}
                      className="add-to-map-btn"
                    >
                      Add to Map
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      case 'characters':
        return (
          <div className="sidebar-content">
            <h3>Characters</h3>
            {characters.length === 0 ? (
              <p>No characters created yet. Go to the Characters page to create some.</p>
            ) : (
              <ul className="entity-list">
                {characters.map(char => (
                  <li key={char.id} className="entity-item">
                    <div className="entity-name">{char.name}</div>
                    <button 
                      onClick={() => handleAddNode('character', char)}
                      className="add-to-map-btn"
                    >
                      Add to Map
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="loading">Loading map data...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  if (!currentUser) {
    return <div className="unauthorized">Please log in to view the map.</div>;
  }

  return (
    <div className="map-page">
      <div className="map-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          fitView
        >
          <Controls />
          <MiniMap 
            nodeColor={node => {
              return node.data.type === 'character' ? '#ff6060' : '#6288e8';
            }}
          />
          <Background color="#aaa" gap={16} />
          
          <Panel position="top-right">
            <button 
              className="toggle-sidebar-btn"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
            </button>
          </Panel>
        </ReactFlow>
      </div>
      
      {showSidebar && (
        <div className="map-sidebar">
          <div className="sidebar-tabs">
            <button 
              className={`tab-btn ${activeTab === 'environments' ? 'active' : ''}`}
              onClick={() => setActiveTab('environments')}
            >
              Environments
            </button>
            <button 
              className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`}
              onClick={() => setActiveTab('characters')}
            >
              Characters
            </button>
          </div>
          
          {renderSidebarContent()}
          
          <div className="save-container">
            <button 
              className="save-map-btn"
              onClick={saveMapData}
            >
              Save Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapPage;