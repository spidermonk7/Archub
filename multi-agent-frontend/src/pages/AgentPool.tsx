import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Card, Button, Typography, Tag, Space, Spin, Row, Col, Input, Select, message } from 'antd';
import { RobotOutlined, SearchOutlined, PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loadAgentPool, organizeAgentsByCategory, AgentPoolItem, AgentPoolCategory } from '../utils/agentPool';
import './AgentPool.css';

const { Content } = Layout;
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

  const filterAgents = useCallback(() => {
    let filtered = agents;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(agent => agent.category === selectedCategory);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(searchLower) ||
        agent.description.toLowerCase().includes(searchLower) ||
        agent.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    setFilteredAgents(filtered);
  }, [agents, searchTerm, selectedCategory]);

  useEffect(() => {
    filterAgents();
  }, [filterAgents]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentPool = await loadAgentPool();
      const categoryData = organizeAgentsByCategory(agentPool);

      setAgents(agentPool);
      setCategories(categoryData);
      setFilteredAgents(agentPool);
    } catch (error) {
      message.error('Failed to load agent pool');
      console.error('Failed to load agent pool:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustom = () => {
    navigate('/builder');
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Layout className="agent-pool">
        <Content className="agent-pool-loading">
          <div className="loading-shell glass">
            <Spin size="large" />
            <Paragraph className="loading-copy">Loading agent pool…</Paragraph>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="agent-pool">
      <div className="agent-pool-hero glass">
        <div className="hero-inner">
          <div className="hero-text">
            <Tag className="hero-tag" bordered={false}>Agent Registry</Tag>
            <Title level={2}>Agent Pool</Title>
            <Paragraph type="secondary">
              Discover trained specialist agents and quickly assemble a workflow that fits your use case.
            </Paragraph>
            <Space size="middle" className="hero-buttons" wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={handleGoBack}>
                Back to Home
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateCustom}
              >
                Create Custom Agent
              </Button>
            </Space>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-value">{agents.length}</span>
              <span className="stat-label">Total agents</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{categories.length}</span>
              <span className="stat-label">Categories</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{filteredAgents.length}</span>
              <span className="stat-label">Matching results</span>
            </div>
          </div>
        </div>
      </div>

      <Content className="agent-pool-content">
        <div className="content-shell">
          <section className="filter-panel glass-soft">
            <div className="filter-grid">
              <Search
                placeholder="Search by agent name, description or tag"
                allowClear
                onSearch={value => setSearchTerm(value)}
                onChange={e => setSearchTerm(e.target.value)}
                value={searchTerm}
                enterButton={<SearchOutlined />}
              />
              <Select
                value={selectedCategory}
                onChange={value => setSelectedCategory(value)}
              >
                <Option value="all">All categories</Option>
                {categories.map(category => (
                  <Option key={category.name} value={category.name}>
                    {category.name}
                  </Option>
                ))}
              </Select>
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
              >
                Reset filters
              </Button>
            </div>
            <div className="filter-footer">
              <Text type="secondary">
                Showing <Text strong>{filteredAgents.length}</Text> agents
              </Text>
              <Text type="secondary">
                Agent categories <Text strong>{categories.length}</Text>
              </Text>
            </div>
          </section>

          <section className="agents-section">
            {filteredAgents.length === 0 ? (
              <div className="empty-state glass">
                <RobotOutlined className="empty-icon" />
                <Title level={3}>No matching agents</Title>
                <Paragraph>Try adjusting the search term or selecting another category.</Paragraph>
                <Button type="primary" onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}>
                  Reset filters
                </Button>
              </div>
            ) : (
              <Row gutter={[24, 24]}>
                {filteredAgents.map(agent => (
                  <Col key={agent.id} xs={24} sm={12} lg={8} xl={6}>
                    <Card className="agent-card" hoverable>
                      <div className="agent-card__header">
                        <div className="agent-avatar">
                          <RobotOutlined />
                        </div>
                        <div className="agent-card__title">
                          <Title level={4}>{agent.name}</Title>
                          <Tag bordered={false} className="version-tag">
                            v{agent.version}
                          </Tag>
                        </div>
                      </div>
                      <div className="agent-card__body">
                        <Paragraph ellipsis={{ rows: 3, tooltip: agent.description }}>
                          {agent.description}
                        </Paragraph>
                      </div>
                      <div className="agent-card__meta">
                        <Tag bordered={false} className="category-pill">
                          {agent.category}
                        </Tag>
                        <div className="agent-tags">
                          {agent.tags.slice(0, 3).map(tag => (
                            <Tag bordered={false} key={tag}>
                              #{tag}
                            </Tag>
                          ))}
                          {agent.tags.length > 3 && (
                            <Tag bordered={false} className="tag-more">
                              +{agent.tags.length - 3}
                            </Tag>
                          )}
                        </div>
                        <div className="agent-config">
                          <Text type="secondary">Model: {agent.config.llmModel}</Text>
                          <Text type="secondary">Input: {agent.config.inputDataType}</Text>
                          <Text type="secondary">Output: {agent.config.outputDataType}</Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </section>

          {filteredAgents.length > 0 && selectedCategory === 'all' && (
            <section className="categories-section">
              <Title level={3}>Browse by category</Title>
              <Row gutter={[18, 18]}>
                {categories.map(category => (
                  <Col key={category.name} xs={24} sm={12} md={8} lg={6}>
                    <Card
                      className="category-card"
                      hoverable
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      <div className="category-card__body">
                        <Title level={4}>{category.name}</Title>
                        <Text type="secondary">
                          {category.agents.length} agents
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </section>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default AgentPool;
