import React, { useMemo } from 'react';
import {
  ReactFlow,
  Node as FlowNode,
  Edge as FlowEdge,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position,
} from '@xyflow/react';
import { Card, Tag, Tooltip, Badge } from 'antd';
import { Node, Edge } from '../utils/types';
import '@xyflow/react/dist/style.css';
import './RunningNodeCanvas.css';

type NodeState = 'waiting' | 'processing' | 'done' | undefined;

interface RunningNodeCanvasProps {
  nodes: Node[];
  edges: Edge[];
  activeNodes: Set<string>;
  isRunning: boolean;
  nodeStates?: Record<string, NodeState>;
  activeEdges?: Set<string>;
}

const RunningCustomNode: React.FC<any> = ({ data, selected }) => {
  const isRunning = data.isRunning;
  const state: 'waiting' | 'processing' | 'done' | undefined = data.state;

  const badge = (() => {
    if (state === 'processing') return { text: '处理中', color: 'orange' as const };
    if (state === 'done') return { text: '完成', color: 'green' as const };
    if (state === 'waiting') return { text: '等待中', color: 'blue' as const };
    return { text: '', color: 'default' as const };
  })();

  return (
    <>
    <Handle
      type="target"
      position={Position.Left}
      style={{ background: '#1677ff', opacity: data.type === 'input' ? 0.3 : 1 }}
      isConnectable={data.type !== 'input'}
    />
    <Badge.Ribbon
      text={badge.text}
      color={badge.color}
      style={{ display: badge.text ? 'block' : 'none' }}
    >
      <Card
        size="small"
        title={
          <div className="running-node-header">
            <div className="node-name">{data.name}</div>
            <Tag color={getNodeTypeColor(data.type)}>{data.typeLabel}</Tag>
          </div>
        }
        className={`running-custom-node ${state ? `state-${state}` : ''} ${isRunning ? 'system-running' : ''}`}
        style={{
          width: 200,
          minHeight: 120,
          border: state === 'done' ? '1px solid #1f3322' : state === 'processing' ? '1px solid #33260f' : state === 'waiting' ? '1px solid #13233a' : '1px solid #222222',
          boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
          backgroundColor: state === 'done' ? '#0d1a0f' : state === 'processing' ? '#1a1405' : state === 'waiting' ? '#0a1220' : '#121212',
          color: '#ffffff',
          animation: state === 'processing' ? 'pulse 1.2s ease-in-out' : 'none',
        }}
        bodyStyle={{ padding: '8px 12px' }}
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

        {state === 'processing' && (
          <div className="activity-indicator">
            <div className="activity-dot"></div>
            <span>处理中...</span>
          </div>
        )}
      </Card>
    </Badge.Ribbon>
    <Handle
      type="source"
      position={Position.Right}
      style={{ background: '#1677ff', opacity: data.type === 'output' ? 0.3 : 1 }}
      isConnectable={data.type !== 'output'}
    />
    </>
  );
};

const getNodeTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    agent: 'blue',
    tool: 'green',
    coordinator: 'purple',
    logic: 'purple',
    input: 'cyan',
    output: 'orange',
    default: 'default',
  };
  return colors[type] || colors.default;
};

const RunningNodeCanvas: React.FC<RunningNodeCanvasProps> = ({
  nodes,
  edges,
  activeNodes,
  isRunning,
  nodeStates = {},
  activeEdges = new Set<string>(),
}) => {
  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      agent: 'Agent',
      tool: 'Tool',
      coordinator: 'Coordinator',
      logic: 'Logic',
      input: 'Input',
      output: 'Output',
    };
    return labels[type] || type;
  }

  const flowNodes = useMemo(() => {
    return nodes.map((node): FlowNode => ({
      id: node.id,
      type: 'runningCustom',
      position: node.position,
      data: {
        ...node,
        typeLabel: getTypeLabel(node.type),
        state: nodeStates[node.id] as NodeState,
        isRunning,
      },
    }));
  }, [nodes, isRunning, nodeStates]);

  const flowEdges = useMemo(() => {
    return edges.map((edge): FlowEdge => {
      const edgeId = edge.id || `${edge.source}__to__${edge.target}`;
      const isEdgeActive = activeEdges.has(edgeId);

      return {
        id: edgeId,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: isEdgeActive && isRunning,
        style: {
          stroke: isEdgeActive
            ? (edge.type === 'hard' ? '#52c41a' : '#faad14')
            : (edge.type === 'hard' ? '#1677ff' : '#52c41a'),
          strokeWidth: isEdgeActive ? 3.5 : 2,
          opacity: isEdgeActive ? 1 : 0.7,
        },
        markerEnd: {
          type: 'arrowclosed',
          color: isEdgeActive
            ? (edge.type === 'hard' ? '#52c41a' : '#faad14')
            : (edge.type === 'hard' ? '#1677ff' : '#52c41a'),
        },
        label: edge.type.toUpperCase(),
        labelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          color: isEdgeActive
            ? (edge.type === 'hard' ? '#52c41a' : '#faad14')
            : (edge.type === 'hard' ? '#1677ff' : '#52c41a'),
        },
      };
    });
  }, [edges, activeEdges, isRunning]);

  const [reactFlowNodes, setReactFlowNodes] = useNodesState(flowNodes);
  const [reactFlowEdges, setReactFlowEdges] = useEdgesState(flowEdges);

  React.useEffect(() => {
    setReactFlowNodes(flowNodes);
  }, [flowNodes, setReactFlowNodes]);

  React.useEffect(() => {
    setReactFlowEdges(flowEdges);
  }, [flowEdges, setReactFlowEdges]);

  const nodeTypes = useMemo(() => ({
    runningCustom: RunningCustomNode,
  }), []);


  const activeNodeCount = activeNodes.size;
  const totalNodes = nodes.length;

  return (
    <div className="running-node-canvas">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={nodeTypes}
        attributionPosition="bottom-left"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        {/* Background removed to reduce ResizeObserver activity in dev */}
        {/* Controls and MiniMap removed to reduce ResizeObserver churn in dev */}
        <Panel position="top-left" className="running-canvas-info">
          <div className="status-panel">
            <div className="status-item">
              <span className="status-label">系统状态:</span>
              <Tag color={isRunning ? 'green' : 'default'}>
                {isRunning ? '运行中' : '已停止'}
              </Tag>
            </div>
            <div className="status-item">
              <span className="status-label">活跃节点:</span>
              <span className="status-value">{activeNodeCount} / {totalNodes}</span>
            </div>
            <div className="status-item">
              <span className="status-label">连接数量:</span>
              <span className="status-value">{edges.length}</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default RunningNodeCanvas;
