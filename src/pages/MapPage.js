import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Panel,
  MarkerType,
  getBezierPath,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { loadEnvironments, 
  loadCharacters, 
  saveMapData, 
  loadMapData,
  saveEnvironments  
} from '../utils/storage';
import ErrorBoundary from '../components/ErrorBoundary';


// Custom node types
const EnvironmentNode = ({ data }) => {
  return (
    <div className="environment-node" style={{
      background: 'var(--dark-bg)',
      border: '2px solid var(--teal)',
      padding: '12px',
      borderRadius: '8px',
      minWidth: '180px',
      minHeight: '60px',
      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
    }}>
      {data.imageUrl && (
        <div className="node-image">
          <img 
            src={data.imageUrl} 
            alt={data.label} 
            style={{
              maxWidth: '100%', 
              maxHeight: '100px',
              borderRadius: '5px',
              marginBottom: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            loading="lazy"
          />
        </div>
      )}
      <div className="node-content">
        <h3 style={{
          margin: '5px 0', 
          color: 'var(--white)', 
          fontSize: '16px',
          position: 'relative',
          paddingBottom: '8px'
        }}>
          {data.label}
          <span style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '30px',
            height: '2px',
            background: 'var(--teal)'
          }}></span>
        </h3>
        {data.climate && (
          <p className="node-climate" style={{
            margin: '2px 0', 
            fontSize: '12px', 
            color: 'var(--beige)'
          }}>
            {data.climate}
          </p>
        )}
      </div>
    </div>
  );
};

const CharacterNode = ({ data }) => {
  return (
    <div className="character-node" style={{
      background: 'var(--dark-bg)',
      border: '2px solid var(--purple)',
      padding: '12px',
      borderRadius: '8px',
      minWidth: '180px',
      minHeight: '60px',
      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
    }}>
      {data.imageUrl && (
        <div className="node-image character-image">
          <img 
            src={data.imageUrl} 
            alt={data.label} 
            style={{
              maxWidth: '100%', 
              maxHeight: '100px',
              borderRadius: '5px',
              marginBottom: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            loading="lazy"
          />
        </div>
      )}
      <div className="node-content">
        <h3 style={{
          margin: '5px 0', 
          color: 'var(--white)',
          fontSize: '16px',
          position: 'relative',
          paddingBottom: '8px'
        }}>
          {data.label}
          <span style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '30px',
            height: '2px',
            background: 'var(--purple)'
          }}></span>
        </h3>
        {data.description && (
          <p style={{
            fontSize: '12px', 
            margin: '2px 0', 
            color: 'var(--beige)'
          }}>
            {data.description}
          </p>
        )}
      </div>
    </div>
  );
};

const CustomEdge = ({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {} }) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: style.stroke || '#F26430',
          strokeWidth: style.strokeWidth || 5,
          strokeDasharray: style.animated ? '5,5' : 'none',
        }}
      />
      <path
        d={edgePath}
        style={{
          stroke: 'rgba(0, 0, 0, 0.3)',
          strokeWidth: (style.strokeWidth || 5) + 3,
          fill: 'none',
          strokeDasharray: style.animated ? '5,5' : 'none',
        }}
      />
    </>
  );
};

// Serialization functions
const serializeMapData = (nodes, edges) => {
  return {
    nodes: nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge.data
    }))
  };
};

const deserializeMapData = (data) => {
  // Handle undefined or null data
  if (!data) {
    return { nodes: [], edges: [] };
  }

  // Ensure nodes and edges are arrays
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const edges = Array.isArray(data.edges) ? data.edges : [];

  return {
    nodes: nodes.map(node => ({
      ...node,
      type: node.type || 'default'
    })),
    edges: edges.map(edge => ({
      ...edge,
      type: 'custom'
    }))
  };
};

function MapPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [environments, setEnvironments] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [activeTab, setActiveTab] = useState('environments');
  const [connectionStartNode, setConnectionStartNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [savedMapData, loadedEnvironments, loadedCharacters] = await Promise.all([
          loadMapData(),
          loadEnvironments(),
          loadCharacters()
        ]);

        if (savedMapData) {
          const { nodes: savedNodes, edges: savedEdges } = deserializeMapData(savedMapData);
          setNodes(savedNodes);
          setEdges(savedEdges);
        }

        setEnvironments(loadedEnvironments);
        setCharacters(loadedCharacters);
      } catch (error) {
        console.error('Error loading initial data:', error);
        // Initialize with empty arrays if loading fails
        setEnvironments([]);
        setCharacters([]);
      }
    };

    loadInitialData();
  }, [setNodes, setEdges]);

  // Save map data when it changes
  useEffect(() => {
    const mapData = serializeMapData(nodes, edges);
    saveMapData(mapData);
  }, [nodes, edges]);

  const nodeTypes = {
    environment: EnvironmentNode,
    character: CharacterNode
  };

  const edgeTypes = {
    custom: CustomEdge,
  };

  const onConnect = useCallback((params) => {
    try {
      const edgeParams = {
        ...params,
        type: 'custom',
        animated: true,
        style: { 
          stroke: '#F26430', 
          strokeWidth: 5 
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#F26430',
        }
      };
      
      setEdges(eds => addEdge(edgeParams, eds));
      
      const updatedEdges = addEdge(edgeParams, edges);
      saveMapData({
        nodes,
        edges: updatedEdges
      });
    } catch (error) {
      console.error("Error connecting nodes:", error);
    }
  }, [setEdges, edges, nodes]);

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    
    if (isConnecting && connectionStartNode && connectionStartNode.id !== node.id) {
      const newEdge = {
        id: `e-${connectionStartNode.id}-${node.id}-${Date.now()}`,
        source: connectionStartNode.id,
        target: node.id,
        type: 'custom',
        animated: true,
        style: { 
          stroke: '#F26430', 
          strokeWidth: 5 
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#F26430',
        }
      };
      
      setEdges(currentEdges => [...currentEdges, newEdge]);
      setIsConnecting(false);
      setConnectionStartNode(null);
      
      saveMapData({
        nodes,
        edges: [...edges, newEdge]
      });
      
      return false;
    } else {
      setConnectionStartNode(node);
      setIsConnecting(true);
      return false;
    }
  }, [isConnecting, connectionStartNode, setEdges, edges, nodes]);

  const handlePaneClick = useCallback((event) => {
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionStartNode(null);
    }
  }, [isConnecting]);

  const defaultEdgeOptions = {
    type: 'custom',
    animated: true,
    style: { 
      stroke: '#F26430', 
      strokeWidth: 5,
      strokeOpacity: 1
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#F26430',
    },
    pathOptions: {
      offset: 5,
      borderRadius: 10
    }
  };

  // Add an environment to the map
  const addEnvironmentToMap = useCallback((environment) => {
    if (nodes.some(node => node.id === `env-${environment.id}`)) {
      return;
    }
    
    const position = environment.mapCoordinates ? 
      { x: environment.mapCoordinates.x, y: environment.mapCoordinates.y } : 
      { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 };
    
    const newNode = {
      id: `env-${environment.id}`,
      type: 'environment',
      position: position,
      data: { 
        label: environment.name || 'Unnamed Environment',
        imageUrl: environment.imageUrl || '',
        climate: environment.climate || '',
        description: environment.description || '',
        environmentId: environment.id
      },
      connectable: true,
      sourcePosition: 'right',
      targetPosition: 'left',
    };
    
    setNodes(currentNodes => [...currentNodes, newNode]);
  }, [nodes, setNodes]);

  // Add a character to the map
  const addCharacterToMap = useCallback((character) => {
    if (nodes.some(node => node.id === `char-${character.id}`)) {
      return;
    }
    
    const newNode = {
      id: `char-${character.id}`,
      type: 'character',
      position: { 
        x: 100 + Math.random() * 200, 
        y: 100 + Math.random() * 200 
      },
      data: { 
        label: character.name,
        imageUrl: character.imageUrl,
        description: character.description || '',
        characterId: character.id
      },
      connectable: true,
      sourcePosition: 'right',
      targetPosition: 'left',
    };
    
    setNodes(current => [...current, newNode]);
  }, [nodes, setNodes]);

  // Remove a node from the map
  const removeNode = useCallback((nodeId) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    setEdges(edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
  }, [nodes, edges, setNodes, setEdges]);

  // Save node positions after drag
  const onNodeDragStop = useCallback((event, node) => {
    if (node.id.startsWith('env-')) {
      const environmentId = node.data.environmentId;
      const updatedEnvironments = environments.map(env => {
        if (env.id === environmentId) {
          return {
            ...env,
            mapCoordinates: {
              x: node.position.x,
              y: node.position.y
            }
          };
        }
        return env;
      });
      setEnvironments(updatedEnvironments);
      saveEnvironments(updatedEnvironments);
    }
  }, [environments, setEnvironments]);

  // Handle edge removal
  const onEdgeClick = useCallback((event, edge) => {
    const isDeleteConfirmed = window.confirm('Remove this connection?');
    if (isDeleteConfirmed) {
      setEdges(edges.filter(e => e.id !== edge.id));
    }
  }, [edges, setEdges]);

  return (
    <div className="map-page">
      <h1>World Map</h1>
      
      <div className="map-container" style={{ 
        width: '100%', 
        height: '80vh', 
        display: 'flex',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        position: 'relative'
      }}>
        <ErrorBoundary>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onEdgeClick={onEdgeClick}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            connectionMode="strict"
            style={{ 
              flex: 1, 
              width: '100%', 
              height: '100%',
              background: isConnecting ? 'rgba(26, 26, 29, 0.95)' : 'var(--black)'  
            }}
            nodesDraggable={true}
            elementsSelectable={true}
            zoomOnScroll={true}
            panOnScroll={false}
            preventScrolling={true}
            snapToGrid={true}
            snapGrid={[15, 15]}
          >
            {isConnecting && (
              <Panel position="top-center" style={{
                padding: '8px 15px',
                background: 'var(--dark-bg)',
                color: 'var(--teal)',
                border: '1px solid var(--teal)',
                borderRadius: '20px',
                fontSize: '14px',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
                marginTop: '10px'
              }}>
                Connecting from {connectionStartNode?.data?.label || 'node'} — click on another node to connect or anywhere to cancel
              </Panel>
            )}
            
            <Controls 
              style={{
                button: {
                  backgroundColor: 'var(--dark-bg)',
                  color: 'var(--white)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px'
                },
                buttonHovered: {
                  backgroundColor: 'var(--teal)',
                  color: 'var(--black)'
                }
              }}
            />
            <MiniMap 
              style={{
                backgroundColor: 'var(--dark-bg)',
                maskColor: 'rgba(0, 0, 0, 0.2)'
              }}
              nodeStrokeColor={(n) => {
                return n.type === 'environment' ? 'var(--teal)' : 'var(--purple)';
              }}
              nodeColor={(n) => {
                return n.type === 'environment' ? 'rgba(80, 200, 186, 0.6)' : 'rgba(138, 86, 232, 0.6)';
              }}
            />
            <Background 
              variant="dots" 
              gap={20} 
              size={1} 
              color="rgba(255, 255, 255, 0.05)"
            />
            
            <Panel position="top-right">
              <button 
                className="sidebar-toggle"
                style={{
                  padding: '8px 15px',
                  background: 'var(--dark-bg)',
                  color: 'var(--white)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? '← Hide Sidebar' : 'Show Sidebar →'}
              </button>
            </Panel>
            <Panel position="bottom-left" style={{
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              fontSize: '12px',
              borderRadius: '4px'
            }}>
              Edges: {edges.length} | Nodes: {nodes.length}
            </Panel>
          </ReactFlow>
        </ErrorBoundary>
        
        {showSidebar && (
          <div className="map-sidebar" style={{
            width: '280px',
            height: '100%',
            padding: '0',
            background: 'var(--dark-bg)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="sidebar-tabs" style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button 
                className={`tab-button ${activeTab === 'environments' ? 'active' : ''}`}
                style={{
                  flex: '1',
                  padding: '12px 8px',
                  background: activeTab === 'environments' ? 'rgba(80, 200, 186, 0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'environments' ? '2px solid var(--teal)' : 'none',
                  color: 'var(--white)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setActiveTab('environments')}
              >
                Environments
              </button>
              <button 
                className={`tab-button ${activeTab === 'characters' ? 'active' : ''}`}
                style={{
                  flex: '1',
                  padding: '12px 8px',
                  background: activeTab === 'characters' ? 'rgba(138, 86, 232, 0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'characters' ? '2px solid var(--purple)' : 'none',
                  color: 'var(--white)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setActiveTab('characters')}
              >
                Characters
              </button>
              <button 
                className={`tab-button ${activeTab === 'nodes' ? 'active' : ''}`}
                style={{
                  flex: '1',
                  padding: '12px 8px',
                  background: activeTab === 'nodes' ? 'rgba(242, 100, 48, 0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'nodes' ? '2px solid var(--orange)' : 'none',
                  color: 'var(--white)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setActiveTab('nodes')}
              >
                Map Items
              </button>
            </div>
            
            <div className="sidebar-content" style={{
              flex: '1',
              padding: '15px',
              overflowY: 'auto'
            }}>
              {activeTab === 'environments' && (
                <div className="environments-list">
                  <h3 style={{
                    color: 'var(--teal)',
                    fontSize: '18px',
                    marginTop: '5px',
                    position: 'relative',
                    paddingBottom: '8px',
                    marginBottom: '15px'
                  }}>
                    Your Environments
                    <span style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      width: '40px',
                      height: '2px',
                      background: 'var(--teal)'
                    }}></span>
                  </h3>
                  {environments.length === 0 ? (
                    <p style={{
                      color: 'var(--beige)',
                      padding: '15px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                      textAlign: 'center'
                    }}>No environments created yet.</p>
                  ) : (
                    <ul className="draggable-items" style={{
                      listStyle: 'none',
                      padding: '0',
                      margin: '0'
                    }}>
                      {environments.map(env => (
                        <li 
                          key={env.id} 
                          className="draggable-item" 
                          onClick={() => addEnvironmentToMap(env)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px',
                            margin: '0 0 10px 0',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: 'rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '3px',
                            height: '100%',
                            background: 'var(--teal)'
                          }}></span>
                          {env.imageUrl && (
                            <div className="item-thumbnail" style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              marginRight: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              <img 
                                src={env.imageUrl} 
                                alt={env.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            </div>
                          )}
                          <span className="item-name" style={{
                            flex: '1',
                            fontSize: '14px'
                          }}>{env.name}</span>
                          <button 
                            className="add-button" 
                            style={{
                              width: '28px',
                              height: '28px',
                              background: 'rgba(80, 200, 186, 0.2)',
                              color: 'var(--teal)',
                              border: '1px solid rgba(80, 200, 186, 0.4)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '16px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            +
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              
              {activeTab === 'characters' && (
                <div className="characters-list">
                  <h3 style={{
                    color: 'var(--purple)',
                    fontSize: '18px',
                    marginTop: '5px',
                    position: 'relative',
                    paddingBottom: '8px',
                    marginBottom: '15px'
                  }}>
                    Your Characters
                    <span style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      width: '40px',
                      height: '2px',
                      background: 'var(--purple)'
                    }}></span>
                  </h3>
                  {characters.length === 0 ? (
                    <p style={{
                      color: 'var(--beige)',
                      padding: '15px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                      textAlign: 'center'
                    }}>No characters created yet.</p>
                  ) : (
                    <ul className="draggable-items" style={{
                      listStyle: 'none',
                      padding: '0',
                      margin: '0'
                    }}>
                      {characters.map(char => (
                        <li 
                          key={char.id} 
                          className="draggable-item" 
                          onClick={() => addCharacterToMap(char)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px',
                            margin: '0 0 10px 0',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: 'rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '3px',
                            height: '100%',
                            background: 'var(--purple)'
                          }}></span>
                          {char.imageUrl && (
                            <div className="item-thumbnail" style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              marginRight: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              <img 
                                src={char.imageUrl} 
                                alt={char.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            </div>
                          )}
                          <span className="item-name" style={{
                            flex: '1',
                            fontSize: '14px'
                          }}>{char.name}</span>
                          <button 
                            className="add-button"
                            style={{
                              width: '28px',
                              height: '28px',
                              background: 'rgba(138, 86, 232, 0.2)',
                              color: 'var(--purple)',
                              border: '1px solid rgba(138, 86, 232, 0.4)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '16px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            +
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              
              {activeTab === 'nodes' && (
                <div className="nodes-list">
                  <h3 style={{
                    color: 'var(--orange)',
                    fontSize: '18px',
                    marginTop: '5px',
                    position: 'relative',
                    paddingBottom: '8px',
                    marginBottom: '15px'
                  }}>
                    Map Elements
                    <span style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      width: '40px',
                      height: '2px',
                      background: 'var(--orange)'
                    }}></span>
                  </h3>
                  {nodes.length === 0 ? (
                    <p style={{
                      color: 'var(--beige)',
                      padding: '15px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                      textAlign: 'center'
                    }}>No elements on the map yet.</p>
                  ) : (
                    <ul className="draggable-items" style={{
                      listStyle: 'none',
                      padding: '0',
                      margin: '0'
                    }}>
                      {nodes.map(node => (
                        <li 
                          key={node.id} 
                          className="draggable-item"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px',
                            margin: '0 0 10px 0',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '3px',
                            height: '100%',
                            background: node.type === 'environment' ? 'var(--teal)' : 'var(--purple)'
                          }}></span>
                          <span className="item-name" style={{
                            flex: '1',
                            fontSize: '14px'
                          }}>{node.data.label}</span>
                          <button 
                            className="remove-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNode(node.id);
                            }}
                            style={{
                              width: '28px',
                              height: '28px',
                              background: 'rgba(255, 93, 115,0.2)',
                              color: 'var(--pink)',
                              border: '1px solid rgba(255, 93, 115, 0.4)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '16px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div style={{marginTop: '20px'}}>
                    <h4 style={{
                      color: 'var(--beige)',
                      fontSize: '16px',
                      marginBottom: '10px',
                      position: 'relative',
                      paddingBottom: '8px'
                    }}>
                      Connection Information
                      <span style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '30px',
                        height: '2px',
                        background: 'var(--beige)'
                      }}></span>
                    </h4>
                    {edges.length === 0 ? (
                      <p style={{
                        color: 'var(--beige)',
                        padding: '15px',
                        borderRadius: '6px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px dashed rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                        fontSize: '13px'
                      }}>No connections yet. Right-click on a node to start creating connections.</p>
                    ) : (
                      <ul style={{
                        listStyle: 'none',
                        padding: '0',
                        margin: '0'
                      }}>
                        {edges.map(edge => {
                          const sourceNode = nodes.find(n => n.id === edge.source);
                          const targetNode = nodes.find(n => n.id === edge.target);
                          return (
                            <li 
                              key={edge.id}
                              style={{
                                padding: '10px',
                                margin: '0 0 10px 0',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                fontSize: '13px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              <span style={{
                                position: 'absolute',
                                top: '0',
                                left: '0',
                                width: '3px',
                                height: '100%',
                                background: 'var(--teal)'
                              }}></span>
                              <div>
                                <strong style={{color: 'var(--white)'}}>{sourceNode?.data.label || 'Unknown'}</strong> 
                                <span style={{color: 'var(--teal)', margin: '0 5px'}}>→</span> 
                                <strong style={{color: 'var(--white)'}}>{targetNode?.data.label || 'Unknown'}</strong>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEdges(edges.filter(e => e.id !== edge.id));
                                }}
                                style={{
                                  marginTop: '8px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  background: 'rgba(255, 93, 115, 0.2)',
                                  color: 'var(--pink)',
                                  border: '1px solid rgba(255, 93, 115, 0.4)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                Remove Connection
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              padding: '15px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.2)'
            }}>
              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: 'var(--beige)'
              }}>Map Controls:</h4>
              <ul style={{
                margin: '0',
                padding: '0 0 0 15px',
                fontSize: '12px',
                color: 'var(--beige)'
              }}>
                <li style={{marginBottom: '3px'}}>Drag to move nodes</li>
                <li style={{marginBottom: '3px'}}>Right-click on a node to start a connection</li>
                <li style={{marginBottom: '3px'}}>Scroll to zoom in/out</li>
                <li style={{marginBottom: '3px'}}>Click connection to delete it</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div style={{
        marginTop: '25px', 
        padding: '20px',
        background: 'var(--dark-bg)',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-5px',
          left: '0',
          width: '100%',
          height: '5px',
          background: 'linear-gradient(90deg, var(--teal), var(--purple))'
        }}></div>
        
        <h3 style={{
          color: 'var(--teal)',
          marginTop: '0'
        }}>How to Use the World Map</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginTop: '15px'
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <h4 style={{
              color: 'var(--white)',
              margin: '0 0 10px 0',
              position: 'relative',
              paddingBottom: '8px'
            }}>
              Adding Elements
              <span style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                width: '30px',
                height: '2px',
                background: 'var(--teal)'
              }}></span>
            </h4>
            <ul style={{
              paddingLeft: '20px',
              margin: '0',
              color: 'var(--beige)'
            }}>
              <li>Select "Environments" or "Characters" tab</li>
              <li>Click on any item to add it to the map</li>
              <li>Items can be added multiple times</li>
            </ul>
          </div>
          
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <h4 style={{
              color: 'var(--white)',
              margin: '0 0 10px 0',
              position: 'relative',
              paddingBottom: '8px'
            }}>
              Creating Connections
              <span style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                width: '30px',
                height: '2px',
                background: 'var(--purple)'
              }}></span>
            </h4>
            <ul style={{
              paddingLeft: '20px',
              margin: '0',
              color: 'var(--beige)'
            }}>
              <li>Right-click on a node to start a connection</li>
              <li>Click on another node to complete the connection</li>
              <li>Click anywhere else to cancel the connection</li>
              <li>Click on a connection line to remove it</li>
            </ul>
          </div>
          
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <h4 style={{
              color: 'var(--white)',
              margin: '0 0 10px 0',
              position: 'relative',
              paddingBottom: '8px'
            }}>
              Managing the Map
              <span style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                width: '30px',
                height: '2px',
                background: 'var(--orange)'
              }}></span>
            </h4>
            <ul style={{
              paddingLeft: '20px',
              margin: '0',
              color: 'var(--beige)'
            }}>
              <li>Use "Map Items" tab to view all elements</li>
              <li>Click × to remove any element from the map</li>
              <li>Your map layout is automatically saved</li>
              <li>Use the controls in the bottom-left to zoom and reset the view</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapPage;