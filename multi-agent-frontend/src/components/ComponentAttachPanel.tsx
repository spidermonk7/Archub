import React, { useMemo } from 'react';
import { Drawer, Tabs, Card, Row, Col, Typography, Tag } from 'antd';
import { TOOL_OPTIONS } from '../utils/toolsRegistry';
import './ComponentAttachPanel.css';

const { Text } = Typography;

export interface ComponentAttachPanelProps {
  visible: boolean;
  onClose: () => void;
}

type ComponentDrag = { type: 'memory' | 'tool'; key: string; payload?: any };

const ComponentAttachPanel: React.FC<ComponentAttachPanelProps> = ({ visible, onClose }) => {
  const memoryCards = useMemo(() => ([
    { key: 'simple', title: 'Simple Memory', description: 'Lightweight key-value memory for short-term context.', icon: '🧠', comingSoon: false },
    { key: 'vector', title: 'Vector Memory', description: 'Vector-store retrieval memory (coming soon).', icon: '🗃️', comingSoon: true },
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
              {card.comingSoon && <Tag>Coming soon</Tag>}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const toolsTab = (
    <Row gutter={[12, 12]}>
      {TOOL_OPTIONS.map(tool => (
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
              {tool.comingSoon && <Tag>Coming soon</Tag>}
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
            { key: 'others', label: 'Others', children: <div>More component types are on the way.</div>, disabled: true as any },
          ]}
        />
        <div className="hint">
          <Text type="secondary">Drag a component above and drop it onto a node on the canvas to attach it.</Text>
        </div>
      </div>
    </Drawer>
  );
};

export default ComponentAttachPanel;
