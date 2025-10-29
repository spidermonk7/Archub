import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Node as FlowNode,
  Edge as FlowEdge,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  Panel,
  NodeChange,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { Card, Tag, Tooltip } from 'antd';
import { Node, Edge } from '../utils/types';
import '@xyflow/react/dist/style.css';
import './NodeCanvas.css';

interface NodeCanvasProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodes: string[];
  onNodesSelect: (nodeIds: string[]) => void;
  onEdgesSelect?: (edgeIds: string[]) => void;
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
  isCreatingEdge?: boolean;
  edgeCreationSource?: string;
  edgeCreationTarget?: string;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  mousePosition?: { x: number; y: number };
  onComponentDrop?: (nodeId: string, component: { type: 'memory' | 'tool'; key: string; payload?: any }) => void;
}

const getNodeTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    input: 'cyan',
    output: 'orange',
    agent: 'blue',
    logic: 'purple',
    default: 'default',
  };
  return colors[type] || colors.default;
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    input: 'Input',
    output: 'Output',
    agent: 'Agent',
    logic: 'Logic',
  };
  return labels[type] || type;
};

const CustomNode: React.FC<any> = ({ data, selected }) => {
  const isSpecialNode = data.type === 'input' || data.type === 'output';
  const isCreatingEdgeSource = data.isCreatingEdgeSource;
  const isCreatingEdgeTarget = data.isCreatingEdgeTarget;
  const isCreatingEdgeCandidate = data.isCreatingEdgeCandidate;

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (e.dataTransfer.types.includes('application/x-archub-component')) {
      e.preventDefault();
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    const json = e.dataTransfer.getData('application/x-archub-component');
    if (!json) return;
    try {
      const comp = JSON.parse(json);
      if (typeof data.onComponentDrop === 'function') {
        data.onComponentDrop(data.id, comp);
      }
    } catch {}
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#1677ff', opacity: data.type === 'input' ? 0.3 : 1 }}
        isConnectable={data.type !== 'input'}
      />
      <Card
        size="small"
        title={
          <div className="node-header">
            <div className="node-name">{data.name}</div>
            <Tag color={getNodeTypeColor(data.type)}>{data.typeLabel}</Tag>
          </div>
        }
        className={`custom-node ${selected ? 'selected' : ''} ${isSpecialNode ? 'special-node' : ''} ${
          isCreatingEdgeSource ? 'creating-edge-source' : isCreatingEdgeTarget ? 'creating-edge-target' : isCreatingEdgeCandidate ? 'creating-edge-candidate' : ''
        }`}
        style={{
          width: 200,
          minHeight: 120,
          border: (() => {
            if (isCreatingEdgeSource) return '1px solid rgba(82, 196, 26, 0.65)';
            if (isCreatingEdgeTarget) return '1px solid rgba(255, 77, 79, 0.65)';
            if (isCreatingEdgeCandidate) return '1px solid rgba(22, 119, 255, 0.65)';
            if (selected) return '1px solid rgba(22, 119, 255, 0.6)';
            if (isSpecialNode) return '1px solid rgba(82, 196, 26, 0.5)';
            return '1px solid rgba(148, 163, 184, 0.18)';
          })(),
          boxShadow: (() => {
            if (isCreatingEdgeSource) return '0 12px 34px rgba(82, 196, 26, 0.28)';
            if (isCreatingEdgeTarget) return '0 12px 34px rgba(255, 77, 79, 0.28)';
            if (isCreatingEdgeCandidate) return '0 12px 34px rgba(22, 119, 255, 0.28)';
            if (selected) return '0 20px 46px rgba(22, 119, 255, 0.32)';
            return '0 20px 52px rgba(12, 18, 34, 0.38)';
          })(),
          cursor: isCreatingEdgeCandidate ? 'pointer' : 'default',
          background: 'rgba(14, 17, 28, 0.9)',
          backdropFilter: 'blur(20px)',
        }}
        styles={{ body: { padding: '8px 12px' } }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Tooltip title={data.description}>
          <div className="node-description">
            {data.description.length > 50 ? `${data.description.substring(0, 50)}...` : data.description}
          </div>
        </Tooltip>

        {data.config && Object.keys(data.config).length > 0 && (
          <div className="node-config">
            <div className="config-label">Config:</div>
            {Object.entries(data.config)
              .slice(0, 2)
              .map(([key, value]: any) => (
                <div key={key} className="config-item">
                  <span className="config-key">{key}:</span>
                  <span className="config-value">
                    {String(value).length > 15 ? `${String(value).substring(0, 15)}...` : String(value)}
                  </span>
                </div>
              ))}
            {Object.keys(data.config).length > 2 && <div className="config-more">...</div>}
          </div>
        )}

        {(data.config?.memory || (Array.isArray(data.config?.tools) && data.config.tools.length > 0)) && (
          <div className="node-components">
            {data.config?.memory && <Tag color="purple">Memory: {data.config.memory.type || 'simple'}</Tag>}
            {Array.isArray(data.config?.tools) && data.config.tools.length > 0 && (
              <Tag color="geekblue">Tools: {data.config.tools.length}</Tag>
            )}
          </div>
        )}
      </Card>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#1677ff', opacity: data.type === 'output' ? 0.3 : 1 }}
        isConnectable={data.type !== 'output'}
      />
    </>
  );
};

const nodeTypes = { custom: CustomNode };

const NodeCanvas: React.FC<NodeCanvasProps> = ({
  nodes,
  edges,
  selectedNodes,
  onNodesSelect,
  onEdgesSelect,
  onNodePositionChange,
  isCreatingEdge = false,
  edgeCreationSource,
  edgeCreationTarget,
  onNodeClick,
  onEdgeClick,
  mousePosition,
  onComponentDrop,
}) => {
  const flowNodes = useMemo(() => {
    return nodes.map((node): FlowNode => ({
      id: node.id,
      type: 'custom',
      position: node.position,
      data: {
        ...node as any,
        typeLabel: getTypeLabel(node.type),
        isCreatingEdgeSource: isCreatingEdge && edgeCreationSource === node.id,
        isCreatingEdgeTarget: isCreatingEdge && edgeCreationTarget === node.id,
        isCreatingEdgeCandidate:
          isCreatingEdge && (!edgeCreationSource || (edgeCreationSource !== node.id && !edgeCreationTarget)),
        onComponentDrop,
      },
      selected: selectedNodes.includes(node.id),
      draggable: !isCreatingEdge,
      selectable: true,
    }));
  }, [nodes, selectedNodes, isCreatingEdge, edgeCreationSource, edgeCreationTarget, onComponentDrop]);

  const flowEdges = useMemo(() => {
    const regularEdges = edges.map((edge): FlowEdge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: null as any,
      targetHandle: null as any,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: edge.type === 'hard' ? '#1677ff' : '#52c41a',
        strokeWidth: 2,
        strokeDasharray: edge.type === 'hard' ? 'none' : '5,5',
      },
      markerEnd: {
        type: 'arrowclosed',
        width: 20,
        height: 20,
        color: edge.type === 'hard' ? '#1677ff' : '#52c41a',
      },
      label: edge.config?.description || edge.type.toUpperCase(),
      labelStyle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: edge.type === 'hard' ? '#1677ff' : '#52c41a',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '4px 8px',
        borderRadius: '6px',
        border: `1px solid ${edge.type === 'hard' ? '#1677ff' : '#52c41a'}`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      labelBgStyle: { fill: 'rgba(255, 255, 255, 0.9)', fillOpacity: 0.9 },
    }));

    if (isCreatingEdge && edgeCreationSource && mousePosition) {
      const sourceNode = nodes.find((n) => n.id === edgeCreationSource);
      if (sourceNode) {
        const previewEdge: FlowEdge = {
          id: 'preview-edge',
          source: edgeCreationSource,
          target: 'preview-target',
          type: 'straight',
          animated: false,
          style: { stroke: '#1677ff', strokeWidth: 2, strokeDasharray: '10,5', opacity: 0.6 },
          markerEnd: { type: 'arrowclosed', width: 15, height: 15, color: '#1677ff' },
        } as any;
        regularEdges.push(previewEdge);
      }
    }

    return regularEdges;
  }, [edges, isCreatingEdge, edgeCreationSource, mousePosition, nodes]);

  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [reactFlowEdges, setReactFlowEdges] = useEdgesState<FlowEdge>([]);

  useEffect(() => {
    setReactFlowNodes(flowNodes);
  }, [flowNodes, setReactFlowNodes]);

  useEffect(() => {
    setReactFlowEdges(flowEdges);
  }, [flowEdges, setReactFlowEdges]);

  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
      if (!isCreatingEdge) {
        const nodeIds = nodes.map((node) => node.id);
        onNodesSelect(nodeIds);
        if (typeof onEdgesSelect === 'function') {
          const edgeIds = edges.map((e) => e.id);
          onEdgesSelect(edgeIds);
        }
      }
    },
    [onNodesSelect, onEdgesSelect, isCreatingEdge]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      if (!onNodeClick) return;
      if (isCreatingEdge) {
        // When the user is creating a connection, block default selection behaviour
        // and let the parent handle the click for edge picking instead.
        event.stopPropagation();
      }
      onNodeClick(node.id);
    },
    [isCreatingEdge, onNodeClick]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      const dragEndChanges = changes.filter((change) => change.type === 'position' && (change as any).position && !(change as any).dragging);
      if (dragEndChanges.length > 0 && onNodePositionChange) {
        setTimeout(() => {
          dragEndChanges.forEach((change: any) => {
            if (change.type === 'position' && change.position) {
              onNodePositionChange(change.id, change.position);
            }
          });
        }, 100);
      }
    },
    [onNodesChange, onNodePositionChange]
  );

  return (
    <div className="node-canvas">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onSelectionChange={onSelectionChange}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={(_, edge) => onEdgeClick && onEdgeClick(edge.id)}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={!isCreatingEdge}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable={true}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap style={{ height: 120, backgroundColor: '#f5f5f5' }} zoomable pannable />
        <Panel position="top-left" className="canvas-info">
          <div>Nodes: {nodes.length}</div>
          <div>Connections: {edges.length}</div>
          {selectedNodes.length > 0 && <div>Selected: {selectedNodes.length} nodes</div>}
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default NodeCanvas;
