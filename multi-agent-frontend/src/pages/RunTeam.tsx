import React from 'react';
import { Layout, Card, Button, Space, Typography, Result } from 'antd';
import { ArrowLeftOutlined, BuildOutlined, TeamOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './RunTeam.css';

const { Header, Content } = Layout;
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
      <Header className="run-team-header">
        <div className="header-content">
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBackToHome}
              type="text"
              className="back-button"
            >
              返回首页
            </Button>
            <Title level={2} className="page-title">
              <PlayCircleOutlined /> Run Team
            </Title>
          </Space>
        </div>
      </Header>

      <Content className="run-team-content">
        <div className="content-container">
          <Result
            icon={<PlayCircleOutlined className="result-icon" />}
            title="团队运行页面"
            subTitle="这里将是智能体团队的运行环境。功能正在开发中..."
            extra={
              <Space direction="vertical" size="large" className="navigation-section">
                <Paragraph>选择下一步操作：</Paragraph>
                <Space size="middle" wrap>
                  <Button 
                    type="primary" 
                    icon={<BuildOutlined />} 
                    onClick={handleBackToBuilder}
                    size="large"
                  >
                    返回构建器
                  </Button>
                  <Button 
                    icon={<TeamOutlined />} 
                    onClick={handleBackToPool}
                    size="large"
                  >
                    查看团队池
                  </Button>
                </Space>
              </Space>
            }
          />

          <div className="feature-preview">
            <Card className="preview-card">
              <Title level={4}>即将推出的功能</Title>
              <ul className="feature-list">
                <li>实时监控智能体状态</li>
                <li>查看团队协作过程</li>
                <li>控制团队执行流程</li>
                <li>分析团队性能指标</li>
                <li>调试和优化团队配置</li>
              </ul>
            </Card>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default RunTeam;