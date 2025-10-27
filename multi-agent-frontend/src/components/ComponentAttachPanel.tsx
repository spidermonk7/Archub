import React, { useMemo } from 'react';
import { Drawer, Tabs, Card, Row, Col, Typography, Tag } from 'antd';
import './ComponentAttachPanel.css';
const { Text } = Typography;

export interface ComponentAttachPanelProps {
  visible: boolean;
  onClose: () => void;
}

type ComponentDrag = { type: 'memory' | 'tool'; key: string; payload?: any };

const AVAILABLE_TOOLS = [
  { value: 'math', label: 'Math Calculator', description: '执行数学计算和公式求解', icon: '🧮' },
  { value: 'code_executor', label: 'Code Executor', description: '执行Python代码并返回结果', icon: '💻' },
  { value: 'custom_tool', label: 'Create Your Own Tool', description: '创建自定义工具以扩展智能体能力', icon: '🔧', comingSoon: true },
];

const ComponentAttachPanel: React.FC<ComponentAttachPanelProps> = ({ visible, onClose }) => {
  const memoryCards = useMemo(() => ([
    { key: 'simple', title: 'Simple Memory', description: '轻量级KV记忆，用于短期上下文', icon: '🧠', comingSoon: false },
    { key: 'vector', title: 'Vector Memory', description: '向量检索记忆（即将推出）', icon: '📚', comingSoon: true },
  ]), []);

  const onDragStart = (e: React.DragEvent, data: ComponentDrag) => {
    e.dataTransfer.setData('application/x-archub-component', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const memoryTab = (
    <Row gutter={[12, 12]}>
      {memoryCards.map(card => (
        <Col span={24} key={card.key}>
          <Card
            size="small"
            hoverable={!card.comingSoon}
            draggable={!card.comingSoon}
            onDragStart={(e) => onDragStart(e, { type: 'memory', key: card.key, payload: { type: card.key } })}
            className={`component-card ${card.comingSoon ? 'coming-soon' : ''}`}
          >
            <div className="component-row">
              <div className="component-main">
                <span className="component-icon">{card.icon}</span>
                <div className="component-text">
                  <div className="component-title">{card.title}</div>
                  <Text type="secondary" className="component-desc">{card.description}</Text>
                </div>
              </div>
              {card.comingSoon && <Tag>即将推出</Tag>}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const toolsTab = (
    <Row gutter={[12, 12]}>
      {AVAILABLE_TOOLS.map(tool => (
        <Col span={24} key={tool.value}>
          <Card
            size="small"
            hoverable={!tool.comingSoon}
            draggable={!tool.comingSoon}
            onDragStart={(e) => onDragStart(e, { type: 'tool', key: tool.value })}
            className={`component-card ${tool.comingSoon ? 'coming-soon' : ''}`}
          >
            <div className="component-row">
              <div className="component-main">
                <span className="component-icon">{tool.icon}</span>
                <div className="component-text">
                  <div className="component-title">{tool.label}</div>
                  <Text type="secondary" className="component-desc">{tool.description}</Text>
                </div>
              </div>
              {tool.comingSoon && <Tag>即将推出</Tag>}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  return (
    <Drawer
      title={<span>Attach Component</span>}
      placement="right"
      width={420}
      onClose={onClose}
      open={visible}
      mask={false}
    >
      <div className="attach-panel">
        <Tabs
          defaultActiveKey="memory"
          items={[
            { key: 'memory', label: 'Memory', children: memoryTab },
            { key: 'tools', label: 'Tools', children: toolsTab },
            { key: 'others', label: 'Others', children: <div>更多组件类型，即将推出…</div>, disabled: true as any },
          ]}
        />
        <div className="hint">
          <Text type="secondary">将上方组件拖拽到画布中的目标节点，即可完成添加。</Text>
        </div>
      </div>
    </Drawer>
  );
};

export default ComponentAttachPanel;
