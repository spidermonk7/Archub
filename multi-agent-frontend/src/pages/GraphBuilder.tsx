import React, { useState, useCallback } from 'react';
import { Layout, Button, message, Space, Modal, Typography, Tag, Descriptions } from 'antd';
import { PlusOutlined, LinkOutlined, PlayCircleOutlined, FolderOpenOutlined, CheckCircleOutlined, BuildOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NodeCanvas from '../components/NodeCanvas';
import AddNodeModal from '../components/AddNodeModal';
import EdgeCreationSidebar from '../components/EdgeCreationSidebar';
import TeamNamingModal from '../components/TeamNamingModal';
import { Node, Edge } from '../utils/types';
import { validateGraph, formatValidationErrors } from '../utils/graphValidation';
import { saveNodeConfig, saveEdgeConfig, compileAndSaveGraph, loadFromLocalFile } from '../utils/api';
import './GraphBuilder.css';

const { Header, Content } = Layout;
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
    }
    // 普通模式下暂时不需要特殊处理，让React Flow的默认选择逻辑处理
  }, [isEdgeCreationMode, handleEdgeCreationNodeClick]);

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
  }, [nodes, edges]);

  const proceedWithCompilation = async (name: string, description: string) => {
    // 验证通过，开始编译和保存
    await compileAndSaveGraph(nodes, edges, name, description);
    
    // 创建团队信息用于显示成功对话框
    const teamInfo = {
      name: name,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      compiledAt: new Date().toISOString()
    };
    
    setCompiledTeamInfo(teamInfo);
    setIsSuccessModalVisible(true);
    message.success(`团队 "${name}" 创建成功！`);
  };

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

  return (
    <Layout className="graph-builder">
      <Header className="header">
        <div className="header-content">
          <h1>Multi-Agent System Builder</h1>
          <Space>
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
              {isEdgeCreationMode ? '选择节点创建连接' : '建立连接'}
            </Button>
            <Button
              icon={<FolderOpenOutlined />}
              onClick={handleLoadGraph}
            >
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
      </Header>
      <Content className="content">
        <NodeCanvas
          nodes={nodes}
          edges={edges}
          selectedNodes={selectedNodes}
          onNodesSelect={setSelectedNodes}
          onNodePositionChange={handleNodePositionChange}
          isCreatingEdge={isEdgeCreationMode}
          edgeCreationSource={edgeCreationSource}
          edgeCreationTarget={edgeCreationTarget}
          onNodeClick={handleNodeClick}
          mousePosition={mousePosition}
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

      {/* 编译成功对话框 */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
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
          <div style={{ padding: '20px 0' }}>
            <Descriptions 
              title="团队信息" 
              bordered 
              column={1}
              labelStyle={{ width: '120px' }}
            >
              <Descriptions.Item label="团队名称">
                <Text strong>{compiledTeamInfo.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="节点数量">
                <Tag color="blue">{compiledTeamInfo.nodeCount} 个智能体</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="连接数量">
                <Tag color="green">{compiledTeamInfo.edgeCount} 个连接</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDate(compiledTeamInfo.compiledAt)}
              </Descriptions.Item>
            </Descriptions>
            
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Title level={4}>选择下一步操作</Title>
                <Space size="large" style={{ marginTop: '16px' }}>
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