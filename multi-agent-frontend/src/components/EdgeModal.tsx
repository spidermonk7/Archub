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
      input: '输入',
      output: '输出',
      agent: '智能体',
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
          建立节点连接
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ type: 'hard', priority: 'normal' }}
      >
        <Alert
          message="连接说明"
          description="连接定义了信息在节点之间的传递路径。Hard Edge表示确定的信息传递，Soft Edge表示条件性传递（暂未实现）。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          name="type"
          label="连接类型"
          rules={[{ required: true, message: '请选择连接类型' }]}
        >
          <Radio.Group onChange={handleEdgeTypeChange} value={edgeType}>
            <Space direction="vertical">
              <Radio value="hard">
                <strong>Hard Edge</strong>
                <br />
                <Text type="secondary">确定性连接，信息必定传递到目标节点</Text>
              </Radio>
              <Radio value="soft" disabled>
                <strong>Soft Edge</strong>
                <br />
                <Text type="secondary">条件性连接，根据条件决定是否传递（暂未实现）</Text>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="source"
          label="源节点"
          rules={[{ required: true, message: '请选择源节点' }]}
        >
          <Select 
            placeholder="请选择源节点"
            showSearch
            filterOption={(input, option) => {
              if (!option || !option.children) return false;
              const text = Array.isArray(option.children) 
                ? option.children.join('') 
                : String(option.children);
              return text.toLowerCase().indexOf(input.toLowerCase()) >= 0;
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
          label="目标节点"
          rules={[{ required: true, message: '请选择目标节点' }]}
        >
          <Select 
            placeholder="请选择目标节点"
            showSearch
            filterOption={(input, option) => {
              if (!option || !option.children) return false;
              const text = Array.isArray(option.children) 
                ? option.children.join('') 
                : String(option.children);
              return text.toLowerCase().indexOf(input.toLowerCase()) >= 0;
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

        <Form.Item
          name="priority"
          label="优先级"
        >
          <Select placeholder="选择连接优先级">
            <Option value="high">高优先级</Option>
            <Option value="normal">普通优先级</Option>
            <Option value="low">低优先级</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="description"
          label="连接描述"
        >
          <TextArea 
            rows={3} 
            placeholder="描述此连接的用途和信息传递的内容"
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </Form.Item>

        {edgeType === 'soft' && (
          <Form.Item
            name="condition"
            label="触发条件"
            rules={[{ required: true, message: '请输入触发条件' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="输入触发此连接的条件表达式"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default EdgeModal;