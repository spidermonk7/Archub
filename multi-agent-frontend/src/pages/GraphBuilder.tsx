import React, { useState, useCallback, useMemo } from 'react';
import { Layout, Button, message, Space, Modal, Typography, Tag, Descriptions } from 'antd';
import { PlusOutlined, LinkOutlined, PlayCircleOutlined, FolderOpenOutlined, CheckCircleOutlined, BuildOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NodeCanvas from '../components/NodeCanvas';
import AddNodeModal from '../components/AddNodeModal';
import EdgeCreationSidebar from '../components/EdgeCreationSidebar';
import TeamNamingModal from '../components/TeamNamingModal';
import ComponentAttachPanel from '../components/ComponentAttachPanel';
import NodeEdgeInspector from '../components/NodeEdgeInspector';
import { Node, Edge } from '../utils/types';
import { validateGraph, formatValidationErrors } from '../utils/graphValidation';
import { saveNodeConfig, saveEdgeConfig, compileAndSaveGraph, loadFromLocalFile } from '../utils/api';
import './GraphBuilder.css';

const { Content } = Layout;
const { Title, Text } = Typography;

const GraphBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isAddNodeModalVisible, setIsAddNodeModalVisible] = useState(false);
  const [isEdgeCreationMode, setIsEdgeCreationMode] = useState(false);
  const [edgeCreationSource, setEdgeCreationSource] = useState<string | undefined>();
  const [edgeCreationTarget, setEdgeCreationTarget] = useState<string | undefined>();
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | undefined>();
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isNamingModalVisible, setIsNamingModalVisible] = useState(false);
  const [isAttachPanelVisible, setIsAttachPanelVisible] = useState(false);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<'node' | 'edge'>('node');
  const [validationErrorModal, setValidationErrorModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
  }>({ visible: false, title: '', content: '' });
  const [validationWarningModal, setValidationWarningModal] = useState<{
    visible: boolean;
    content: string;
    onConfirm: () => void;
  }>({ visible: false, content: '', onConfirm: () => {} });
  const [compiledTeamInfo, setCompiledTeamInfo] = useState<{
    name: string;
    nodeCount: number;
    edgeCount: number;
    compiledAt: string;
  } | null>(null);

  // 组件挂载时创建默认的输入和输出节点
  React.useEffect(() => {
    createDefaultNodes();
  }, []);

  const createDefaultNodes = () => {
    const inputNode: Node = {
      id: 'input-node',
      name: '用户输入',
      type: 'input',
      description: '接收用户输入的入口节点',
      config: {
        inputType: 'text',
        placeholder: '请输入您的需求...',
        validation: '',
      },
      position: { x: 100, y: 200 },
    };

    const outputNode: Node = {
      id: 'output-node',
      name: '结果输出',
      type: 'output',
      description: '向用户返回结果的出口节点',
      config: {
        outputFormat: 'text',
        template: '',
        successMessage: '处理完成',
      },
      position: { x: 600, y: 200 },
    };

    setNodes([inputNode, outputNode]);
  };

  const handleAddNode = useCallback(async (nodeConfig: Omit<Node, 'id'>) => {
    const newNode: Node = {
      ...nodeConfig,
      id: `node_${Date.now()}`,
    };

    try {
      await saveNodeConfig(newNode);
      setNodes(prev => [...prev, newNode]);
      setIsAddNodeModalVisible(false);
      message.success('节点创建成功');
    } catch (error) {
      message.error('节点创建失败');
    }
  }, []);

  // Handle component drop onto a node
  const handleComponentDrop = useCallback((nodeId: string, component: { type: 'memory' | 'tool'; key: string; payload?: any }) => {
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId) return node;
      const next = { ...node, config: { ...(node.config || {}) } } as Node;
      if (component.type === 'memory') {
        // Only implement simple memory for now
        if (component.key === 'simple') {
          next.config.memory = { type: 'simple' };
          message.success(`已为节点 “${node.name}” 添加 Simple Memory`);
        } else {
          message.info('该内存类型即将推出');
        }
      } else if (component.type === 'tool') {
        if (component.key === 'custom_tool') {
          message.info('自定义工具即将推出');
        } else {
          const tools: string[] = Array.isArray(next.config.tools) ? [...next.config.tools] : [];
          if (!tools.includes(component.key)) {
            tools.push(component.key);
            next.config.tools = tools;
            message.success(`已为节点 “${node.name}” 添加工具: ${component.key}`);
          } else {
            message.warning(`节点 “${node.name}” 已包含工具: ${component.key}`);
          }
        }
      }
      return next;
    }));
  }, []);

  const handleEdgeCreationNodeClick = useCallback((nodeId: string) => {
    if (!edgeCreationSource) {
      // 第一次点击，设置源节点
      setEdgeCreationSource(nodeId);
    } else if (edgeCreationSource === nodeId) {
      // 重复点击源节点，取消选择
      setEdgeCreationSource(undefined);
      setEdgeCreationTarget(undefined);
    } else if (!edgeCreationTarget) {
      // 第二次点击不同节点，设置目标节点
      if (nodeId !== edgeCreationSource) {
        setEdgeCreationTarget(nodeId);
      }
    } else if (edgeCreationTarget === nodeId) {
      // 重复点击目标节点，取消目标选择
      setEdgeCreationTarget(undefined);
    } else {
      // 点击其他节点，重新设置目标
      setEdgeCreationTarget(nodeId);
    }
  }, [edgeCreationSource, edgeCreationTarget]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (isEdgeCreationMode) {
      // Edge创建模式下的节点点击
      handleEdgeCreationNodeClick(nodeId);
      return;
    }
    // 打开节点信息编辑
    setSelectedNodes([nodeId]);
    setInspectorMode('node');
    setInspectorOpen(true);
  }, [isEdgeCreationMode, handleEdgeCreationNodeClick]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    setSelectedEdgeIds([edgeId]);
    setInspectorMode('edge');
    setInspectorOpen(true);
  }, []);

  const handleEdgeCreationNodeDeselect = useCallback((role: 'source' | 'target') => {
    if (role === 'source') {
      setEdgeCreationSource(undefined);
      setEdgeCreationTarget(undefined);
    } else {
      setEdgeCreationTarget(undefined);
    }
  }, []);

  const handleStartEdgeCreation = useCallback(() => {
    setIsEdgeCreationMode(true);
    setEdgeCreationSource(undefined);
    setEdgeCreationTarget(undefined);
    setMousePosition(undefined);
  }, []);

  const handleStopEdgeCreation = useCallback(() => {
    setIsEdgeCreationMode(false);
    setEdgeCreationSource(undefined);
    setEdgeCreationTarget(undefined);
    setMousePosition(undefined);
  }, []);

  const handleAddEdge = useCallback(async (edgeConfig: Omit<Edge, 'id'>) => {
    // 检查是否已存在相同的边
    const existingEdge = edges.find(
      edge => edge.source === edgeConfig.source && edge.target === edgeConfig.target
    );

    if (existingEdge) {
      message.warning('该边已存在');
      return;
    }

    const newEdge: Edge = {
      ...edgeConfig,
      id: `edge_${Date.now()}`,
    };

    try {
      await saveEdgeConfig(newEdge);
      setEdges(prev => [...prev, newEdge]);
      message.success('边创建成功');
      handleStopEdgeCreation();
    } catch (error) {
      message.error('边创建失败');
    }
  }, [edges, handleStopEdgeCreation]);

  const handleCompileGraph = useCallback(async () => {
    if (nodes.length === 0) {
      message.warning('请先添加节点');
      return;
    }

    // 直接弹出命名对话框，不进行编译
    setIsNamingModalVisible(true);
  }, [nodes]);

  const proceedWithCompilation = useCallback(async (name: string, description: string) => {
    await compileAndSaveGraph(nodes, edges, name, description);

    const teamInfo = {
      name,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      compiledAt: new Date().toISOString(),
    };

    setCompiledTeamInfo(teamInfo);
    setIsSuccessModalVisible(true);
    message.success(`团队 "${name}" 创建成功！`);
  }, [nodes, edges]);

  const handleTeamNaming = useCallback(async (name: string, description: string) => {
    setIsCompiling(true);
    setIsNamingModalVisible(false);
    
    try {
      // 首先验证图形结构
      const validationResult = validateGraph(nodes, edges);
      
      if (!validationResult.isValid) {
        // 验证失败，显示错误信息
        const errorMessage = formatValidationErrors(validationResult);
        
        setValidationErrorModal({
          visible: true,
          title: '图形验证失败',
          content: errorMessage + '\n\n请修正图形结构后重新尝试编译。'
        });
        return;
      }
      
      // 如果有警告，显示警告信息但允许继续
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        const warningMessage = validationResult.warnings.join('\n');
        
        // 显示警告Modal并等待用户确认
        setValidationWarningModal({
          visible: true,
          content: warningMessage + '\n\n是否继续编译？',
          onConfirm: async () => {
            setValidationWarningModal({ visible: false, content: '', onConfirm: () => {} });
            await proceedWithCompilation(name, description);
          }
        });
        return;
      }
      
      await proceedWithCompilation(name, description);
      
    } catch (error) {
      console.error('编译过程中出错:', error);
      message.error('编译和保存团队失败');
    } finally {
      setIsCompiling(false);
    }
  }, [nodes, edges, proceedWithCompilation]);

  const handleLoadGraph = useCallback(async () => {
    try {
      const config = await loadFromLocalFile();
      
      // 检查是否已经有输入和输出节点
      const hasInputNode = config.nodes.some(node => node.type === 'input');
      const hasOutputNode = config.nodes.some(node => node.type === 'output');
      
      let nodesToSet = [...config.nodes];
      
      // 如果没有输入节点，添加默认输入节点
      if (!hasInputNode) {
        const inputNode: Node = {
          id: 'input-node',
          name: '用户输入',
          type: 'input',
          description: '接收用户输入的入口节点',
          config: {
            inputType: 'text',
            placeholder: '请输入您的需求...',
            validation: '',
          },
          position: { x: 100, y: 200 },
        };
        nodesToSet.unshift(inputNode);
      }
      
      // 如果没有输出节点，添加默认输出节点
      if (!hasOutputNode) {
        const outputNode: Node = {
          id: 'output-node',
          name: '结果输出',
          type: 'output',
          description: '向用户返回结果的出口节点',
          config: {
            outputFormat: 'text',
            template: '',
            successMessage: '处理完成',
          },
          position: { x: 600, y: 200 },
        };
        nodesToSet.push(outputNode);
      }
      
      setNodes(nodesToSet);
      setEdges(config.edges);
      message.success(`图配置加载成功！包含 ${nodesToSet.length} 个节点和 ${config.edges.length} 个连接`);
    } catch (error) {
      if (error instanceof Error && error.message !== 'No file selected') {
        message.error('图配置加载失败: ' + error.message);
      }
    }
  }, []);

  const handleKeepBuilding = () => {
    setIsSuccessModalVisible(false);
    message.success('继续构建你的团队！');
  };

  const handleGoRunning = () => {
    setIsSuccessModalVisible(false);
    navigate('/team-pool');
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-CN');
  };

  const handleNodePositionChange = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, position } : node
    ));
  }, []);

  const nodesForCanvas = useMemo(() => nodes.map(n => ({ ...(n as any), onComponentDrop: handleComponentDrop })), [nodes, handleComponentDrop]);

  return (
    <Layout className="graph-builder">
      <div className="builder-toolbar glass">
        <div className="builder-toolbar__info">
          <Title level={3}>Multi-Agent System Builder</Title>
          <div className="builder-toolbar__meta">
            <Text type="secondary">拖拽节点与连线，快速搭建你的智能体工作流。</Text>
            {isEdgeCreationMode && (
              <Tag color="purple" bordered={false} className="builder-toolbar__mode">
                连接模式：请选择目标节点
              </Tag>
            )}
          </div>
        </div>
        <Space wrap size="middle" className="builder-toolbar__actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddNodeModalVisible(true)}
          >
            新建节点
          </Button>
          <Button
            icon={<LinkOutlined />}
            onClick={handleStartEdgeCreation}
            disabled={nodes.length < 2 || isEdgeCreationMode}
          >
            建立连接
          </Button>
          {isEdgeCreationMode && (
            <Button onClick={handleStopEdgeCreation}>取消连接</Button>
          )}
          <Button onClick={() => setIsAttachPanelVisible(true)}>组件挂载</Button>
          <Button icon={<FolderOpenOutlined />} onClick={handleLoadGraph}>
            加载配置
          </Button>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={handleCompileGraph}
            loading={isCompiling}
            disabled={nodes.length === 0}
          >
            编译图
          </Button>
        </Space>
      </div>
      <Content className="builder-canvas glass-soft">
        <NodeCanvas
          nodes={nodesForCanvas as any}
          edges={edges}
          selectedNodes={selectedNodes}
          onNodesSelect={setSelectedNodes}
          onEdgesSelect={setSelectedEdgeIds}
          onNodePositionChange={handleNodePositionChange}
          isCreatingEdge={isEdgeCreationMode}
          edgeCreationSource={edgeCreationSource}
          edgeCreationTarget={edgeCreationTarget}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          mousePosition={mousePosition}
          onComponentDrop={handleComponentDrop}
        />
      </Content>

      <AddNodeModal
        visible={isAddNodeModalVisible}
        onCancel={() => setIsAddNodeModalVisible(false)}
        onSubmit={handleAddNode}
      />

      {/* 新的Edge创建侧边栏 */}
      <EdgeCreationSidebar
        visible={isEdgeCreationMode}
        onClose={handleStopEdgeCreation}
        onSubmit={handleAddEdge}
        availableNodes={nodes}
        selectedSource={edgeCreationSource}
        selectedTarget={edgeCreationTarget}
        onNodeSelect={handleEdgeCreationNodeClick}
        onNodeDeselect={handleEdgeCreationNodeDeselect}
      />

      <ComponentAttachPanel
        visible={isAttachPanelVisible}
        onClose={() => setIsAttachPanelVisible(false)}
      />

      <NodeEdgeInspector
        open={inspectorOpen}
        mode={inspectorMode}
        node={inspectorMode === 'node' ? nodes.find(n => n.id === selectedNodes[0]) : undefined}
        edge={inspectorMode === 'edge' ? edges.find(e => e.id === selectedEdgeIds[0]) : undefined}
        allNodes={nodes}
        onClose={() => setInspectorOpen(false)}
        onSaveNode={(updated) => {
          setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
          setInspectorOpen(false);
          message.success('节点已保存');
        }}
        onDeleteNode={(nodeId) => {
          setNodes(prev => prev.filter(n => n.id !== nodeId));
          setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
          setSelectedNodes([]);
          setInspectorOpen(false);
          message.success('节点已删除');
        }}
        onSaveEdge={(updated) => {
          setEdges(prev => prev.map(e => e.id === updated.id ? updated : e));
          setInspectorOpen(false);
          message.success('连接已保存');
        }}
        onDeleteEdge={(edgeId) => {
          setEdges(prev => prev.filter(e => e.id !== edgeId));
          setSelectedEdgeIds([]);
          setInspectorOpen(false);
          message.success('连接已删除');
        }}
      />

      {/* 编译成功对话框 */}
      <Modal
        className="compile-success-modal"
        title={
          <Space align="center" size="middle">
            <CheckCircleOutlined className="compile-success-icon" />
            团队创建成功！
          </Space>
        }
        open={isSuccessModalVisible}
        onCancel={() => setIsSuccessModalVisible(false)}
        footer={null}
        width={600}
        centered
      >
        {compiledTeamInfo && (
          <div className="compile-success-body">
            <Descriptions
              title="Team Overview"
              bordered
              column={1}
              labelStyle={{ width: '120px' }}
              className="compile-summary"
            >
              <Descriptions.Item label="Team Name">
                <Text strong>{compiledTeamInfo.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Nodes">
                <Tag color="blue">{compiledTeamInfo.nodeCount} nodes</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Edges">
                <Tag color="green">{compiledTeamInfo.edgeCount} edges</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Compiled at">
                {formatDate(compiledTeamInfo.compiledAt)}
              </Descriptions.Item>
            </Descriptions>

            <div className="compile-actions">
              <Title level={4}>Choose what to do next</Title>
              <Text type="secondary">
                Your team is now available in Team Pool. Continue iterating or jump into Python Runner to execute it.
              </Text>
              <Space size="large" className="compile-actions__buttons">
                <Button
                  icon={<BuildOutlined />}
                  onClick={handleKeepBuilding}
                  size="large"
                >
                  Keep Building More
                </Button>
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  onClick={handleGoRunning}
                  size="large"
                >
                  Go to Team Pool
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>
      
      {/* 验证错误Modal */}
      <Modal
        title={validationErrorModal.title}
        open={validationErrorModal.visible}
        onOk={() => setValidationErrorModal({ visible: false, title: '', content: '' })}
        onCancel={() => setValidationErrorModal({ visible: false, title: '', content: '' })}
        width={500}
        okText="知道了"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <div style={{ whiteSpace: 'pre-line' }}>
          {validationErrorModal.content}
        </div>
      </Modal>

      {/* 验证警告Modal */}
      <Modal
        title="图形验证警告"
        open={validationWarningModal.visible}
        onOk={validationWarningModal.onConfirm}
        onCancel={() => setValidationWarningModal({ visible: false, content: '', onConfirm: () => {} })}
        width={500}
        okText="继续编译"
        cancelText="取消"
      >
        <div style={{ whiteSpace: 'pre-line' }}>
          {validationWarningModal.content}
        </div>
      </Modal>

      <TeamNamingModal
          visible={isNamingModalVisible}
          onCancel={() => setIsNamingModalVisible(false)}
          onConfirm={handleTeamNaming}
          nodeCount={compiledTeamInfo?.nodeCount || 0}
          edgeCount={compiledTeamInfo?.edgeCount || 0}
        />
    </Layout>
  );
};

export default GraphBuilder;
