import React, { useMemo } from 'react';
import {
  ReactFlow,
  Node as FlowNode,
  Edge as FlowEdge,
  useNodesState,
  useEdgesState,
  Panel,
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
}

const RunningCustomNode: React.FC<any> = ({ data, selected }) => {
  const isActive = data.isActive;
  const isRunning = data.isRunning;
  const state: 'waiting' | 'processing' | 'done' | undefined = data.state;

  const badge = (() => {
    if (state === 'processing') return { text: '处理中', color: 'orange' as const };
    if (state === 'done') return { text: '完成', color: 'green' as const };
    if (state === 'waiting') return { text: '等待中', color: 'blue' as const };
    return { text: '', color: 'default' as const };
  })();

  return (
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
          border: state === 'done' ? '2px solid #52c41a' : state === 'processing' ? '2px solid #fa8c16' : state === 'waiting' ? '2px solid #1677ff' : '1px solid #d9d9d9',
          boxShadow: state === 'processing' 
            ? '0 0 12px rgba(250, 140, 22, 0.45)'
            : state === 'done' 
              ? '0 0 10px rgba(82, 196, 26, 0.35)'
              : '0 2px 8px rgba(0,0,0,0.1)',
          backgroundColor: state === 'done' ? '#f6ffed' : state === 'processing' ? '#fff7e6' : state === 'waiting' ? '#e6f4ff' : '#ffffff',
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
  );
};

const getNodeTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    agent: 'blue',
    tool: 'green',
    coordinator: 'purple',
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
}) => {
  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      agent: '智能体',
      tool: '工具',
      coordinator: '协调器',
      input: '输入',
      output: '输出',
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
        isActive: activeNodes.has(node.id),
        state: nodeStates[node.id] as NodeState,
        isRunning,
      },
    }));
  }, [nodes, activeNodes, isRunning, nodeStates]);

  const flowEdges = useMemo(() => {
    return edges.map((edge): FlowEdge => {
      const sourceActive = activeNodes.has(edge.source);
      const targetActive = activeNodes.has(edge.target);
      const isEdgeActive = sourceActive || targetActive;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: isEdgeActive && isRunning,
        style: {
          stroke: isEdgeActive 
            ? (edge.type === 'hard' ? '#52c41a' : '#faad14')
            : (edge.type === 'hard' ? '#1677ff' : '#52c41a'),
          strokeWidth: isEdgeActive ? 3 : 2,
          opacity: isEdgeActive ? 1 : 0.6,
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
  }, [edges, activeNodes, isRunning]);

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
