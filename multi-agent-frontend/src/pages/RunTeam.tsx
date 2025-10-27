import React from 'react';
import { Layout, Card, Button, Space, Typography, Tag } from 'antd';
import { ArrowLeftOutlined, BuildOutlined, TeamOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './RunTeam.css';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const RunTeam: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToBuilder = () => {
    navigate('/builder');
  };

  const handleBackToPool = () => {
    navigate('/team-pool');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <Layout className="run-team">
      <section className="run-team-hero glass">
        <div className="hero-meta">
          <Tag className="hero-tag" bordered={false}>Live Execution</Tag>
          <Title level={2}>
            <PlayCircleOutlined /> Run Team
          </Title>
          <Paragraph type="secondary">
            高级运行控制台正在构建中。我们将在这里提供团队的执行监控、调度和分析能力。
          </Paragraph>
        </div>
        <Space size="middle" wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBackToHome}>
            返回首页
          </Button>
          <Button icon={<TeamOutlined />} onClick={handleBackToPool}>
            查看团队池
          </Button>
          <Button type="primary" icon={<BuildOutlined />} onClick={handleBackToBuilder}>
            返回构建器
          </Button>
        </Space>
      </section>

      <Content className="run-team-content">
        <div className="run-team-shell">
          <div className="placeholder-card glass">
            <div className="placeholder-icon">
              <PlayCircleOutlined />
            </div>
            <Title level={3}>运行器模块即将上线</Title>
            <Paragraph type="secondary">
              我们正在打造一个可以实时追踪消息流、智能体状态与性能曲线的运行面板。敬请期待以下能力：
            </Paragraph>
            <div className="feature-grid">
              <div className="feature-chip">实时执行时间轴</div>
              <div className="feature-chip">消息事件流</div>
              <div className="feature-chip">节点性能指标</div>
              <div className="feature-chip">中断与回滚控制</div>
            </div>
            <Space size="middle" wrap className="placeholder-actions">
              <Button type="primary" icon={<BuildOutlined />} onClick={handleBackToBuilder}>
                继续完善团队
              </Button>
              <Button icon={<TeamOutlined />} onClick={handleBackToPool}>
                浏览现有团队
              </Button>
            </Space>
          </div>

          <div className="roadmap-section">
            <Title level={4}>功能路线图</Title>
            <div className="roadmap-grid">
              {[
                {
                  title: '运行监控',
                  points: ['节点 CPU 与上下文跟踪', '事件日志与消息重放']
                },
                {
                  title: '调试工具',
                  points: ['断点式运行控制', '节点单步调试与输出测试']
                },
                {
                  title: '性能洞察',
                  points: ['执行耗时分析', '瓶颈节点自动诊断']
                }
              ].map(item => (
                <Card key={item.title} className="roadmap-card">
                  <Title level={5}>{item.title}</Title>
                  <ul>
                    {item.points.map(point => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default RunTeam;
