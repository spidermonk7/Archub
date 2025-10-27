import React from 'react';
import { Layout, Card, Button, Space, Typography } from 'antd';
import { PlusOutlined, TeamOutlined, RocketOutlined, RobotOutlined, ToolOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

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

  const handleExploreAgentPool = () => {
    navigate('/agent-pool');
  };

  const handleExploreToolkitPool = () => {
    // 暂时显示提示，后续可以创建专门的Toolkit页面
    console.log('Toolkit Pool - Coming Soon');
  };

  return (
    <Layout className="homepage">
      <Content className="homepage-content">
        <div className="homepage-container">
          <div className="homepage-header">
            <RocketOutlined className="homepage-icon" />
            <Title level={1}>Agent Team Builder</Title>
            <Paragraph className="homepage-subtitle">
              构建和管理你的多智能体系统
            </Paragraph>
          </div>

          <div className="homepage-cards">
            <Card
              className="option-card build-card"
              hoverable
              cover={
                <div className="card-cover build-cover">
                  <PlusOutlined className="card-icon" />
                </div>
              }
              actions={[
                <Button 
                  type="primary" 
                  size="large" 
                  onClick={handleBuildNewTeam}
                  className="card-button"
                >
                  开始构建
                </Button>
              ]}
            >
              <Card.Meta
                title="Build New Team"
                description="从零开始创建一个新的多智能体团队系统，设计节点和连接，配置智能体行为"
              />
            </Card>

            <Card
              className="option-card explore-card"
              hoverable
              cover={
                <div className="card-cover explore-cover">
                  <TeamOutlined className="card-icon" />
                </div>
              }
              actions={[
                <Button 
                  size="large" 
                  onClick={handleExploreTeamPool}
                  className="card-button"
                >
                  浏览团队
                </Button>
              ]}
            >
              <Card.Meta
                title="Explore Team Pool"
                description="查看和管理已创建的智能体团队，从现有配置中选择合适的团队进行运行"
              />
            </Card>

            <Card
              className="option-card agent-pool-card"
              hoverable
              cover={
                <div className="card-cover agent-pool-cover">
                  <RobotOutlined className="card-icon" />
                </div>
              }
              actions={[
                <Button 
                  size="large" 
                  onClick={handleExploreAgentPool}
                  className="card-button"
                >
                  浏览智能体
                </Button>
              ]}
            >
              <Card.Meta
                title="Explore Agent Pool"
                description="探索预配置的专业智能体，包括数据分析、写作助手、代码审查等各类专家"
              />
            </Card>

            <Card
              className="option-card toolkit-card"
              hoverable
              cover={
                <div className="card-cover toolkit-cover">
                  <ToolOutlined className="card-icon" />
                </div>
              }
              actions={[
                <Button 
                  size="large" 
                  onClick={handleExploreToolkitPool}
                  className="card-button"
                  disabled
                >
                  即将推出
                </Button>
              ]}
            >
              <Card.Meta
                title="Explore Toolkit Pool"
                description="发现各种强大的工具集合，为您的智能体提供更多能力和功能扩展"
              />
            </Card>
          </div>

          <div className="homepage-footer">
            <Space direction="vertical" align="center">
              <Paragraph type="secondary">
                选择一个选项开始使用 Agent Team Builder
              </Paragraph>
            </Space>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default HomePage;