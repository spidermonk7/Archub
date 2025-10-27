import React, { useState } from 'react';
import { Modal, Form, Select, Radio, Input, Space, Alert, Typography } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { Node, Edge } from '../utils/types';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface EdgeModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (edge: Omit<Edge, 'id'>) => void;
  availableNodes: Node[];
}

const EdgeModal: React.FC<EdgeModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  availableNodes,
}) => {
  const [form] = Form.useForm();
  const [edgeType, setEdgeType] = useState<'hard' | 'soft'>('hard');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const edge: Omit<Edge, 'id'> = {
        source: values.source,
        target: values.target,
        type: values.type,
        config: {
          description: values.description || '',
          priority: values.priority || 'normal',
          condition: values.condition || '',
        },
      };

      onSubmit(edge);
      form.resetFields();
      setEdgeType('hard');
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setEdgeType('hard');
    onCancel();
  };

  const handleEdgeTypeChange = (e: any) => {
    setEdgeType(e.target.value);
  };

  const getNodeDisplayName = (node: Node) => {
    return `${node.name} (${getTypeLabel(node.type)})`;
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      input: 'Input',
      output: 'Output',
      agent: 'Agent',
    };
    return labels[type] || type;
  };

  const filterTargetNodes = (sourceNodeId: string) => {
    return availableNodes.filter(node => node.id !== sourceNodeId);
  };

  const sourceNodeId = Form.useWatch('source', form);

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined />
          Create Connection
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ type: 'hard', priority: 'normal' }}
      >
        <Alert
          message="About connections"
          description="A connection defines how messages travel between nodes. Hard edges guarantee delivery, while soft edges will add conditional delivery in the future."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          name="type"
          label="Connection type"
          rules={[{ required: true, message: 'Please choose a connection type' }]}
        >
          <Radio.Group onChange={handleEdgeTypeChange} value={edgeType}>
            <Space direction="vertical">
              <Radio value="hard">
                <strong>Hard Edge</strong>
                <br />
                <Text type="secondary">Guaranteed delivery — every message is sent to the target node.</Text>
              </Radio>
              <Radio value="soft" disabled>
                <strong>Soft Edge</strong>
                <br />
                <Text type="secondary">Conditional delivery (coming soon).</Text>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="source"
          label="Source node"
          rules={[{ required: true, message: 'Please select a source node' }]}
        >
          <Select
            placeholder="Select a source node"
            showSearch
            filterOption={(input, option) => {
              if (!option || !option.children) return false;
              const text = Array.isArray(option.children)
                ? option.children.join('')
                : String(option.children);
              return text.toLowerCase().includes(input.toLowerCase());
            }}
          >
            {availableNodes.map(node => (
              <Option key={node.id} value={node.id}>
                {getNodeDisplayName(node)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="target"
          label="Target node"
          rules={[{ required: true, message: 'Please select a target node' }]}
        >
          <Select
            placeholder="Select a target node"
            showSearch
            filterOption={(input, option) => {
              if (!option || !option.children) return false;
              const text = Array.isArray(option.children)
                ? option.children.join('')
                : String(option.children);
              return text.toLowerCase().includes(input.toLowerCase());
            }}
            disabled={!sourceNodeId}
          >
            {sourceNodeId && filterTargetNodes(sourceNodeId).map(node => (
              <Option key={node.id} value={node.id}>
                {getNodeDisplayName(node)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="priority" label="Priority">
          <Select placeholder="Select connection priority">
            <Option value="high">High priority</Option>
            <Option value="normal">Normal priority</Option>
            <Option value="low">Low priority</Option>
          </Select>
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
    </Modal>
  );
};

export default EdgeModal;
