import React, { useState } from 'react';
import { Drawer, Form, Radio, Input, Button, Space, Typography, Tag, InputNumber } from 'antd';
import { LinkOutlined, CloseOutlined, CheckOutlined, AimOutlined } from '@ant-design/icons';
import { Node, Edge } from '../utils/types';
import './EdgeCreationSidebar.css';

const { TextArea } = Input;
const { Text, Title } = Typography;
interface EdgeCreationSidebarProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (edge: Omit<Edge, 'id'>) => void;
  availableNodes: Node[];
  selectedSource?: string;
  selectedTarget?: string;
  onNodeSelect: (nodeId: string, role: 'source' | 'target') => void;
  onNodeDeselect: (role: 'source' | 'target') => void;
}

const EdgeCreationSidebar: React.FC<EdgeCreationSidebarProps> = ({
  visible,
  onClose,
  onSubmit,
  availableNodes,
  selectedSource,
  selectedTarget,
  onNodeSelect, // reserved for future use when the sidebar can trigger selections
  onNodeDeselect,
}) => {
  const [form] = Form.useForm();
  const [edgeType, setEdgeType] = useState<'hard' | 'soft'>('hard');
  const [loading, setLoading] = useState(false);

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      input: 'Input',
      output: 'Output',
      agent: 'Agent',
    };
    return labels[type] || type;
  };

  const handleSubmit = async () => {
    if (!selectedSource || !selectedTarget) {
      return;
    }

    try {
      setLoading(true);
      const values = await form.validateFields();

      const edge: Omit<Edge, 'id'> = {
        source: selectedSource,
        target: selectedTarget,
        type: values.type,
        delay: typeof values.delay === 'number' ? values.delay : 0,
        config: {
          description: values.description || '',
          condition: values.condition || '',
        },
      };

      onSubmit(edge);
      handleClose();
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setEdgeType('hard');
    onNodeDeselect('source');
    onNodeDeselect('target');
    onClose();
  };

  const handleEdgeTypeChange = (event: any) => {
    setEdgeType(event.target.value);
  };

  const getSourceNode = () => availableNodes.find(node => node.id === selectedSource);
  const getTargetNode = () => availableNodes.find(node => node.id === selectedTarget);

  const canProceed = Boolean(selectedSource && selectedTarget);

  const stepIndicators = [
    {
      key: 'source',
      label: 'Select source node',
      description: selectedSource ? getSourceNode()?.name || '' : 'Click a node on the canvas to start the flow.',
      done: Boolean(selectedSource),
    },
    {
      key: 'target',
      label: 'Select target node',
      description: selectedTarget ? getTargetNode()?.name || '' : 'Choose another node to receive the output.',
      done: Boolean(selectedTarget),
    },
    {
      key: 'configure',
      label: 'Configure connection',
      description: canProceed ? 'Complete the form below.' : 'Finish selecting both nodes to continue.',
      done: canProceed,
    },
  ];

  const renderNodeCard = (
    title: string,
    node: Node | undefined,
    role: 'source' | 'target',
    placeholder: string,
  ) => (
    <div className={`edge-node-card glass-panel ${node ? 'filled' : ''}`}>
      <div className="edge-node-card__header">
        <span>{title}</span>
        {node && (
          <Button type="link" size="small" onClick={() => onNodeDeselect(role)}>
            Clear
          </Button>
        )}
      </div>
      {node ? (
        <div className="edge-node-card__body">
          <div className="edge-node-card__badge">
            <AimOutlined />
          </div>
          <div className="edge-node-card__meta">
            <Text strong>{node.name}</Text>
            <Text type="secondary">{getTypeLabel(node.type)}</Text>
          </div>
          <Tag bordered={false} color="blue" className="edge-node-card__tag">
            ID: {node.id}
          </Tag>
        </div>
      ) : (
        <div className="edge-node-card__body empty">
          <Text type="secondary">{placeholder}</Text>
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      className="edge-creation-drawer"
      title={
        <Space>
          <LinkOutlined />
          Create Connection
        </Space>
      }
      placement="right"
      onClose={handleClose}
      open={visible}
      width={420}
      mask={false}
      maskClosable={false}
      bodyStyle={{ padding: 0 }}
      extra={
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={handleClose}
        />
      }
    >
      <div className="edge-creation-content">
        <div className="edge-overview glass-panel">
          <div className="edge-overview__title">
            <Title level={4}>Link nodes</Title>
            <Text type="secondary">
              Select the origin and destination directly on the canvas, then refine the connection metadata below.
            </Text>
          </div>
          <div className="edge-step-list">
            {stepIndicators.map((step, index) => (
              <div className={`edge-step ${step.done ? 'edge-step--done' : 'edge-step--pending'}`} key={step.key}>
                <div className="edge-step__index">{step.done ? <CheckOutlined /> : index + 1}</div>
                <div className="edge-step__body">
                  <span className="edge-step__label">{step.label}</span>
                  <span className="edge-step__description">{step.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="selection-status">
          <div className="edge-instructions glass-panel">
            <Text strong>How to select nodes</Text>
            <ul>
              <li>Click a node once on the canvas to choose the source.</li>
              <li>Select a second node to mark it as the target.</li>
              <li>Click a highlighted node again if you need to clear the selection.</li>
            </ul>
          </div>
          <div className="edge-selection-grid">
            {renderNodeCard('Source node', getSourceNode(), 'source', 'Click any node to set it as the source.')}
            {renderNodeCard('Target node', getTargetNode(), 'target', 'Pick another node to receive the output.')}
          </div>
        </div>

        <div className="edge-config-form glass-panel">
          <Title level={4}>Connection settings</Title>
          {!canProceed && (
            <Text type="secondary">Select both source and target nodes to enable scheduling and metadata editing.</Text>
          )}
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{ type: 'hard', delay: 0 }}
            disabled={!canProceed}
          >
            <Form.Item
              name="type"
              label="Connection type"
              rules={[{ required: true, message: 'Please choose a connection type' }]}
            >
              <Radio.Group onChange={handleEdgeTypeChange} value={edgeType} className="edge-type-group">
                <Space direction="vertical" size={12}>
                  <Radio value="hard">
                    <div className="edge-type-item">
                      <strong>Hard Edge</strong>
                      <Text type="secondary">Guaranteed delivery - every message is sent to the target node.</Text>
                    </div>
                  </Radio>
                  <Radio value="soft" disabled>
                    <div className="edge-type-item disabled">
                      <strong>Soft Edge</strong>
                      <Text type="secondary">Conditional delivery (coming soon).</Text>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="delay"
              label="Delivery delay (ticks)"
              tooltip="How many scheduler ticks to wait before delivering messages along this connection."
              rules={[{ type: 'number', min: 0, message: 'Delay must be zero or greater' }]}
            >
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <TextArea
                rows={3}
                placeholder="Describe what this connection is responsible for."
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>

            {edgeType === 'soft' && (
              <Form.Item
                name="condition"
                label="Trigger condition"
                rules={[{ required: true, message: 'Please provide a condition' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="Provide a condition to trigger this connection."
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </Form.Item>
            )}
          </Form>
        </div>
        <div className="sidebar-actions">
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!canProceed}
            >
              Create Connection
            </Button>
          </Space>
        </div>
      </div>
    </Drawer>
  );
};

export default EdgeCreationSidebar;
