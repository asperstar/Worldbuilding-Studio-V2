import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import './MapStyles.css';
import axios from 'axios';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CustomNode = ({ data, id, setNodes, setEdges, saveMapData }) => {
  const handleAddConnectedNode = () => {
    const newNode = {
      id: `${data.type}_${Date.now()}`,
      type: 'custom',
      position: {
        x: data.position?.x + 150,
        y: data.position?.y
      },
      data: {
        label: `New ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`,
        type: data.type,
      }
    };

    setNodes(prevNodes => [...prevNodes, newNode]);
    setEdges(prevEdges => [
      ...prevEdges,
      {
        id: `edge_${Date.now()}`,
        source: id,
        target: newNode.id,
        type: 'default',
        animated: false,
        style: { stroke: '#555' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20
        }
      }
    ]);
    setTimeout(saveMapData, 500);
  };

  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Left} />
      <div className="node-content">
        {data.label}
        {data.description && <p>{data.description}</p>}
      </div>
      <button className="add-node-btn" onClick={handleAddConnectedNode}>
        +
      </button>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

function MapPage() {
  const { worldId } = useParams();
  const navigate = useNavigate();
  const { currentUser, getMapData, updateMapData, getEnvironments, getCharacters, getWorldById } = useStorage();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [environments, setEnvironments] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [worldName, setWorldName] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const nodeTypes = {
    custom: (props) => <CustomNode {...props} setNodes={setNodes} setEdges={setEdges} saveMapData={saveMapData} />
  };

  // Define loadData outside of useEffect
  const loadData = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      setError('Please log in to view the map.');
      navigate('/login');
      return;
    }
    
    if (!worldId) {
      setLoading(false);
      setError('No world selected. Please select a world to view its map.');
      navigate('/map');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const worldData = await getWorldById(worldId);
      if (!worldData) {
        setError('World not found.');
        navigate('/map');
        return;
      }
      setWorldName(worldData?.name || 'WORLD NAME');

      const mapData = await getMapData();
      const fetchedEnvironments = await getEnvironments(worldId);
      const fetchedCharacters = await getCharacters(worldId);

      setEnvironments(fetchedEnvironments || []);
      setCharacters(fetchedCharacters || []);

      if (mapData && mapData.nodes && mapData.edges) {
        const formattedNodes = mapData.nodes.map(node => ({
          ...node,
          id: node.id ? node.id.toString() : `node_${Date.now()}`,
          position: node.position || { x: 0, y: 0 },
          data: {
            ...node.data,
            label: node.data?.label || node.label || 'Node',
            type: node.data?.type || 'default'
          }
        }));

        const formattedEdges = mapData.edges.map(edge => ({
          ...edge,
          id: edge.id ? edge.id.toString() : `edge_${Date.now()}`,
          source: edge.source ? edge.source.toString() : '',
          target: edge.target ? edge.target.toString() : '',
          type: edge.type || 'default'
        }));

        setNodes(formattedNodes);
        setEdges(formattedEdges);
      } else {
        setNodes([]);
        setEdges([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load map data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, getMapData, getEnvironments, getCharacters, getWorldById, worldId, navigate]);

  // Call loadData in useEffect
  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleAddEnvironment = (environment) => {
    const newNode = {
      id: `env_${environment.id}`,
      type: 'custom',
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400
      },
      data: {
        label: environment.name,
        type: 'environment',
        description: environment.description,
        id: environment.id
      }
    };

    setNodes(prevNodes => [...prevNodes, newNode]);
    setTimeout(saveMapData, 500);
  };

  const handleAddCharacter = (character) => {
    const newNode = {
      id: `char_${character.id}`,
      type: 'custom',
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400
      },
      data: {
        label: character.name,
        type: 'character',
        description: character.description,
        id: character.id
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

  const handleChangeWorld = () => {
    navigate('/map');
  };

  const handleGenerate = async () => {
    if (!currentUser || !worldId) {
      setError('You must be logged in and have a world selected.');
      return;
    }
    
    setLoading(true);
    setError(null);

    const mapData = {
      environments: nodes
        .filter(node => node.data.type === 'environment')
        .map(node => ({
          name: node.data.label,
          position: node.position,
          details: node.data
        })),
      connections: edges.map(edge => ({
        source: nodes.find(node => node.id === edge.source)?.data.label,
        target: nodes.find(node => node.id === edge.target)?.data.label
      }))
    };

    try {
      const response = await axios.post(
        'http://localhost:3002/generate-map',
        mapData
      );

      const { imageUrl } = response.data;
      setGeneratedImage(imageUrl);
      setShowModal(true);

      const worldRef = doc(db, 'worlds', worldId);
      await updateDoc(worldRef, {
        imageUrl: imageUrl,
        updated: new Date().toISOString(),
        userId: currentUser.uid
      });
    } catch (err) {
      console.error('Error generating map:', err);
      if (err.response?.status === 429) {
        setError('Rate limit exceeded. Please try again later.');
      } else if (err.message.includes('network')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to generate map. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderSidebarContent = () => {
    return (
      <div className="sidebar-content">
        <div className="sidebar-section">
          <h3>Available Environments</h3>
          {environments.length === 0 ? (
            <p>No environments available. Add some in the Environments page.</p>
          ) : (
            <ul className="entity-list">
              {environments.map(env => (
                <li key={env.id} className="entity-item">
                  <div className="entity-name">{env.name}</div>
                  <button
                    onClick={() => handleAddEnvironment(env)}
                    disabled={nodes.some(node => node.data.id === env.id)}
                  >
                    Add to Map
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="sidebar-buttons">
            <button className="change-world-btn" onClick={handleChangeWorld}>
              Change World
            </button>
          </div>
        </div>
        <div className="sidebar-section">
          <h3>Available Characters</h3>
          {characters.length === 0 ? (
            <p>No characters available. Add some in the Characters page.</p>
          ) : (
            <ul className="entity-list">
              {characters.map(char => (
                <li key={char.id} className="entity-item">
                  <div className="entity-name">{char.name}</div>
                  <button
                    onClick={() => handleAddCharacter(char)}
                    disabled={nodes.some(node => node.data.id === char.id)}
                  >
                    Add to Map
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading map data...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/map')}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="map-page">
      {showSidebar && (
        <div className="map-sidebar">
          {renderSidebarContent()}
        </div>
      )}
      <div className="map-container">
        <div className="world-name">{worldName || 'WORLD NAME'}</div>
        <ReactFlow
          nodes={nodes.map(node => ({ ...node, type: 'custom' }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          fitView
          nodeTypes={nodeTypes}
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
        <div className="generate-container">
          <button className="generate-button" onClick={handleGenerate}>
            GENERATE
          </button>
        </div>
      </div>
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowModal(false)}>×</span>
            {generatedImage && (
              <img src={generatedImage} alt="Generated Map" style={{ maxWidth: '100%' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MapPage;