import { Handle, Position } from 'reactflow';

const CustomNode = ({ data, id }) => {
  const handleAddConnectedNode = () => {
    const newNode = {
      id: `${data.type}_${Date.now()}`,
      type: 'custom',
      position: {
        x: data.position?.x + 150, // Position the new node to the right
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
      </div>
      <button className="add-node-btn" onClick={handleAddConnectedNode}>
        +
      </button>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode
};