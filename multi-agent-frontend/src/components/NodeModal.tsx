import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, Button, Space, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Node, NodeType, ConfigField } from '../utils/types';
import { getNodeTypes } from '../utils/api';

const { TextArea } = Input;
const { Option } = Select;

interface NodeModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (node: Omit<Node, 'id'>) => void;
}

const NodeModal: React.FC<NodeModalProps> = ({ visible, onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [selectedType, setSelectedType] = useState<NodeType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTypeChange = useCallback((typeValue: string) => {
    const type = nodeTypes.find(t => t.value === typeValue);
    setSelectedType(type || null);
    
    // 重置配置字段的值
    const configFields = type?.configSchema || [];
    const configValues: any = {};
    configFields.forEach(field => {
      if (field.defaultValue !== undefined) {
        configValues[field.name] = field.defaultValue;
      }
    });
    
    form.setFieldsValue({ config: configValues });
  }, [nodeTypes, form]);

  useEffect(() => {
    if (visible) {
      loadNodeTypes();
      // 设置默认类型为agent
      setTimeout(() => {
        handleTypeChange('agent');
      }, 100);
    }
  }, [visible, handleTypeChange]);

  const loadNodeTypes = async () => {
    try {
      const types = await getNodeTypes();
      setNodeTypes(types);
    } catch (error) {
      console.error('Failed to load node types:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const node: Omit<Node, 'id'> = {
        name: values.name,
        type: values.type,
        description: values.description,
        config: values.config || {},
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
        },
      };

      onSubmit(node);
      form.resetFields();
      setSelectedType(null);
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedType(null);
    onCancel();
  };

  const renderConfigField = (field: ConfigField) => {
    const { name, label, type, required, options, placeholder } = field;
    
    switch (type) {
      case 'text':
        return (
          <Form.Item
            key={name}
            name={['config', name]}
            label={label}
            rules={[{ required, message: `请输入${label}` }]}
          >
            <Input placeholder={placeholder} />
          </Form.Item>
        );
      
      case 'textarea':
        return (
          <Form.Item
            key={name}
            name={['config', name]}
            label={label}
            rules={[{ required, message: `请输入${label}` }]}
          >
            <TextArea 
              rows={4} 
              placeholder={placeholder}
              autoSize={{ minRows: 3, maxRows: 8 }}
            />
          </Form.Item>
        );
      
      case 'select':
        return (
          <Form.Item
            key={name}
            name={['config', name]}
            label={label}
            rules={[{ required, message: `请选择${label}` }]}
          >
            <Select placeholder={`请选择${label}`}>
              {options?.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
      
      case 'number':
        return (
          <Form.Item
            key={name}
            name={['config', name]}
            label={label}
            rules={[{ required, message: `请输入${label}` }]}
          >
            <InputNumber 
              style={{ width: '100%' }}
              placeholder={placeholder}
              min={0}
              max={2}
              step={0.1}
            />
          </Form.Item>
        );
      
      case 'boolean':
        return (
          <Form.Item
            key={name}
            name={['config', name]}
            label={label}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        );
      
      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined />
          新建节点
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          创建节点
        </Button>,
      ]}
      width={600}
      destroyOnHidden={true}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          name: "智能体节点",
          type: "agent",
          description: "这是一个智能体节点，用于处理用户输入并生成响应",
        }}
      >
        <Form.Item
          name="name"
          label="节点名称"
          rules={[{ required: true, message: '请输入节点名称' }]}
        >
          <Input placeholder="请输入节点名称" />
        </Form.Item>

        <Form.Item
          name="type"
          label="节点类型"
          rules={[{ required: true, message: '请选择节点类型' }]}
        >
          <Select placeholder="请选择节点类型" onChange={handleTypeChange}>
            {nodeTypes.map(type => (
              <Option key={type.value} value={type.value}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{type.label}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{type.description}</div>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="description"
          label="节点描述"
          rules={[{ required: true, message: '请输入节点描述' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="请描述此节点的功能和作用"
            autoSize={{ minRows: 2, maxRows: 5 }}
          />
        </Form.Item>

        {selectedType && selectedType.configSchema.length > 0 && (
          <>
            <Divider>节点配置</Divider>
            {selectedType.configSchema.map(renderConfigField)}
          </>
        )}
      </Form>
    </Modal>
  );
};

export default NodeModal;