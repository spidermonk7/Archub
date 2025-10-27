import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Typography, Tag, Space, Button, Spin } from 'antd';
import {
  TeamOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  LinkOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './TeamPool.css';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type TeamStatus = 'connected' | 'disconnected' | 'unknown';
type TeamSize = 'small' | 'medium' | 'large';

interface ConfigNode {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

interface ConfigData {
  metadata?: Record<string, any>;
  nodes?: ConfigNode[];
  edges?: Array<Record<string, any>>;
}

interface ApiTeam {
  id: string;
  name: string;
  description: string;
  nodeCount?: number;
  edgeCount?: number;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
  configData?: ConfigData;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const determineTeamSize = (nodeCount: number): TeamSize => {
  if (nodeCount <= 3) return 'small';
  if (nodeCount <= 7) return 'medium';
  return 'large';
};

const formatSizeLabel = (size: TeamSize): string => {
  switch (size) {
    case 'small':
      return 'Small team';
    case 'medium':
      return 'Medium team';
    default:
      return 'Large team';
  }
};

const toTitleCase = (value: string): string =>
  value
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const deriveTags = (team: ApiTeam): string[] => {
  const rawMetadata = team.configData?.metadata;
  const metadataTags = rawMetadata?.tags;

  if (Array.isArray(metadataTags) && metadataTags.length > 0) {
    return metadataTags.map(tag => String(tag));
  }

  if (team.configData?.nodes) {
    const typeTags = Array.from(
      new Set(team.configData.nodes.map(node => node.type).filter(Boolean))
    );
    return typeTags.map(toTitleCase);
  }

  return [];
};

const countAgentNodes = (team: ApiTeam): number =>
  team.configData?.nodes?.filter(node => node.type === 'agent').length ?? 0;

const formatUpdatedTime = (value?: string): string => {
  if (!value) {
    return 'Updated moments ago';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Updated moments ago';
  }

  const diffMs = Date.now() - parsed.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'Updated moments ago';
  if (minutes < 60) return `Updated ${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Updated ${days} day${days > 1 ? 's' : ''} ago`;

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const renderStatusLabel = (status: TeamStatus): string => {
  switch (status) {
    case 'connected':
      return 'Database reachable';
    case 'disconnected':
      return 'API offline';
    default:
      return 'Awaiting data';
  }
};

const TeamPool: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/teams`);
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load teams');
      }

      setTeams(Array.isArray(data.teams) ? data.teams : []);
    } catch (err) {
      console.error('Failed to load teams', err);
      setTeams([]);
      setError(err instanceof Error ? err.message : 'Unable to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const stats = useMemo(() => {
    if (!teams.length) {
      return { totalTeams: 0, totalNodes: 0, totalAgents: 0 };
    }

    let totalNodes = 0;
    let totalAgents = 0;

    teams.forEach(team => {
      const nodesFromConfig = team.configData?.nodes ?? [];
      const nodeCount = team.nodeCount ?? nodesFromConfig.length;

      totalNodes += nodeCount;
      totalAgents += nodesFromConfig.filter(node => node.type === 'agent').length;
    });

    return {
      totalTeams: teams.length,
      totalNodes,
      totalAgents,
    };
  }, [teams]);

  const apiStatus: TeamStatus = error
    ? 'disconnected'
    : teams.length > 0
    ? 'connected'
    : 'unknown';

  const handleBackHome = () => navigate('/');
  const handleDesignCustom = () => navigate('/builder');

  const navigateToRunTeam = (teamId: string, mode: 'preview' | 'execute') => {
    navigate('/run-team', { state: { teamId, mode } });
  };

  return (
    <Layout className="team-pool">
      <div className="team-pool-hero">
        <div className="team-hero-inner">
          <div className="team-hero-text">
            <Tag className="hero-tag" bordered={false}>Team Library</Tag>
            <Title level={2}>Team Pool</Title>
            <Paragraph type="secondary">
              All compiled teams appear here automatically. Refresh after saving a team in the builder to see it on the dashboard.
            </Paragraph>
            <Space size="middle" wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBackHome}>
                Back to Home
              </Button>
              <Button icon={<ReloadOutlined />} onClick={fetchTeams} loading={loading}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleDesignCustom}>
                Design Custom Team
              </Button>
            </Space>
          </div>

          <div className="team-hero-status">
            <div className={`api-pill ${apiStatus}`}>
              {renderStatusLabel(apiStatus)}
            </div>
            <div className="hero-stat">
              <span className="stat-value">{stats.totalTeams}</span>
              <span className="stat-label">Teams available</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{stats.totalAgents}</span>
              <span className="stat-label">Agent nodes</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{stats.totalNodes}</span>
              <span className="stat-label">Total nodes</span>
            </div>
          </div>
        </div>
      </div>

      <Content className="team-pool-content">
        <div className="team-content-shell">
          <section>
            <Title level={3}>Your teams</Title>

            {loading && (
              <div className="team-loading">
                <Spin size="large" />
                <Paragraph className="loading-copy">Loading teams…</Paragraph>
              </div>
            )}

            {!loading && error && (
              <div className="team-loading">
                <Paragraph type="secondary">{error}</Paragraph>
                <Button icon={<ReloadOutlined />} onClick={fetchTeams}>
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && teams.length === 0 && (
              <div className="empty-state glass">
                <Title level={4}>No teams yet</Title>
                <Paragraph type="secondary">
                  Build and compile a team in the builder. It will show up here automatically.
                </Paragraph>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleDesignCustom}>
                  Create your first team
                </Button>
              </div>
            )}

            {!loading && !error && teams.length > 0 && (
              <div className="teams-grid">
                {teams.map(team => {
                  const metadata = team.configData?.metadata ?? {};
                  const displayName = metadata.name || team.name || team.id;
                  const description =
                    metadata.description || team.description || 'This team does not have a description yet.';
                  const rawVersion = metadata.version || team.version || '1.0';
                  const versionLabel = rawVersion.toLowerCase().startsWith('v')
                    ? rawVersion
                    : `v${rawVersion}`;

                  const nodes = team.configData?.nodes ?? [];
                  const edges = team.configData?.edges ?? [];

                  const nodeCount = team.nodeCount ?? nodes.length;
                  const edgeCount = team.edgeCount ?? edges.length;
                  const agentCount = countAgentNodes(team);

                  const size = determineTeamSize(nodeCount);
                  const sizeLabel = formatSizeLabel(size);

                  const tags = deriveTags(team);
                  const updatedLabel = formatUpdatedTime(metadata.compiledAt || team.updatedAt || team.createdAt);

                  const metadataStatus = (metadata.status as TeamStatus) ?? 'connected';
                  const normalizedStatus: TeamStatus =
                    metadataStatus === 'disconnected'
                      ? 'disconnected'
                      : metadataStatus === 'unknown'
                      ? 'unknown'
                      : 'connected';

                  const statusTagLabel =
                    normalizedStatus === 'connected'
                      ? 'Ready to run'
                      : normalizedStatus === 'disconnected'
                      ? 'Not available'
                      : 'Draft';

                  return (
                    <div key={team.id} className="team-card">
                      <div className="team-card__header">
                        <div>
                          <Title level={4}>{displayName}</Title>
                          <Tag bordered={false} className="version-badge">
                            {versionLabel}
                          </Tag>
                          <div className={`size-pill ${size}`}>{sizeLabel}</div>
                        </div>
                        <Space direction="vertical" align="end">
                          <Tag bordered={false} className={`api-pill ${normalizedStatus}`}>
                            {statusTagLabel}
                          </Tag>
                          <Text type="secondary">{updatedLabel}</Text>
                          <Text type="secondary">Nodes: {nodeCount}</Text>
                        </Space>
                      </div>

                      <Paragraph className="team-description">
                        {description}
                      </Paragraph>

                      <div className="team-card__stats">
                        <div className="stat-chip">
                          <ThunderboltOutlined />
                          <span>{nodeCount} nodes</span>
                        </div>
                        <div className="stat-chip">
                          <LinkOutlined />
                          <span>{edgeCount} edges</span>
                        </div>
                        <div className="stat-chip">
                          <TeamOutlined />
                          <span>
                            {agentCount} agent{agentCount === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>

                      {tags.length > 0 && (
                        <Space size="small" wrap>
                          {tags.slice(0, 4).map(tag => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                          {tags.length > 4 && (
                            <Tag className="tag-more">+{tags.length - 4}</Tag>
                          )}
                        </Space>
                      )}

                      <div className="team-card__actions">
                        <Button onClick={() => navigateToRunTeam(team.id, 'preview')}>
                          Preview
                        </Button>
                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          onClick={() => navigateToRunTeam(team.id, 'execute')}
                        >
                          Launch
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="team-pool-footer">
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleDesignCustom}
            >
              Create new team
            </Button>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default TeamPool;
