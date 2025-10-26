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
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
  isCreatingEdge?: boolean;
  edgeCreationSource?: string;
  edgeCreationTarget?: string;
  onNodeClick?: (nodeId: string) => void;
  mousePosition?: { x: number; y: number };
}

const getNodeTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    input: 'cyan',
    output: 'orange',
    agent: 'blue',
    default: 'default',
  };
  return colors[type] || colors.default;
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    input: '输入',
    output: '输出',
    agent: '智能体',
  };
  return labels[type] || type;
};

const CustomNode: React.FC<any> = ({ data, selected }) => {
  const isSpecialNode = data.type === 'input' || data.type === 'output';
  const isCreatingEdgeSource = data.isCreatingEdgeSource;
  const isCreatingEdgeTarget = data.isCreatingEdgeTarget;
  const isCreatingEdgeCandidate = data.isCreatingEdgeCandidate;
  
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ 
          background: '#1677ff',
          opacity: data.type === 'input' ? 0.3 : 1 // 输入节点的target handle半透明
        }}
        isConnectable={data.type !== 'input'} // 输入节点不允许连入
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
          isCreatingEdgeSource ? 'creating-edge-source' : 
          isCreatingEdgeTarget ? 'creating-edge-target' : 
          isCreatingEdgeCandidate ? 'creating-edge-candidate' : ''
        }`}
        style={{
          width: 200,
          minHeight: 120,
          border: isCreatingEdgeSource ? '2px solid #52c41a' :
                  isCreatingEdgeTarget ? '2px solid #ff4d4f' :
                  isCreatingEdgeCandidate ? '2px solid #1677ff' :
                  selected ? '2px solid #1677ff' : 
                  isSpecialNode ? '2px solid #52c41a' : '1px solid #d9d9d9',
          boxShadow: isCreatingEdgeSource ? '0 0 0 3px rgba(82, 196, 26, 0.3)' :
                     isCreatingEdgeTarget ? '0 0 0 3px rgba(255, 77, 79, 0.3)' :
                     isCreatingEdgeCandidate ? '0 0 0 3px rgba(22, 119, 255, 0.3)' :
                     selected ? '0 4px 12px rgba(22, 119, 255, 0.3)' : 
                     isSpecialNode ? '0 4px 12px rgba(82, 196, 26, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          cursor: isCreatingEdgeCandidate ? 'pointer' : 'default',
        }}
        styles={{ body: { padding: '8px 12px' } }}
      >
        <Tooltip title={data.description}>
          <div className="node-description">
            {data.description.length > 50 
              ? `${data.description.substring(0, 50)}...` 
              : data.description}
          </div>
        </Tooltip>
        
        {data.config && Object.keys(data.config).length > 0 && (
          <div className="node-config">
            <div className="config-label">配置:</div>
            {Object.entries(data.config).slice(0, 2).map(([key, value]) => (
              <div key={key} className="config-item">
                <span className="config-key">{key}:</span>
                <span className="config-value">
                  {String(value).length > 15 ? `${String(value).substring(0, 15)}...` : String(value)}
                </span>
              </div>
            ))}
            {Object.keys(data.config).length > 2 && (
              <div className="config-more">...</div>
            )}
          </div>
        )}
      </Card>
      <Handle
        type="source"
        position={Position.Right}
        style={{ 
          background: '#1677ff',
          opacity: data.type === 'output' ? 0.3 : 1 // 输出节点的source handle半透明
        }}
        isConnectable={data.type !== 'output'} // 输出节点不允许连出
      />
    </>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const NodeCanvas: React.FC<NodeCanvasProps> = ({
  nodes,
  edges,
  selectedNodes,
  onNodesSelect,
  onNodePositionChange,
  isCreatingEdge = false,
  edgeCreationSource,
  edgeCreationTarget,
  onNodeClick,
  mousePosition,
}) => {
  const flowNodes = useMemo(() => {
    return nodes.map((node): FlowNode => ({
      id: node.id,
      type: 'custom',
      position: node.position,
      data: {
        ...node,
        typeLabel: getTypeLabel(node.type),
        isCreatingEdgeSource: isCreatingEdge && edgeCreationSource === node.id,
        isCreatingEdgeTarget: isCreatingEdge && edgeCreationTarget === node.id,
        isCreatingEdgeCandidate: isCreatingEdge && 
          (!edgeCreationSource || (edgeCreationSource !== node.id && !edgeCreationTarget)),
      },
      selected: selectedNodes.includes(node.id),
      draggable: !isCreatingEdge, // 仍然在创建模式下禁用拖拽
      selectable: true, // 允许选择，这样可以响应点击事件
    }));
  }, [nodes, selectedNodes, isCreatingEdge, edgeCreationSource, edgeCreationTarget]);

  const flowEdges = useMemo(() => {
    const regularEdges = edges.map((edge): FlowEdge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: null,
      targetHandle: null,
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
      labelBgStyle: {
        fill: 'rgba(255, 255, 255, 0.9)',
        fillOpacity: 0.9,
      },
    }));

    // 添加创建中的虚线边
    if (isCreatingEdge && edgeCreationSource && mousePosition) {
      const sourceNode = nodes.find(n => n.id === edgeCreationSource);
      if (sourceNode) {
        const previewEdge: FlowEdge = {
          id: 'preview-edge',
          source: edgeCreationSource,
          target: 'preview-target',
          type: 'straight',
          animated: false,
          style: {
            stroke: '#1677ff',
            strokeWidth: 2,
            strokeDasharray: '10,5',
            opacity: 0.6,
          },
          markerEnd: {
            type: 'arrowclosed',
            width: 15,
            height: 15,
            color: '#1677ff',
          },
        };
        regularEdges.push(previewEdge);
      }
    }

    return regularEdges;
  }, [edges, isCreatingEdge, edgeCreationSource, mousePosition, nodes]);

  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [reactFlowEdges, setReactFlowEdges] = useEdgesState<FlowEdge>([]);

  // 当props变化时更新React Flow状态
  useEffect(() => {
    setReactFlowNodes(flowNodes);
  }, [flowNodes, setReactFlowNodes]);

  useEffect(() => {
    setReactFlowEdges(flowEdges);
  }, [flowEdges, setReactFlowEdges]);

  const onSelectionChange = useCallback(
    ({ nodes }: { nodes: FlowNode[] }) => {
      if (!isCreatingEdge) {
        // 普通模式下的节点选择
        const nodeIds = nodes.map(node => node.id);
        onNodesSelect(nodeIds);
      }
      // 在Edge创建模式下不处理选择变化，让节点点击事件处理
    },
    [onNodesSelect, isCreatingEdge]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      if (isCreatingEdge && onNodeClick) {
        // Edge创建模式下的节点点击
        event.stopPropagation();
        onNodeClick(node.id);
      }
      // 普通模式下不需要特殊处理，让ReactFlow的默认选择逻辑处理
    },
    [isCreatingEdge, onNodeClick]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 应用ReactFlow的标准节点变化处理
      onNodesChange(changes);
      
      // 只在拖动结束时通知父组件（避免频繁更新）
      const dragEndChanges = changes.filter(change => 
        change.type === 'position' && change.position && !change.dragging
      );
      
      if (dragEndChanges.length > 0 && onNodePositionChange) {
        // 延迟通知，确保拖动完全结束
        setTimeout(() => {
          dragEndChanges.forEach((change) => {
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
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={!isCreatingEdge} // 创建模式下禁用拖拽
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable={true} // 始终允许选择
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap 
          style={{
            height: 120,
            backgroundColor: '#f5f5f5',
          }}
          zoomable
          pannable
        />
        <Panel position="top-left" className="canvas-info">
          <div>节点数量: {nodes.length}</div>
          <div>连接数量: {edges.length}</div>
          {selectedNodes.length > 0 && (
            <div>已选择: {selectedNodes.length} 个节点</div>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default NodeCanvas;