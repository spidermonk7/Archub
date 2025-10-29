import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Select, Button, Space, Divider, Card, Row, Col, Typography } from 'antd';
import { PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { Node } from '../utils/types';
import { TOOL_OPTIONS } from '../utils/toolsRegistry';
import './NodeModal.css';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface NodeModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (node: Omit<Node, 'id'>) => void;
}

// 定义可用的LLM模型
const LLM_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
];

// 定义输入数据类型
const INPUT_DATA_TYPES = [
  { value: 'text', label: '文本', icon: '📝', description: '处理文本内容' },
  { value: 'image', label: '图像', icon: '🖼️', description: '处理图像文件' },
  { value: 'audio', label: '音频', icon: '🎵', description: '处理音频文件' },
  { value: 'video', label: '视频', icon: '🎬', description: '处理视频文件' },
  { value: 'file', label: '文件', icon: '📄', description: '处理各种文件格式' },
];

// 定义输出数据类型
const OUTPUT_DATA_TYPES = [
  { value: 'text', label: '文本', icon: '📝', description: '输出文本内容' },
  { value: 'image', label: '图像', icon: '🖼️', description: '生成图像文件' },
  { value: 'datafile', label: '数据文件', icon: '📊', description: '生成数据文件（CSV、Excel等）' },
  { value: 'audio', label: '音频', icon: '🎵', description: '生成音频文件' },
  { value: 'json', label: 'JSON数据', icon: '🔢', description: '输出结构化JSON数据' },
];

// 定义文本输出的Schema类型
const OUTPUT_SCHEMAS = [
  { value: 'free_text', label: '自由文本', description: '无特定格式的自然语言文本' },
  { value: 'json', label: 'JSON格式', description: '结构化的JSON数据格式' },
  { value: 'markdown', label: 'Markdown格式', description: 'Markdown标记语言格式' },
  { value: 'xml', label: 'XML格式', description: 'XML标记语言格式' },
  { value: 'csv', label: 'CSV格式', description: '逗号分隔值格式' },
  { value: 'custom', label: '自定义格式', description: '用户自定义的输出格式' },
];

// 定义节点类型 - 只保留智能体节点
const NODE_TYPES = [
  {
    value: 'agent',
    label: '智能体',
    description: '具有AI推理能力的处理节点',
  },
];

const NodeModal: React.FC<NodeModalProps> = ({ visible, onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState<string>('agent');
  const [loading, setLoading] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [outputType, setOutputType] = useState<string>('text');

  const handleTypeChange = useCallback((typeValue: string) => {
    setSelectedType(typeValue);
    
    // 当选择智能体类型时，设置默认值
    if (typeValue === 'agent') {
      form.setFieldsValue({
        config: {
          llmModel: 'gpt-4o-mini',
          systemPrompt: 'You are a helpful assistant.',
          inputDataType: 'text',
          outputDataType: 'text',
          outputSchema: 'free_text',
          tools: []
        }
      });
      setSelectedTools([]);
      setOutputType('text');
    } else {
      // 其他类型清空配置
      form.setFieldsValue({
        config: {}
      });
      setSelectedTools([]);
      setOutputType('text');
    }
  }, [form]);

  const handleOutputTypeChange = useCallback((value: string) => {
    setOutputType(value);
    // 如果不是text类型，清除outputSchema字段
    if (value !== 'text') {
      const currentConfig = form.getFieldsValue().config || {};
      const { outputSchema, ...restConfig } = currentConfig;
      form.setFieldsValue({
        config: {
          ...restConfig,
          outputDataType: value
        }
      });
    }
  }, [form]);

  const handleToolToggle = useCallback((toolValue: string) => {
    setSelectedTools(prev => {
      const newSelectedTools = prev.includes(toolValue)
        ? prev.filter(tool => tool !== toolValue)
        : [...prev, toolValue];
      
      // 同步更新表单字段
      form.setFieldsValue({
        config: {
          ...form.getFieldsValue().config,
          tools: newSelectedTools
        }
      });
      
      return newSelectedTools;
    });
  }, [form]);

  useEffect(() => {
    if (visible) {
      // 设置默认值
      form.setFieldsValue({
        name: "智能体节点",
        type: "agent",
        description: "这是一个智能体节点，用于处理用户输入并生成响应",
        config: {
          llmModel: 'gpt-4o-mini',
          systemPrompt: 'You are a helpful assistant.',
          inputDataType: 'text',
          outputDataType: 'text',
          outputSchema: 'free_text',
          tools: []
        }
      });
      setSelectedType('agent');
      setSelectedTools([]);
      setOutputType('text');
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const node: Omit<Node, 'id'> = {
        name: values.name,
        type: values.type,
        description: values.description,
        config: {
          ...values.config,
          tools: selectedTools // 确保工具选择被包含
        },
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
        },
      };

      onSubmit(node);
      form.resetFields();
      setSelectedType('agent');
      setSelectedTools([]);
      setOutputType('text');
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedType('agent');
    setSelectedTools([]);
    setOutputType('text');
    onCancel();
  };

  return (
    <Modal
      className="node-modal"
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
      width={650}
      destroyOnHidden={true}
    >
      <Form
        className="node-modal-form"
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          name: "智能体节点",
          type: "agent",
          description: "这是一个智能体节点，用于处理用户输入并生成响应",
          config: {
            llmModel: 'gpt-4o-mini',
            systemPrompt: 'You are a helpful assistant.',
            inputDataType: 'text',
            outputDataType: 'text',
            outputSchema: 'free_text',
            tools: []
          }
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
            {NODE_TYPES.map(type => (
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

        {selectedType === 'agent' && (
          <>
            <Divider>智能体配置</Divider>
            
            <Form.Item
              name={['config', 'llmModel']}
              label="LLM模型"
              rules={[{ required: true, message: '请选择LLM模型' }]}
            >
              <Select placeholder="选择LLM模型" size="large">
                {LLM_MODELS.map(model => (
                  <Option key={model.value} value={model.value}>
                    <div style={{ 
                      padding: '6px 0',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      {model.label}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name={['config', 'systemPrompt']}
              label="System Prompt"
              rules={[{ required: true, message: '请输入System Prompt' }]}
            >
              <TextArea 
                rows={4} 
                placeholder="请输入System Prompt，例如：You are a helpful assistant."
                autoSize={{ minRows: 3, maxRows: 8 }}
              />
            </Form.Item>

            <Divider>数据类型配置</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['config', 'inputDataType']}
                  label="输入数据类型"
                  rules={[{ required: true, message: '请选择输入数据类型' }]}
                >
                  <Select placeholder="选择输入类型" size="large" optionLabelProp="label">
                    {INPUT_DATA_TYPES.map(type => (
                      <Option key={type.value} value={type.value} label={type.label}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start',
                          padding: '8px 4px',
                          minHeight: '48px'
                        }}>
                          <span style={{ 
                            marginRight: '12px', 
                            fontSize: '18px',
                            minWidth: '24px',
                            textAlign: 'center',
                            marginTop: '2px'
                          }}>
                            {type.icon}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontWeight: '500',
                              fontSize: '14px',
                              lineHeight: '20px',
                              marginBottom: '2px'
                            }}>
                              {type.label}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#666',
                              lineHeight: '16px',
                              wordWrap: 'break-word',
                              whiteSpace: 'normal'
                            }}>
                              {type.description}
                            </div>
                          </div>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['config', 'outputDataType']}
                  label="输出数据类型"
                  rules={[{ required: true, message: '请选择输出数据类型' }]}
                >
                  <Select 
                    placeholder="选择输出类型"
                    size="large"
                    optionLabelProp="label"
                    onChange={handleOutputTypeChange}
                  >
                    {OUTPUT_DATA_TYPES.map(type => (
                      <Option key={type.value} value={type.value} label={type.label}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start',
                          padding: '8px 4px',
                          minHeight: '48px'
                        }}>
                          <span style={{ 
                            marginRight: '12px', 
                            fontSize: '18px',
                            minWidth: '24px',
                            textAlign: 'center',
                            marginTop: '2px'
                          }}>
                            {type.icon}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontWeight: '500',
                              fontSize: '14px',
                              lineHeight: '20px',
                              marginBottom: '2px'
                            }}>
                              {type.label}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#666',
                              lineHeight: '16px',
                              wordWrap: 'break-word',
                              whiteSpace: 'normal'
                            }}>
                              {type.description}
                            </div>
                          </div>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {outputType === 'text' && (
              <Form.Item
                name={['config', 'outputSchema']}
                label="输出格式规范"
                rules={[{ required: true, message: '请选择输出格式规范' }]}
              >
                <Select placeholder="选择输出格式" size="large" optionLabelProp="label">
                  {OUTPUT_SCHEMAS.map(schema => (
                    <Option key={schema.value} value={schema.value} label={schema.label}>
                      <div style={{ 
                        padding: '8px 4px',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '40px'
                      }}>
                        <div style={{ 
                          fontWeight: '500',
                          fontSize: '14px',
                          lineHeight: '20px',
                          marginBottom: '2px'
                        }}>
                          {schema.label}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#666',
                          lineHeight: '16px',
                          wordWrap: 'break-word',
                          whiteSpace: 'normal'
                        }}>
                          {schema.description}
                        </div>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {outputType === 'text' && form.getFieldValue(['config', 'outputSchema']) === 'custom' && (
              <Form.Item
                name={['config', 'customSchema']}
                label="自定义输出格式"
                rules={[{ required: true, message: '请输入自定义输出格式' }]}
              >
                <TextArea 
                  rows={3} 
                  placeholder="请描述您的自定义输出格式，例如：JSON schema, 特定的文本模板等"
                  autoSize={{ minRows: 2, maxRows: 6 }}
                />
              </Form.Item>
            )}

            <Divider>工具配置</Divider>

            <Form.Item
              label="工具配置"
              name={['config', 'tools']}
            >
              <div className="tool-selection-block">
                <Text type="secondary" className="tool-selection-hint">
                  Select the tools this agent can use (multi-select).
                </Text>
                <Row gutter={[12, 12]}>
                  {TOOL_OPTIONS.map(tool => (
                    <Col span={12} key={tool.value}>
                      <Card
                        size="small"
                        hoverable={!tool.comingSoon}
                        className={`tool-card ${selectedTools.includes(tool.value) ? 'tool-card--selected' : ''} ${tool.comingSoon ? 'tool-card--custom' : ''}`}
                        onClick={() => !tool.comingSoon && handleToolToggle(tool.value)}
                      >
                        <div className="tool-card__body">
                          <div className="tool-card__main">
                            <span className="tool-card__icon">{tool.icon}</span>
                            <div className="tool-card__text">
                              <div className="tool-card__title">{tool.label}</div>
                              <Text type="secondary" className="tool-card__description">
                                {tool.description}
                              </Text>
                            </div>
                          </div>
                          {!tool.comingSoon && selectedTools.includes(tool.value) && (
                            <CheckOutlined className="tool-card__check" />
                          )}
                          {tool.comingSoon && (
                            <span className="tool-card__status">Coming soon</span>
                          )}
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
                {selectedTools.length > 0 && (
                  <div className="tool-selection-summary">
                    <Text type="secondary">
                      Selected {selectedTools.length} item(s):{' '}
                      {selectedTools
                        .map(tool => TOOL_OPTIONS.find(t => t.value === tool)?.label)
                        .filter((label): label is string => Boolean(label))
                        .join(', ')}
                    </Text>
                  </div>
                )}
              </div>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default NodeModal;
