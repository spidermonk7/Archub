import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Steps, Button, Space, Card, Row, Col, Typography, Tag, Divider, Empty } from 'antd';
import { PlusOutlined, RobotOutlined, BuildOutlined, StarOutlined } from '@ant-design/icons';
import { Node } from '../utils/types';
import { AgentPoolItem, loadAgentPool, organizeAgentsByCategory } from '../utils/agentPool';
import NodeModal from './NodeModal'; // 原有的Agent创建逻辑

const { Title, Text, Paragraph } = Typography;

interface AddNodeModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (node: Omit<Node, 'id'>) => void;
}

type StepType = 'select-type' | 'select-agent' | 'create-custom';
type NodeTypeSelection = 'logic' | 'agent' | null;

const AddNodeModal: React.FC<AddNodeModalProps> = ({ visible, onCancel, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState<StepType>('select-type');
  const [selectedNodeType, setSelectedNodeType] = useState<NodeTypeSelection>(null);
  const [agentPool, setAgentPool] = useState<AgentPoolItem[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentPoolItem | null>(null);
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // 加载Agent Pool
  useEffect(() => {
    if (visible) {
      loadAgentPoolData();
    }
  }, [visible]);

  const loadAgentPoolData = async () => {
    try {
      setLoading(true);
      const agents = await loadAgentPool();
      setAgentPool(agents);
    } catch (error) {
      console.error('Failed to load agent pool:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    setCurrentStep('select-type');
    setSelectedNodeType(null);
    setSelectedAgent(null);
    setIsCustomModalVisible(false);
  }, []);

  const handleCancel = useCallback(() => {
    handleReset();
    onCancel();
  }, [handleReset, onCancel]);

  const handleTypeSelection = (type: NodeTypeSelection) => {
    setSelectedNodeType(type);
    if (type === 'agent') {
      setCurrentStep('select-agent');
    } else if (type === 'logic') {
      // Logic Node暂时留空，显示"即将推出"
      setCurrentStep('select-agent'); // 暂时跳转到agent选择
    }
  };

  const handleAgentSelection = (mode: 'pool' | 'custom') => {
    if (mode === 'custom') {
      setIsCustomModalVisible(true);
    } else {
      // Pool模式暂时不做任何操作，等待用户选择具体的Agent
    }
  };

  const handlePoolAgentSelect = (agent: AgentPoolItem) => {
    // 将选中的预定义Agent转换为Node格式并提交
    const node: Omit<Node, 'id'> = {
      name: agent.name,
      type: 'agent',
      description: agent.description,
      config: {
        ...agent.config,
        // 确保tools字段存在
        tools: agent.config.tools || []
      },
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
    };

    onSubmit(node);
    handleReset();
  };

  const handleCustomAgentSubmit = (node: Omit<Node, 'id'>) => {
    setIsCustomModalVisible(false);
    onSubmit(node);
    handleReset();
  };

  const getStepItems = () => [
    {
      title: '选择节点类型',
      description: '选择要创建的节点类型',
    },
    {
      title: '配置节点',
      description: selectedNodeType === 'agent' ? '选择或创建智能体' : '配置逻辑节点',
    },
  ];

  const agentCategories = organizeAgentsByCategory(agentPool);

  return (
    <>
      <Modal
        title={
          <Space>
            <PlusOutlined />
            Add Node
          </Space>
        }
        open={visible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>,
          currentStep === 'select-type' && (
            <Button key="back" disabled>
              上一步
            </Button>
          ),
          currentStep === 'select-agent' && (
            <Button key="back" onClick={() => setCurrentStep('select-type')}>
              上一步
            </Button>
          ),
        ]}
        width={800}
        destroyOnClose={true}
      >
        <div style={{ padding: '20px 0' }}>
          <Steps
            current={currentStep === 'select-type' ? 0 : 1}
            items={getStepItems()}
            style={{ marginBottom: 32 }}
          />

          {currentStep === 'select-type' && (
            <div>
              <Title level={4}>选择节点类型</Title>
              <Row gutter={[24, 24]} style={{ marginTop: 20 }}>
                <Col span={12}>
                  <Card
                    hoverable
                    className={`node-type-card ${selectedNodeType === 'logic' ? 'selected' : ''}`}
                    onClick={() => handleTypeSelection('logic')}
                    style={{
                      height: 200,
                      border: selectedNodeType === 'logic' ? '2px solid #1677ff' : '1px solid #d9d9d9',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <BuildOutlined style={{ fontSize: 48, color: '#722ed1', marginBottom: 16 }} />
                      <Title level={4} style={{ margin: 0, marginBottom: 8 }}>Logic Node</Title>
                      <Paragraph type="secondary">
                        逻辑处理节点，用于数据转换、条件判断和流程控制
                      </Paragraph>
                      <Tag color="purple">即将推出</Tag>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    hoverable
                    className={`node-type-card ${selectedNodeType === 'agent' ? 'selected' : ''}`}
                    onClick={() => handleTypeSelection('agent')}
                    style={{
                      height: 200,
                      border: selectedNodeType === 'agent' ? '2px solid #1677ff' : '1px solid #d9d9d9',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <RobotOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
                      <Title level={4} style={{ margin: 0, marginBottom: 8 }}>Agent Node</Title>
                      <Paragraph type="secondary">
                        AI智能体节点，具有推理能力和工具使用能力的处理单元
                      </Paragraph>
                      <Tag color="blue">可用</Tag>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {currentStep === 'select-agent' && selectedNodeType === 'agent' && (
            <div>
              <Title level={4}>Available Agent Pool</Title>
              <Paragraph type="secondary">
                选择预定义的智能体，或创建自定义智能体
              </Paragraph>

              {agentCategories.length > 0 ? (
                agentCategories.map((category, index) => (
                  <div key={category.name} style={{ marginBottom: index === agentCategories.length - 1 ? 16 : 24 }}>
                    <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                      <Text strong style={{ fontSize: '16px' }}>{category.name}</Text>
                    </Divider>
                    <Row gutter={[16, 16]}>
                      {category.agents.map(agent => (
                        <Col span={12} key={agent.id}>
                          <Card
                            hoverable
                            size="small"
                            style={{ 
                              height: 140,
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            onClick={() => handlePoolAgentSelect(agent)}
                            bodyStyle={{ padding: '12px 16px' }}
                          >
                            <div>
                              <Title level={5} style={{ marginBottom: 8, fontSize: '14px' }}>
                                {agent.name}
                              </Title>
                              <Paragraph 
                                style={{ 
                                  fontSize: 12, 
                                  color: '#666', 
                                  marginBottom: 12,
                                  height: 36,
                                  overflow: 'hidden',
                                  lineHeight: '18px'
                                }}
                              >
                                {agent.description.length > 65 
                                  ? `${agent.description.substring(0, 65)}...` 
                                  : agent.description}
                              </Paragraph>
                              <div>
                                <Tag color="blue" style={{ fontSize: '11px', padding: '1px 6px', marginBottom: '4px' }}>
                                  {agent.config.llmModel}
                                </Tag>
                                {agent.tags.slice(0, 2).map(tag => (
                                  <Tag key={tag} style={{ fontSize: '11px', padding: '1px 6px', marginBottom: '4px' }}>
                                    {tag}
                                  </Tag>
                                ))}
                                {agent.tags.length > 2 && (
                                  <Tag style={{ fontSize: '11px', padding: '1px 6px', marginBottom: '4px' }}>
                                    +{agent.tags.length - 2}
                                  </Tag>
                                )}
                              </div>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))
              ) : (
                <Empty description="暂无可用的智能体" />
              )}

              <Divider orientation="left" style={{ margin: '24px 0 12px 0' }}>
                <Text strong style={{ fontSize: '16px' }}>自定义选项</Text>
              </Divider>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card
                    hoverable
                    style={{ 
                      height: 140,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => handleAgentSelection('custom')}
                    bodyStyle={{ padding: '12px 16px' }}
                  >
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <PlusOutlined style={{ fontSize: 28, color: '#1677ff', marginBottom: 12 }} />
                      <Title level={5} style={{ margin: 0, marginBottom: 8, fontSize: '14px' }}>Define New Agent</Title>
                      <Text type="secondary" style={{ fontSize: '12px' }}>创建自定义智能体节点</Text>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {currentStep === 'select-agent' && selectedNodeType === 'logic' && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <BuildOutlined style={{ fontSize: 64, color: '#ccc', marginBottom: 20 }} />
              <Title level={4} type="secondary">Logic Node</Title>
              <Paragraph type="secondary">
                逻辑节点功能正在开发中，敬请期待...
              </Paragraph>
            </div>
          )}
        </div>
      </Modal>

      {/* 自定义Agent创建Modal */}
      <NodeModal
        visible={isCustomModalVisible}
        onCancel={() => setIsCustomModalVisible(false)}
        onSubmit={handleCustomAgentSubmit}
      />
    </>
  );
};

export default AddNodeModal;