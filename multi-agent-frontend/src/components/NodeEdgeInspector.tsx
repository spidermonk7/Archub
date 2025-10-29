import React, { useEffect, useState } from 'react';
import { Drawer, Form, Input, Select, Button, Space, Divider, Typography, Tag, Modal, Card, Row, Col, InputNumber } from 'antd';
import { DeleteOutlined, SaveOutlined, CheckOutlined } from '@ant-design/icons';
import { Node, Edge } from '../utils/types';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select as any;

export interface NodeEdgeInspectorProps {
  open: boolean;
  mode: 'node' | 'edge';
  node?: Node;
  edge?: Edge;
  allNodes: Node[];
  onClose: () => void;
  onSaveNode: (node: Node) => void;
  onDeleteNode: (nodeId: string) => void;
  onSaveEdge: (edge: Edge) => void;
  onDeleteEdge?: (edgeId: string) => void;
}

// Available libraries
const LLM_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
];

const AVAILABLE_TOOLS = [
  { value: 'math', label: 'Math Calculator', description: '执行数学计算', icon: '🧮' },
  { value: 'code_executor', label: 'Code Executor', description: '执行代码片段', icon: '💻' },
  { value: 'web_search', label: 'Web Search', description: '联网搜索信息', icon: '🔎' },
  { value: 'file_reader', label: 'File Reader', description: '读取本地文件', icon: '📄' },
];

const AVAILABLE_DATABASES = [
  { value: 'vector_store', label: 'Vector Store', description: '向量检索库', icon: '🧠' },
  { value: 'postgres', label: 'PostgreSQL', description: '关系型数据库', icon: '🐘' },
  { value: 'mongodb', label: 'MongoDB', description: '文档型数据库', icon: '🍃' },
];

const NodeEdgeInspector: React.FC<NodeEdgeInspectorProps> = ({
  open,
  mode,
  node,
  edge,
  allNodes,
  onClose,
  onSaveNode,
  onDeleteNode,
  onSaveEdge,
  onDeleteEdge,
}) => {
  const [form] = Form.useForm();
  const [equippedTools, setEquippedTools] = useState<string[]>([]);
  const [equippedDatabases, setEquippedDatabases] = useState<string[]>([]);
  const [hasMemory, setHasMemory] = useState<boolean>(false);
  const [picker, setPicker] = useState<{ visible: boolean; type: 'tools' | 'databases' | 'memory' | null }>({ visible: false, type: null });

  const isAgentNode = mode === 'node' && node?.type === 'agent';
  const isLogicNode = mode === 'node' && node?.type === 'logic';

  const handleToolToggle = (toolValue: string) => {
    setEquippedTools((prev) =>
      prev.includes(toolValue) ? prev.filter((t) => t !== toolValue) : [...prev, toolValue]
    );
  };

  const handleDatabaseToggle = (dbValue: string) => {
    setEquippedDatabases((prev) =>
      prev.includes(dbValue) ? prev.filter((d) => d !== dbValue) : [...prev, dbValue]
    );
  };

  useEffect(() => {
    if (mode === 'node') {
      form.resetFields();
      if (node) {
        const baseFields: Record<string, any> = {
          name: node.name,
          type: node.type,
          description: node.description,
        };

        if (isAgentNode) {
          baseFields.config = {
            llmModel: node.config?.llmModel,
            systemPrompt: node.config?.systemPrompt,
          };
          setHasMemory(node.config?.memory?.type === 'simple');
          setEquippedTools(Array.isArray(node.config?.tools) ? node.config.tools : []);
          setEquippedDatabases(Array.isArray(node.config?.databases) ? node.config.databases : []);
        } else {
          setHasMemory(false);
          setEquippedTools([]);
          setEquippedDatabases([]);
        }

        if (node.type === 'logic') {
          baseFields.logicType = node.config?.logicType || 'go-through';
        }

        form.setFieldsValue(baseFields);
      }
    }
    if (mode === 'edge' && edge) {
      form.setFieldsValue({
        type: edge.type,
        delay: edge.delay ?? 0,
        priority: edge.config?.priority || 'normal',
        description: edge.config?.description || '',
        condition: edge.config?.condition || '',
      });
    }
  }, [open, mode, node, edge, form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    if (mode === 'node' && node) {
      let updated: Node;

      if (isAgentNode) {
        updated = {
          ...node,
          name: values.name,
          description: values.description,
          config: {
            ...(node.config || {}),
            llmModel: values?.config?.llmModel,
            systemPrompt: values?.config?.systemPrompt,
            tools: equippedTools,
            databases: equippedDatabases,
            memory: hasMemory ? { type: 'simple' } : undefined,
          },
        } as any;
      } else if (node.type === 'logic') {
        updated = {
          ...node,
          name: values.name,
          description: values.description,
          config: {
            ...(node.config || {}),
            logicType: values.logicType || node.config?.logicType || 'go-through',
          },
        } as any;
      } else {
        updated = {
          ...node,
          name: values.name,
          description: values.description,
          config: {
            ...(node.config || {}),
          },
        } as any;
      }

      onSaveNode(updated);
    }
    if (mode === 'edge' && edge) {
      const updated: Edge = {
        ...edge,
        delay: typeof values.delay === 'number' ? values.delay : 0,
        config: {
          ...(edge.config || {}),
          description: values.description || '',
          priority: values.priority || 'normal',
          condition: values.condition || '',
        },
      } as any;
      onSaveEdge(updated);
    }
  };

  const title = mode === 'node' ? '节点详情' : '连接详情';
  const typeTagLabels: Record<string, string> = {
    input: 'Input',
    output: 'Output',
    agent: 'Agent',
    logic: 'Logic',
  };
  const nodeTitle = node ? (
    <Space>
      <span>{title}</span>
      <Tag>{typeTagLabels[node.type] || node.type}</Tag>
    </Space>
  ) : title;

  return (
    <Drawer
      title={mode === 'node' ? nodeTitle : title}
      width={480}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          {mode === 'node' && node && (
            <Button danger icon={<DeleteOutlined />} onClick={() => onDeleteNode(node.id)}>
              删除节点
            </Button>
          )}
          {mode === 'edge' && edge && onDeleteEdge && (
            <Button danger icon={<DeleteOutlined />} onClick={() => onDeleteEdge(edge.id)}>
              删除连接
            </Button>
          )}
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
    >
      {mode === 'node' && node && (
        <>
          <Form form={form} layout="vertical" requiredMark={false} initialValues={{}}>
            <Form.Item label="节点类型" name="type">
              <Input disabled />
            </Form.Item>
            <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}> 
              <Input placeholder="节点名称" />
            </Form.Item>
            <Form.Item label="描述" name="description">
              <TextArea rows={3} placeholder="节点描述" />
            </Form.Item>

            {isAgentNode && (
          <>
            <Divider>智能体配置</Divider>
            <Form.Item label="LLM模型" name={['config', 'llmModel']} rules={[{ required: true, message: '请选择LLM模型' }]}> 
              <Select placeholder="选择LLM模型">
                {LLM_MODELS.map((m) => (
                  <Option key={m.value} value={m.value}>{m.label}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="System Prompt" name={['config', 'systemPrompt']} rules={[{ required: true, message: '请输入System Prompt' }]}> 
              <TextArea rows={4} placeholder="You are a helpful assistant." />
            </Form.Item>

            <Divider>Equipped With</Divider>

            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Memory</Text>
              <Button size="small" onClick={() => setPicker({ visible: true, type: 'memory' })}>Add more</Button>
            </div>
            <Row gutter={[12, 12]}>
              {!hasMemory && (
                <Col span={24}>
                  <Text type="secondary">未配置 Memory</Text>
                </Col>
              )}
              {hasMemory && (
                <Col span={12}>
                  <Card
                    size="small"
                    style={{
                      border: '1px solid #d9d9d9',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Simple Memory</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>基础存储模块</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              )}
            </Row>

            <Divider style={{ marginTop: 16 }} />
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Tools</Text>
              <Button size="small" onClick={() => setPicker({ visible: true, type: 'tools' })}>Add more</Button>
            </div>
            <Row gutter={[12, 12]}>
              {equippedTools.length === 0 && (
                <Col span={24}>
                  <Text type="secondary">未添加工具</Text>
                </Col>
              )}
              {equippedTools.map((key) => {
                const tool = AVAILABLE_TOOLS.find((t) => t.value === key);
                if (!tool) return null;
                return (
                  <Col span={12} key={key}>
                    <Card
                      size="small"
                      style={{
                        border: '1px solid #d9d9d9',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontWeight: 600 }}>
                            <span style={{ marginRight: 8 }}>{tool.icon}</span>
                            {tool.label}
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{tool.description}</Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            <Divider style={{ marginTop: 16 }} />
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Databases</Text>
              <Button size="small" onClick={() => setPicker({ visible: true, type: 'databases' })}>Add more</Button>
            </div>
            <Row gutter={[12, 12]}>
              {equippedDatabases.length === 0 && (
                <Col span={24}>
                  <Text type="secondary">未配置数据库</Text>
                </Col>
              )}
              {equippedDatabases.map((key) => {
                const db = AVAILABLE_DATABASES.find((d) => d.value === key);
                if (!db) return null;
                return (
                  <Col span={12} key={key}>
                    <Card
                      size="small"
                      style={{
                        border: '1px solid #d9d9d9',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontWeight: 600 }}>
                            <span style={{ marginRight: 8 }}>{db.icon}</span>
                            {db.label}
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{db.description}</Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </>
        )}

        {isLogicNode && (
          <>
            <Divider>Logic settings</Divider>
            <Form.Item label="Behaviour" name="logicType" rules={[{ required: true, message: '请选择逻辑类型' }]}>
              <Select disabled>
                <Option value="go-through">Go Through</Option>
              </Select>
            </Form.Item>
            <Text type="secondary">This node forwards incoming messages without modification.</Text>
          </>
        )}
</Form>

        {isAgentNode && (
          <Modal
            title={picker.type === 'memory' ? '选择 Memory' : picker.type === 'tools' ? '选择工具' : '选择数据库'}
            open={picker.visible}
            onCancel={() => setPicker({ visible: false, type: null })}
            onOk={() => {
              setPicker({ visible: false, type: null });
            }}
            okText="添加"
            cancelText="取消"
          >
            {picker.type === 'memory' && (
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Card
                    size="small"
                    hoverable
                    onClick={() => setHasMemory(!hasMemory)}
                    style={{
                      cursor: 'pointer',
                      border: hasMemory ? '2px solid #1677ff' : '1px solid #d9d9d9',
                      backgroundColor: hasMemory ? '#f0f8ff' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Simple Memory</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>轻量记忆模块</Text>
                      </div>
                      {hasMemory && <CheckOutlined style={{ color: '#1677ff' }} />}
                    </div>
                  </Card>
                </Col>
              </Row>
            )}
            {picker.type === 'tools' && (
              <Row gutter={[12, 12]}>
                {AVAILABLE_TOOLS.map((t) => {
                  const selected = equippedTools.includes(t.value);
                  return (
                    <Col span={12} key={t.value}>
                      <Card
                        size="small"
                        hoverable
                        onClick={() => handleToolToggle(t.value)}
                        style={{
                          cursor: 'pointer',
                          border: selected ? '2px solid #1677ff' : '1px solid #d9d9d9',
                          backgroundColor: selected ? '#f0f8ff' : '#ffffff',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontWeight: 600 }}>
                              <span style={{ marginRight: 8 }}>{t.icon}</span>
                              {t.label}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>{t.description}</Text>
                          </div>
                          {selected && <CheckOutlined style={{ color: '#1677ff' }} />}
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
            {picker.type === 'databases' && (
              <Row gutter={[12, 12]}>
                {AVAILABLE_DATABASES.map((d) => {
                  const selected = equippedDatabases.includes(d.value);
                  return (
                    <Col span={12} key={d.value}>
                      <Card
                        size="small"
                        hoverable
                        onClick={() => handleDatabaseToggle(d.value)}
                        style={{
                          cursor: 'pointer',
                          border: selected ? '2px solid #1677ff' : '1px solid #d9d9d9',
                          backgroundColor: selected ? '#f0f8ff' : '#ffffff',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontWeight: 600 }}>
                              <span style={{ marginRight: 8 }}>{d.icon}</span>
                              {d.label}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>{d.description}</Text>
                          </div>
                          {selected && <CheckOutlined style={{ color: '#1677ff' }} />}
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Modal>
        )}

        </>
      )}

      {mode === 'edge' && edge && (
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item label="源节点">
            <Input value={allNodes.find((n) => n.id === edge.source)?.name || edge.source} disabled />
          </Form.Item>
          <Form.Item label="目标节点">
            <Input value={allNodes.find((n) => n.id === edge.target)?.name || edge.target} disabled />
          </Form.Item>
          <Form.Item label="连接类型" name="type">
            <Select disabled>
              <Option value="hard">Hard</Option>
              <Option value="soft" disabled>Soft（暂未实现）</Option>
            </Select>
          </Form.Item>
          <Form.Item label="消息延迟 (tick)" name="delay">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="优先级" name="priority">
            <Select>
              <Option value="high">高</Option>
              <Option value="normal">普通</Option>
              <Option value="low">低</Option>
            </Select>
          </Form.Item>
          <Form.Item label="描述" name="description">
            <TextArea rows={3} placeholder="连接用途描述" />
          </Form.Item>
          <Form.Item shouldUpdate={(prev, cur) => prev.type !== cur.type} noStyle>
            {({ getFieldValue }) =>
              getFieldValue('type') === 'soft' ? (
                <Form.Item label="条件" name="condition" rules={[{ required: true, message: '请输入条件' }]}> 
                  <TextArea rows={2} placeholder="触发条件（暂未实现）" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
};

export default NodeEdgeInspector;
