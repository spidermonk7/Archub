import React from 'react';
import { Layout, Card, Button, Space, Typography, Tag } from 'antd';
import { PlusOutlined, TeamOutlined, RocketOutlined, RobotOutlined, ToolOutlined, ThunderboltOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import FloatingBackground from '../components/FloatingBackground';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const handleBuildNewTeam = () => {
    navigate('/builder');
  };

  const handleExploreTeamPool = () => {
    navigate('/team-pool');
  };

  type ActionCard = {
    key: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    cta: string;
    tag: string;
    onClick: () => void;
    tone: string;
    disabled?: boolean;
  };

  const actionCards: ActionCard[] = [
    {
      key: 'builder',
      title: 'Build Multi-Agent Teams',
      subtitle: 'Start from the canvas to define nodes, agents, and workflow logic',
      icon: <PlusOutlined />,
      cta: 'Create Now',
      tag: 'Instant Launch',
      onClick: handleBuildNewTeam,
      tone: 'violet',
    },
    {
      key: 'team-pool',
      title: 'Curated Team Library',
      subtitle: 'Browse best practices and ready-made templates to iterate quickly',
      icon: <TeamOutlined />,
      cta: 'Browse Teams',
      tag: 'Instant Launch',
      onClick: handleExploreTeamPool,
      tone: 'cyan',
    },
    {
      key: 'agent-pool',
      title: 'Agent Super Matrix',
      subtitle: 'Explore prebuilt expert agents and drag them straight into your graph',
      icon: <RobotOutlined />,
      cta: 'View Agents',
      tag: 'Instant Launch',
      onClick: () => navigate('/agent-pool'),
      tone: 'blue',
    },
    {
      key: 'toolkit',
      title: 'Extended Toolkit',
      subtitle: 'Explore curated workflow tools and integrations ready to plug in',
      icon: <ToolOutlined />,
      cta: 'Explore Tools',
      tag: 'Instant Launch',
      onClick: () => navigate('/tool-pool'),
      tone: 'amber',
    },
  ];

  const signalCards = [
    { label: 'Agents Orchestrated', value: '120+', accent: 'violet' },
    { label: 'Standard Flow Templates', value: '45', accent: 'cyan' },
    { label: 'Real-time Execution Success', value: '98.6%', accent: 'emerald' },
  ];

  return (
    <Layout className="homepage">
      <Content className="homepage-content">
        <FloatingBackground />
        <div className="homepage-container">
          <section className="hero-section glass">
            <div className="hero-content">
              <Tag icon={<ThunderboltOutlined />} className="hero-badge" color="default">
                Agentic Workflow OS
              </Tag>
              <Title level={1} className="hero-title">
                Build, orchestrate, and deploy next-gen multi-agent teams
              </Title>
              <Paragraph className="hero-subtitle">
                Visual graph builder + agent marketplace + real-time run monitoring deliver a Scale.com-like experience for your multi-agent system.
              </Paragraph>
              <Space size="middle" className="hero-actions" wrap>
                <Button type="primary" size="large" icon={<RocketOutlined />} onClick={handleBuildNewTeam}>
                  Start Building Now
                </Button>
                <Button size="large" onClick={handleExploreTeamPool} icon={<TeamOutlined />}>
                  Explore Top Teams
                </Button>
              </Space>
            </div>
            <div className="hero-side">
              <div className="hero-highlights">
                <div className="highlight-card">
                  <ExperimentOutlined className="highlight-icon" />
                  <div>
                    <span className="highlight-label">Real-time Execution Engine</span>
                    <span className="highlight-value">Adaptive Reasoning Chains</span>
                  </div>
                </div>
                <div className="signal-grid">
                  {signalCards.map(signal => (
                    <div key={signal.label} className={`signal-card accent-${signal.accent}`}>
                      <span className="signal-value">{signal.value}</span>
                      <span className="signal-label">{signal.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="cards-grid">
            {actionCards.map(card => (
              <Card
                key={card.key}
                className={`option-card accent-${card.tone}`}
                hoverable={!card.disabled}
                onClick={!card.disabled ? card.onClick : undefined}
              >
                <div className="option-card-header">
                  <div className="card-icon-wrap">
                    <span className="card-icon">{card.icon}</span>
                  </div>
                  <Tag bordered={false} className="card-tag">
                    {card.tag}
                  </Tag>
                </div>
                <div className="option-card-body">
                  <Title level={3}>{card.title}</Title>
                  <Paragraph>{card.subtitle}</Paragraph>
                </div>
                <div className="option-card-footer">
                  <Button
                    type={card.key === 'builder' ? 'primary' : 'default'}
                    size="large"
                    onClick={card.onClick}
                    disabled={card.disabled}
                  >
                    {card.cta}
                  </Button>
                </div>
              </Card>
            ))}
          </section>

          <section className="footer-note">
            <Space direction="vertical" align="center" size="small">
              <Paragraph type="secondary">
                Pick an entry point and start your multi-agent journey instantly.
              </Paragraph>
              <Paragraph type="secondary" className="footer-sub">
                Every flow saves as a runnable team, ready to deploy to the runner anytime.
              </Paragraph>
            </Space>
          </section>
        </div>
      </Content>
    </Layout>
  );
};

export default HomePage;
