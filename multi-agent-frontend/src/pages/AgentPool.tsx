import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, Typography, Tag, Space, Spin, Row, Col, Input, Select, message } from 'antd';
import { RobotOutlined, SearchOutlined, PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loadAgentPool, organizeAgentsByCategory, AgentPoolItem, AgentPoolCategory } from '../utils/agentPool';
import './AgentPool.css';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const AgentPool: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentPoolItem[]>([]);
  const [categories, setCategories] = useState<AgentPoolCategory[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<AgentPoolItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    filterAgents();
  }, [agents, searchTerm, selectedCategory]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentPool = await loadAgentPool();
      const categoryData = organizeAgentsByCategory(agentPool);
      
      setAgents(agentPool);
      setCategories(categoryData);
      setFilteredAgents(agentPool);
    } catch (error) {
      message.error('加载智能体池失败');
      console.error('Failed to load agent pool:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAgents = () => {
    let filtered = agents;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(agent => agent.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(searchLower) ||
        agent.description.toLowerCase().includes(searchLower) ||
        agent.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    setFilteredAgents(filtered);
  };

  const handleUseAgent = (agent: AgentPoolItem) => {
    // 将选中的智能体信息传递给构建器页面
    navigate('/builder', { 
      state: { 
        preselectedAgent: agent,
        action: 'add-agent'
      } 
    });
  };

  const handleCreateCustom = () => {
    navigate('/builder');
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const getAllCategories = () => {
    const categoryNames = categories.map(cat => cat.name);
    return ['all', ...categoryNames];
  };

  if (loading) {
    return (
      <Layout className="agent-pool">
        <Content className="loading-content">
          <div className="loading-container">
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>正在加载智能体池...</Paragraph>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="agent-pool">
      <Header className="agent-pool-header">
        <div className="header-content">
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleGoBack}
              size="large"
            >
              返回首页
            </Button>
            <div className="header-title">
              <RobotOutlined className="header-icon" />
              <Title level={2} style={{ margin: 0, color: 'white' }}>
                Agent Pool
              </Title>
            </div>
          </Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreateCustom}
            size="large"
          >
            创建自定义智能体
          </Button>
        </div>
      </Header>

      <Content className="agent-pool-content">
        <div className="content-container">
          {/* 搜索和筛选区域 */}
          <div className="filter-section">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="搜索智能体名称、描述或标签..."
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="large"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  size="large"
                  style={{ width: '100%' }}
                  placeholder="选择分类"
                >
                  <Option value="all">全部分类</Option>
                  {categories.map(category => (
                    <Option key={category.name} value={category.name}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={24} md={10}>
                <div className="stats-info">
                  <Text type="secondary">
                    共找到 <Text strong>{filteredAgents.length}</Text> 个智能体
                    {selectedCategory !== 'all' && ` (分类: ${selectedCategory})`}
                  </Text>
                </div>
              </Col>
            </Row>
          </div>

          {/* 智能体卡片区域 */}
          <div className="agents-grid">
            {filteredAgents.length === 0 ? (
              <div className="empty-state">
                <RobotOutlined className="empty-icon" />
                <Title level={3}>未找到匹配的智能体</Title>
                <Paragraph>
                  尝试调整搜索条件或选择不同的分类
                </Paragraph>
                <Button type="primary" onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}>
                  重置筛选
                </Button>
              </div>
            ) : (
              <Row gutter={[24, 24]}>
                {filteredAgents.map(agent => (
                  <Col key={agent.id} xs={24} sm={12} lg={8} xl={6}>
                    <Card
                      className="agent-card"
                      hoverable
                      cover={
                        <div className="agent-card-cover">
                          <RobotOutlined className="agent-icon" />
                        </div>
                      }
                      actions={[
                        <Button 
                          type="primary" 
                          onClick={() => handleUseAgent(agent)}
                          block
                        >
                          使用此智能体
                        </Button>
                      ]}
                    >
                      <Card.Meta
                        title={
                          <div className="agent-title">
                            <Text strong>{agent.name}</Text>
                            <Tag color="blue" className="version-tag">
                              v{agent.version}
                            </Tag>
                          </div>
                        }
                        description={
                          <div className="agent-description">
                            <Paragraph ellipsis={{ rows: 2, tooltip: agent.description }}>
                              {agent.description}
                            </Paragraph>
                          </div>
                        }
                      />
                      
                      <div className="agent-details">
                        <div className="agent-category">
                          <Tag color="geekblue">{agent.category}</Tag>
                        </div>
                        
                        <div className="agent-tags">
                          {agent.tags.slice(0, 2).map(tag => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                          {agent.tags.length > 2 && (
                            <Tag color="default">
                              +{agent.tags.length - 2}
                            </Tag>
                          )}
                        </div>
                        
                        <div className="agent-config">
                          <Space direction="vertical" size="small">
                            <Text type="secondary">
                              模型: {agent.config.llmModel}
                            </Text>
                            <Text type="secondary">
                              输入: {agent.config.inputDataType}
                            </Text>
                            <Text type="secondary">
                              输出: {agent.config.outputDataType}
                            </Text>
                          </Space>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>

          {/* 分类展示区域 */}
          {filteredAgents.length > 0 && selectedCategory === 'all' && (
            <div className="categories-section">
              <Title level={3}>按分类浏览</Title>
              <Row gutter={[16, 16]}>
                {categories.map(category => (
                  <Col key={category.name} xs={24} sm={12} md={8} lg={6}>
                    <Card 
                      className="category-card"
                      hoverable
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      <div className="category-info">
                        <Title level={4}>{category.name}</Title>
                        <Text type="secondary">
                          {category.agents.length} 个智能体
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default AgentPool;