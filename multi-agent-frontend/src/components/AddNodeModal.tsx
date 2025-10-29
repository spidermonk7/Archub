import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Steps, Button, Space, Card, Row, Col, Typography, Tag, Divider, Empty } from 'antd';
import { PlusOutlined, RobotOutlined, BuildOutlined } from '@ant-design/icons';
import { Node } from '../utils/types';
import { AgentPoolItem, loadAgentPool, organizeAgentsByCategory } from '../utils/agentPool';
import NodeModal from './NodeModal';  // original agent creation flow
import './AddNodeModal.css';

const { Title, Text, Paragraph } = Typography;

const LOGIC_NODE_PRESETS = [
  {
    key: 'go-through',
    name: 'Go Through',
    description: 'Pass messages onward unchanged to the next node.',
    details: 'Use this to mirror residual connections or inspect message payloads without modifying them.',
  },
];

interface AddNodeModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (node: Omit<Node, 'id'>) => void;
}

type StepType = 'select-type' | 'select-agent' | 'select-logic' | 'create-custom';
type NodeTypeSelection = 'logic' | 'agent' | null;

const AddNodeModal: React.FC<AddNodeModalProps> = ({ visible, onCancel, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState<StepType>('select-type');
  const [selectedNodeType, setSelectedNodeType] = useState<NodeTypeSelection>(null);
  const [agentPool, setAgentPool] = useState<AgentPoolItem[]>([]);
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const [, setLoading] = useState(false);

  // Load available agents whenever the modal is opened
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
      setCurrentStep('select-logic');
    }
  };

  const handleAgentSelection = (mode: 'pool' | 'custom') => {
    if (mode === 'custom') {
      setIsCustomModalVisible(true);
    }
  };

  const handlePoolAgentSelect = (agent: AgentPoolItem) => {
    const node: Omit<Node, 'id'> = {
      name: agent.name,
      type: 'agent',
      description: agent.description,
      config: {
        ...agent.config,
        tools: agent.config.tools || [],
      },
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
    };

    onSubmit(node);
    handleReset();
  };

  const handleLogicNodeSelect = (preset: typeof LOGIC_NODE_PRESETS[number]) => {
    const node: Omit<Node, 'id'> = {
      name: preset.name,
      type: 'logic',
      description: preset.description,
      config: {
        logicType: preset.key,
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
      title: 'Select node type',
      description: 'Choose the type of node you want to create',
    },
    {
      title: selectedNodeType === 'logic' ? 'Choose logic behaviour' : 'Configure node',
      description:
        selectedNodeType === 'agent'
          ? 'Pick or build an agent'
          : selectedNodeType === 'logic'
          ? 'Pick a logic node to drop into the graph'
          : 'Configure node options',
    },
  ];

  const agentCategories = organizeAgentsByCategory(agentPool);

  return (
    <>
      <Modal
        className="add-node-modal"
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
            Cancel
          </Button>,
          currentStep !== 'select-type' && (
            <Button key="back" onClick={() => setCurrentStep('select-type')}>
              Back
            </Button>
          ),
        ]}
        width={800}
        destroyOnClose
      >
        <div className="add-node-modal-body">
          <Steps
            current={currentStep === 'select-type' ? 0 : 1}
            className="add-node-steps"
            items={getStepItems()}
          />

          {currentStep === 'select-type' && (
            <div className="node-type-section">
              <Title level={4}>Choose node type</Title>
              <Row gutter={[24, 24]} className="node-type-grid">
                <Col span={12}>
                  <Card
                    hoverable
                    className={`node-type-card ${selectedNodeType === 'logic' ? 'selected' : ''}`}
                    onClick={() => handleTypeSelection('logic')}
                  >
                    <div className="node-type-card__inner">
                      <BuildOutlined className="node-type-card__icon logic" />
                      <Title level={4}>Logic Node</Title>
                      <Paragraph type="secondary">
                        Orchestrate data transformations, conditional flows, and control logic.
                      </Paragraph>
                      <Tag color="purple">Available</Tag>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    hoverable
                    className={`node-type-card ${selectedNodeType === 'agent' ? 'selected' : ''}`}
                    onClick={() => handleTypeSelection('agent')}
                  >
                    <div className="node-type-card__inner">
                      <RobotOutlined className="node-type-card__icon agent" />
                      <Title level={4}>Agent Node</Title>
                      <Paragraph type="secondary">
                        AI-driven node with reasoning skills and tool execution capabilities.
                      </Paragraph>
                      <Tag color="blue">Available</Tag>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {currentStep === 'select-agent' && selectedNodeType === 'agent' && (
            <div className="agent-pool-section">
              <Title level={4}>Available agents</Title>
              <Paragraph type="secondary">
                Choose a predefined agent or create a custom one.
              </Paragraph>

              {agentCategories.length > 0 ? (
                agentCategories.map(category => (
                  <div key={category.name} className="agent-category-card">
                    <Divider orientation="left" className="agent-category-divider">
                      <Text strong>{category.name}</Text>
                    </Divider>
                    <Row gutter={[18, 18]}>
                      {category.agents.map(agent => (
                        <Col span={12} key={agent.id}>
                          <Card
                            hoverable
                            size="small"
                            className="pool-agent-card"
                            onClick={() => handlePoolAgentSelect(agent)}
                          >
                            <div className="pool-agent-card__body">
                              <Title level={5}>{agent.name}</Title>
                              <Paragraph>
                                {agent.description.length > 65
                                  ? `${agent.description.substring(0, 65)}...`
                                  : agent.description}
                              </Paragraph>
                              <div className="pool-agent-card__meta">
                                <Tag color="blue" className="pool-agent-card__model">
                                  {agent.config.llmModel}
                                </Tag>
                                <div className="pool-agent-card__tags">
                                  {agent.tags.slice(0, 2).map(tag => (
                                    <Tag key={tag}>{tag}</Tag>
                                  ))}
                                  {agent.tags.length > 2 && (
                                    <Tag className="tag-more">+{agent.tags.length - 2}</Tag>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))
              ) : (
                <Empty description="No agents available" />
              )}

              <Divider orientation="left" className="agent-category-divider custom">
                <Text strong>Custom options</Text>
              </Divider>
              <Row gutter={[18, 18]}>
                <Col span={12}>
                  <Card
                    hoverable
                    className="custom-agent-card"
                    onClick={() => handleAgentSelection('custom')}
                  >
                    <div className="custom-agent-card__inner">
                      <PlusOutlined className="custom-agent-card__icon" />
                      <Title level={5}>Define new agent</Title>
                      <Text type="secondary">Create a tailor-made agent node.</Text>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {currentStep === 'select-logic' && selectedNodeType === 'logic' && (
            <div className="logic-node-section">
              <Title level={4}>Available logic nodes</Title>
              <Paragraph type="secondary">
                Drop-in logic components that forward or transform messages without invoking an LLM.
              </Paragraph>
              <Row gutter={[18, 18]}>
                {LOGIC_NODE_PRESETS.map((preset) => (
                  <Col span={12} key={preset.key}>
                    <Card
                      hoverable
                      className="logic-node-card"
                      onClick={() => handleLogicNodeSelect(preset)}
                    >
                      <div className="logic-node-card__inner">
                        <BuildOutlined className="logic-node-card__icon" />
                        <div className="logic-node-card__content">
                          <Title level={5}>{preset.name}</Title>
                          <Paragraph type="secondary">{preset.description}</Paragraph>
                          <Paragraph type="secondary" className="logic-node-card__details">
                            {preset.details}
                          </Paragraph>
                        </div>
                        <Tag color="purple" bordered={false}>Tap to add</Tag>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>
      </Modal>

      <NodeModal
        visible={isCustomModalVisible}
        onCancel={() => setIsCustomModalVisible(false)}
        onSubmit={handleCustomAgentSubmit}
      />
    </>
  );
};

export default AddNodeModal;
