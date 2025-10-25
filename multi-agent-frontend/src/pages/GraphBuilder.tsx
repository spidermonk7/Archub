import React, { useState, useCallback } from 'react';
import { Layout, Button, message, Space, Modal, Typography, Tag, Descriptions } from 'antd';
import { PlusOutlined, LinkOutlined, PlayCircleOutlined, FolderOpenOutlined, CheckCircleOutlined, BuildOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NodeCanvas from '../components/NodeCanvas';
import NodeModal from '../components/NodeModal';
import EdgeModal from '../components/EdgeModal';
import { Node, Edge } from '../utils/types';
import { saveNodeConfig, saveEdgeConfig, compileGraph, loadFromLocalFile } from '../utils/api';
import './GraphBuilder.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const GraphBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isNodeModalVisible, setIsNodeModalVisible] = useState(false);
  const [isEdgeModalVisible, setIsEdgeModalVisible] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
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
      setIsNodeModalVisible(false);
      message.success('节点创建成功');
    } catch (error) {
      message.error('节点创建失败');
    }
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
      setIsEdgeModalVisible(false);
      message.success('边创建成功');
    } catch (error) {
      message.error('边创建失败');
    }
  }, [edges]);

  const handleCompileGraph = useCallback(async () => {
    if (nodes.length === 0) {
      message.warning('请先添加节点');
      return;
    }

    setIsCompiling(true);
    try {
      await compileGraph(nodes, edges);
      
      // 创建团队信息
      const teamInfo = {
        name: `multi-agent-graph-${Date.now()}`,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        compiledAt: new Date().toISOString(),
      };
      
      setCompiledTeamInfo(teamInfo);
      setIsSuccessModalVisible(true);
    } catch (error) {
      message.error('图编译失败');
    } finally {
      setIsCompiling(false);
    }
  }, [nodes, edges]);

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
              onClick={() => setIsNodeModalVisible(true)}
            >
              新建节点
            </Button>
            <Button
              icon={<LinkOutlined />}
              onClick={() => setIsEdgeModalVisible(true)}
              disabled={nodes.length < 2}
            >
              建立连接
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
        />
      </Content>

      <NodeModal
        visible={isNodeModalVisible}
        onCancel={() => setIsNodeModalVisible(false)}
        onSubmit={handleAddNode}
      />

      <EdgeModal
        visible={isEdgeModalVisible}
        onCancel={() => setIsEdgeModalVisible(false)}
        onSubmit={handleAddEdge}
        availableNodes={nodes}
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
    </Layout>
  );
};

export default GraphBuilder;