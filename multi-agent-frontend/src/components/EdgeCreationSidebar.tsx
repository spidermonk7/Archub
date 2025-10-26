import React, { useState } from 'react';
import { Drawer, Form, Radio, Input, Select, Button, Space, Alert, Typography, Steps, Badge } from 'antd';
import { LinkOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
import { Node, Edge } from '../utils/types';
import './EdgeCreationSidebar.css';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Option } = Select;

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
  onNodeSelect,
  onNodeDeselect,
}) => {
  const [form] = Form.useForm();
  const [edgeType, setEdgeType] = useState<'hard' | 'soft'>('hard');
  const [loading, setLoading] = useState(false);

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      input: '输入',
      output: '输出',
      agent: '智能体',
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
        config: {
          description: values.description || '',
          priority: values.priority || 'normal',
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

  const handleEdgeTypeChange = (e: any) => {
    setEdgeType(e.target.value);
  };

  const getCurrentStep = () => {
    if (!selectedSource && !selectedTarget) return 0;
    if (selectedSource && !selectedTarget) return 1;
    if (selectedSource && selectedTarget) return 2;
    return 0;
  };

  const getSourceNode = () => availableNodes.find(node => node.id === selectedSource);
  const getTargetNode = () => availableNodes.find(node => node.id === selectedTarget);

  const canProceed = selectedSource && selectedTarget;

  return (
    <Drawer
      title={
        <Space>
          <LinkOutlined />
          创建节点连接
        </Space>
      }
      placement="right"
      onClose={handleClose}
      open={visible}
      width={400}
      mask={false} // 关键：去掉遮罩层
      maskClosable={false} // 确保点击外部不会关闭
      extra={
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={handleClose}
        />
      }
    >
      <div className="edge-creation-content">
        {/* 进度指示器 */}
        <div className="creation-steps">
          <Steps
            current={getCurrentStep()}
            direction="vertical"
            size="small"
            items={[
              {
                title: '选择源节点',
                description: selectedSource ? 
                  <Text type="success">{getSourceNode()?.name}</Text> : 
                  '在画布上点击源节点',
                icon: selectedSource ? <CheckOutlined /> : <Badge count={1} />,
              },
              {
                title: '选择目标节点',
                description: selectedTarget ? 
                  <Text type="success">{getTargetNode()?.name}</Text> : 
                  '在画布上点击目标节点',
                icon: selectedTarget ? <CheckOutlined /> : <Badge count={2} />,
              },
              {
                title: '配置连接',
                description: canProceed ? '设置连接属性' : '等待节点选择完成',
                icon: canProceed ? <Badge count={3} /> : null,
              },
            ]}
          />
        </div>

        {/* 选择状态显示 */}
        <div className="selection-status">
          <Alert
            message="节点选择指南"
            description={
              <div>
                <p>1. 点击画布上的节点来选择源节点（第一次点击）</p>
                <p>2. 再点击另一个节点作为目标节点（第二次点击）</p>
                <p>3. 重复点击同一节点可以取消选择</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {selectedSource && (
            <div className="selected-node">
              <Title level={5}>源节点</Title>
              <div className="node-info">
                <Text strong>{getSourceNode()?.name}</Text>
                <Text type="secondary"> - {getTypeLabel(getSourceNode()?.type || '')}</Text>
                <Button
                  type="link"
                  size="small"
                  onClick={() => onNodeDeselect('source')}
                >
                  取消选择
                </Button>
              </div>
            </div>
          )}

          {selectedTarget && (
            <div className="selected-node">
              <Title level={5}>目标节点</Title>
              <div className="node-info">
                <Text strong>{getTargetNode()?.name}</Text>
                <Text type="secondary"> - {getTypeLabel(getTargetNode()?.type || '')}</Text>
                <Button
                  type="link"
                  size="small"
                  onClick={() => onNodeDeselect('target')}
                >
                  取消选择
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 配置表单 */}
        {canProceed && (
          <div className="edge-config-form">
            <Title level={4}>连接配置</Title>
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              initialValues={{ type: 'hard', priority: 'normal' }}
            >
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
          </div>
        )}

        {/* 操作按钮 */}
        <div className="sidebar-actions">
          <Space>
            <Button onClick={handleClose}>
              取消
            </Button>
            <Button 
              type="primary" 
              onClick={handleSubmit}
              loading={loading}
              disabled={!canProceed}
            >
              创建连接
            </Button>
          </Space>
        </div>
      </div>
    </Drawer>
  );
};

export default EdgeCreationSidebar;