import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Card, Button, Typography, Space, Tag, Spin, message } from 'antd';
import { ArrowLeftOutlined, TeamOutlined, CalendarOutlined, UserOutlined, LinkOutlined, RocketOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './TeamPool.css';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

interface TeamInfo {
  id: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  compiledAt: string;
  version: string;
  description?: string;
  configData?: any; // 存储完整的配置数据
}

const TeamPool: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  const API_BASE_URL = 'http://localhost:5000/api';

  // 检查API连接状态
  const checkApiConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        setApiStatus('connected');
        return true;
      } else {
        setApiStatus('disconnected');
        return false;
      }
    } catch (error) {
      setApiStatus('disconnected');
      return false;
    }
  }, []);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      // 首先尝试从API加载SourceFiles中的配置
      if (await checkApiConnection()) {
        const teams = await loadTeamsFromAPI();
        if (teams.length > 0) {
          setTeams(teams);
          setLoading(false);
          return;
        }
      }
      
      // 如果API不可用或没有文件，则从localStorage加载
      const teams = getSavedConfigs();
      setTeams(teams);
    } catch (error) {
      message.error('加载团队池失败');
      // 降级到localStorage
      const teams = getSavedConfigs();
      setTeams(teams);
    } finally {
      setLoading(false);
    }
  }, [checkApiConnection]);  // loadTeams 依赖 checkApiConnection

  useEffect(() => {
    checkApiConnection();
    loadTeams();
  }, [checkApiConnection, loadTeams]);

  // 从API加载数据库中的团队
  const loadTeamsFromAPI = async (): Promise<TeamInfo[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/teams`);
      const data = await response.json();
      
      if (data.success && data.teams) {
        const teams: TeamInfo[] = data.teams.map((team: any) => ({
          id: team.id,
          name: team.name,
          nodeCount: team.nodeCount,
          edgeCount: team.edgeCount,
          compiledAt: team.updatedAt,
          version: team.version,
          description: team.description,
          configData: team.configData
        }));
        
        console.log(`✅ 从数据库加载了 ${teams.length} 个团队`);
        return teams;
      }
      return [];
    } catch (error) {
      console.error('从API加载团队失败:', error);
      return [];
    }
  };

  // 从localStorage获取保存的配置信息
  const getSavedConfigs = (): TeamInfo[] => {
    try {
      const teams: TeamInfo[] = [];
      
      // 1. 检查最新编译的配置
      const savedConfig = localStorage.getItem('compiledGraphConfig');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        teams.push({
          id: config.metadata?.name || 'latest-team',
          name: config.metadata?.name || 'Latest Team',
          nodeCount: config.nodes?.length || 0,
          edgeCount: config.edges?.length || 0,
          compiledAt: config.metadata?.compiledAt || new Date().toISOString(),
          version: config.metadata?.version || '1.0',
          description: `包含 ${config.nodes?.length || 0} 个节点和 ${config.edges?.length || 0} 个连接的多智能体系统`,
          configData: config
        });
      }
      
      // 2. 检查保存的团队历史（如果有）
      const teamHistory = localStorage.getItem('teamHistory');
      if (teamHistory) {
        const history = JSON.parse(teamHistory);
        if (Array.isArray(history)) {
          history.forEach((config, index) => {
            // 避免重复添加最新的配置
            const teamId = config.metadata?.name || `team-${index}`;
            if (!teams.find(t => t.id === teamId)) {
              teams.push({
                id: teamId,
                name: config.metadata?.name || `Team ${index + 1}`,
                nodeCount: config.nodes?.length || 0,
                edgeCount: config.edges?.length || 0,
                compiledAt: config.metadata?.compiledAt || new Date().toISOString(),
                version: config.metadata?.version || '1.0',
                description: `包含 ${config.nodes?.length || 0} 个节点和 ${config.edges?.length || 0} 个连接的多智能体系统`,
                configData: config
              });
            }
          });
        }
      }
      
      // 按创建时间倒序排列
      return teams.sort((a, b) => new Date(b.compiledAt).getTime() - new Date(a.compiledAt).getTime());
    } catch (error) {
      console.error('Failed to load saved configs:', error);
      return [];
    }
  };

  const handleRunTeam = async (team: TeamInfo) => {
    try {
      // 使用新的API加载团队到后端
      const response = await fetch(`${API_BASE_URL}/load-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId: team.id }),
      });

      if (response.ok) {
        message.success(`团队 ${team.name} 已加载到后端`);
        navigate('/python-runner');
      } else {
        // 降级：使用原来的sessionStorage方式
        if (team.configData) {
          sessionStorage.setItem('selectedTeamConfig', JSON.stringify(team.configData));
          sessionStorage.setItem('selectedTeamName', team.name);
          navigate('/python-runner');
        }
      }
    } catch (error) {
      // 降级：使用原来的sessionStorage方式
      console.warn('API加载失败，使用本地方式:', error);
      if (team.configData) {
        sessionStorage.setItem('selectedTeamConfig', JSON.stringify(team.configData));
        sessionStorage.setItem('selectedTeamName', team.name);
        navigate('/python-runner');
      }
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-CN');
  };

  const getTeamSize = (nodeCount: number) => {
    if (nodeCount <= 2) return '小型团队';
    if (nodeCount <= 5) return '中型团队';
    return '大型团队';
  };

  const getTeamSizeClass = (nodeCount: number) => {
    if (nodeCount <= 2) return 'small';
    if (nodeCount <= 5) return 'medium';
    return 'large';
  };
  return (
    <Layout className="team-pool">
      <div className="team-pool-hero glass">
        <div className="team-hero-inner">
          <div className="team-hero-text">
            <Tag className="hero-tag" bordered={false}>
              Team Orchestrator
            </Tag>
            <Title level={2}>
              <TeamOutlined /> Agent Team Pool
            </Title>
            <Paragraph type="secondary">
              管理与部署你的多智能体编排。配置文件同步自 SourceFiles 目录。
            </Paragraph>
            <Space size="middle" wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                返回首页
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadTeams}
                loading={loading}
              >
                刷新列表
              </Button>
            </Space>
          </div>
          <div className="team-hero-status">
            <Tag className={`api-pill ${apiStatus}`}>
              {apiStatus === 'connected' ? 'API Connected' : 'Offline Cache'}
            </Tag>
            <div className="hero-stat">
              <span className="stat-value">{teams.length}</span>
              <span className="stat-label">团队数量</span>
            </div>
          </div>
        </div>
      </div>

      <Content className="team-pool-content">
        <div className="team-content-shell">
          {loading ? (
            <div className="team-loading">
              <Spin size="large" />
              <Text type="secondary">正在加载团队信息...</Text>
            </div>
          ) : teams.length === 0 ? (
            <div className="empty-state glass">
              <Title level={3}>暂未创建团队</Title>
              <Paragraph type="secondary">
                请先在 Builder 中设计流程，或从 SourceFiles 目录加载配置文件。
              </Paragraph>
              <Space size="middle">
                <Button type="primary" onClick={() => navigate('/builder')}>
                  创建新团队
                </Button>
                <Button onClick={loadTeams} icon={<ReloadOutlined />}>
                  再试一次
                </Button>
              </Space>
            </div>
          ) : (
            <div className="teams-grid">
              {teams.map((team) => (
                <Card key={team.id} className="team-card" hoverable>
                  <div className="team-card__header">
                    <div>
                      <Title level={4}>{team.name}</Title>
                      <Tag className={`size-pill ${getTeamSizeClass(team.nodeCount)}`}>
                        {getTeamSize(team.nodeCount)}
                      </Tag>
                    </div>
                    <Tag className="version-badge">v{team.version}</Tag>
                  </div>

                  <Paragraph type="secondary" className="team-description" ellipsis={{ rows: 3 }}>
                    {team.description}
                  </Paragraph>

                  <div className="team-card__stats">
                    <div className="stat-chip">
                      <UserOutlined />
                      <span>{team.nodeCount} 个节点</span>
                    </div>
                    <div className="stat-chip">
                      <LinkOutlined />
                      <span>{team.edgeCount} 条连接</span>
                    </div>
                    <div className="stat-chip">
                      <CalendarOutlined />
                      <span>{formatDate(team.compiledAt)}</span>
                    </div>
                  </div>

                  <div className="team-card__actions">
                    <Button type="default" onClick={() => navigate('/builder')}>
                      编辑团队
                    </Button>
                    <Button
                      type="primary"
                      icon={<RocketOutlined />}
                      onClick={() => handleRunTeam(team)}
                    >
                      运行团队
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="team-pool-footer">
            <Space>
              <Button type="primary" onClick={() => navigate('/builder')}>
                新建团队
              </Button>
              <Button onClick={() => navigate('/python-runner')}>
                前往 Python Runner
              </Button>
            </Space>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default TeamPool;
