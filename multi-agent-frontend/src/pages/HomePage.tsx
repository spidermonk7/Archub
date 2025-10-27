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

  const actionCards = [
    {
      key: 'builder',
      title: '构建多智能体团队',
      subtitle: '从画布开始，定义节点、智能体和工作流逻辑',
      icon: <PlusOutlined />,
      cta: '立即创建',
      onClick: handleBuildNewTeam,
      tone: 'violet',
    },
    {
      key: 'team-pool',
      title: '精挑细选的团队集',
      subtitle: '浏览最佳实践和现成模板，快速迭代你的系统',
      icon: <TeamOutlined />,
      cta: '浏览团队',
      onClick: handleExploreTeamPool,
      tone: 'cyan',
    },
    {
      key: 'agent-pool',
      title: '智能体超级矩阵',
      subtitle: '探索预构建的专家智能体，直接拖拽到你的图谱',
      icon: <RobotOutlined />,
      cta: '查看智能体',
      onClick: () => navigate('/agent-pool'),
      tone: 'blue',
    },
    {
      key: 'toolkit',
      title: '扩展工具箱',
      subtitle: '更多工作流工具和插件正在赶来，敬请期待',
      icon: <ToolOutlined />,
      cta: '即将上线',
      disabled: true,
      tone: 'amber',
    },
  ];

  const signalCards = [
    { label: '已编排智能体', value: '120+', accent: 'violet' },
    { label: '标准流程模板', value: '45', accent: 'cyan' },
    { label: '实时执行成功率', value: '98.6%', accent: 'emerald' },
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
                构建、调度与部署下一代多智能体团队
              </Title>
              <Paragraph className="hero-subtitle">
                可视化图谱构建 + 智能体市场 + 实时运行监控，让你的多智能体系统拥有类 Scale.com 的极致体验。
              </Paragraph>
              <Space size="middle" className="hero-actions" wrap>
                <Button type="primary" size="large" icon={<RocketOutlined />} onClick={handleBuildNewTeam}>
                  立即开始构建
                </Button>
                <Button size="large" onClick={handleExploreTeamPool} icon={<TeamOutlined />}>
                  浏览优秀团队
                </Button>
              </Space>
            </div>
            <div className="hero-side">
              <div className="hero-highlights">
                <div className="highlight-card">
                  <ExperimentOutlined className="highlight-icon" />
                  <div>
                    <span className="highlight-label">实时演算引擎</span>
                    <span className="highlight-value">自适应推理链</span>
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
                    {card.key === 'toolkit' ? 'Coming Soon' : 'Instant Launch'}
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
                选择一个入口，即刻开启你的多智能体旅程。
              </Paragraph>
              <Paragraph type="secondary" className="footer-sub">
                构建流程即保存为可运行团队，随时部署至运行器。
              </Paragraph>
            </Space>
          </section>
        </div>
      </Content>
    </Layout>
  );
};

export default HomePage;
