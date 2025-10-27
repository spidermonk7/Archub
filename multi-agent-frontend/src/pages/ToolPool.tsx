import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Card,
  Button,
  Typography,
  Tag,
  Space,
  Spin,
  Row,
  Col,
  Input,
  Select,
  message
} from 'antd';
import {
  ToolOutlined,
  SearchOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  loadToolPool,
  organizeToolsByCategory,
  ToolPoolItem,
  ToolPoolCategory
} from '../utils/toolPool';
import './ToolPool.css';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const ToolPool: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<ToolPoolItem[]>([]);
  const [categories, setCategories] = useState<ToolPoolCategory[]>([]);
  const [filteredTools, setFilteredTools] = useState<ToolPoolItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadTools();
  }, []);

  const filterTools = useCallback(() => {
    let filtered = tools;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tool => tool.category === selectedCategory);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description.toLowerCase().includes(searchLower) ||
        tool.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        tool.capabilities.some(cap => cap.toLowerCase().includes(searchLower))
      );
    }

    setFilteredTools(filtered);
  }, [tools, searchTerm, selectedCategory]);

  useEffect(() => {
    filterTools();
  }, [filterTools]);

  const loadTools = async () => {
    try {
      setLoading(true);
      const toolPool = await loadToolPool();
      const categoryData = organizeToolsByCategory(toolPool);

      setTools(toolPool);
      setCategories(categoryData);
      setFilteredTools(toolPool);
    } catch (error) {
      message.error('Failed to load tool pool');
      console.error('Failed to load tool pool:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBuilder = () => {
    navigate('/builder');
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Layout className="tool-pool">
        <Content className="tool-pool-loading">
          <div className="loading-shell glass">
            <Spin size="large" />
            <Paragraph className="loading-copy">Loading tool pool…</Paragraph>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="tool-pool">
      <div className="tool-pool-hero glass">
        <div className="hero-inner">
          <div className="hero-text">
            <Tag className="hero-tag" bordered={false}>
              Tool Catalog
            </Tag>
            <Title level={2}>Tool Pool</Title>
            <Paragraph type="secondary">
              Explore workflow-ready tools and wire them into your graph without leaving the builder.
            </Paragraph>
            <Space size="middle" className="hero-buttons" wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={handleGoBack}>
                Back to Home
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenBuilder}>
                Open Builder
              </Button>
            </Space>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-value">{tools.length}</span>
              <span className="stat-label">Total tools</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{categories.length}</span>
              <span className="stat-label">Categories</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{filteredTools.length}</span>
              <span className="stat-label">Matching results</span>
            </div>
          </div>
        </div>
      </div>

      <Content className="tool-pool-content">
        <div className="content-shell">
          <section className="filter-panel glass-soft">
            <div className="filter-grid">
              <Search
                placeholder="Search by tool, capability or tag"
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
                Showing <Text strong>{filteredTools.length}</Text> tools
              </Text>
              <Text type="secondary">
                Tool categories <Text strong>{categories.length}</Text>
              </Text>
            </div>
          </section>

          <section className="tools-section">
            {filteredTools.length === 0 ? (
              <div className="empty-state glass">
                <ThunderboltOutlined className="empty-icon" />
                <Title level={3}>No matching tools</Title>
                <Paragraph>Try changing the search term or selecting another category.</Paragraph>
                <Button
                  type="primary"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <Row gutter={[24, 24]}>
                {filteredTools.map(tool => (
                  <Col key={tool.id} xs={24} sm={12} lg={8} xl={6}>
                    <Card className="tool-card" hoverable>
                      <div className="tool-card__header">
                        <div className="tool-icon">
                          <ToolOutlined />
                        </div>
                        <div className="tool-card__title">
                          <Title level={4}>{tool.name}</Title>
                          <div className="tool-card__meta-line">
                            <Tag bordered={false} className="version-tag">
                              v{tool.version}
                            </Tag>
                            <Tag bordered={false} className="category-pill">
                              {tool.category}
                            </Tag>
                          </div>
                        </div>
                      </div>
                      <div className="tool-card__body">
                        <Paragraph ellipsis={{ rows: 3, tooltip: tool.description }}>
                          {tool.description}
                        </Paragraph>
                        <div className="tool-provider">
                          <Tag bordered={false} className="provider-tag">
                            {tool.provider}
                          </Tag>
                          <Text type="secondary">{tool.integration}</Text>
                        </div>
                        <div className="tool-capabilities">
                          {tool.capabilities.map(capability => (
                            <span key={capability} className="capability-chip">
                              {capability}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="tool-card__footer">
                        <div className="tool-footer-line">
                          <Text strong>{tool.requirements}</Text>
                          <Text type="secondary">{tool.bestFor}</Text>
                        </div>
                        <div className="tool-tags">
                          {tool.tags.map(tag => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </section>
        </div>
      </Content>
    </Layout>
  );
};

export default ToolPool;
