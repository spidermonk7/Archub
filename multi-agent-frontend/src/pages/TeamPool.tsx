import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout, Typography, Tag, Space, Button, Spin, Dropdown, Modal, message } from 'antd';
import type { MenuProps } from 'antd';
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
  sourceFilename?: string;
  origin?: 'default' | 'user';
  error?: string;
}

const getDisplayName = (team: ApiTeam): string =>
  team.configData?.metadata?.name || team.name || team.id;

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
  const [userTeams, setUserTeams] = useState<ApiTeam[]>([]);
  const [defaultTeams, setDefaultTeams] = useState<ApiTeam[]>([]);
  const defaultTeamsRef = useRef<ApiTeam[]>([]);
  const [loadingUser, setLoadingUser] = useState<boolean>(false);
  const [loadingDefault, setLoadingDefault] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDefaultTeams = useCallback(async (): Promise<ApiTeam[]> => {
    try {
      setLoadingDefault(true);
      const response = await fetch(`${API_BASE_URL}/api/default-teams`);
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load default teams');
      }
      const teams = (Array.isArray(data.teams) ? data.teams : []) as ApiTeam[];
      const normalized = teams.map((team: ApiTeam) => ({
        ...team,
        origin: 'default' as const,
      }));
      setDefaultTeams(normalized);
      defaultTeamsRef.current = normalized;
      return teams;
    } catch (err) {
      console.error('Failed to load default teams', err);
      setDefaultTeams([]);
      defaultTeamsRef.current = [];
      return [];
    } finally {
      setLoadingDefault(false);
    }
  }, []);

  const fetchUserTeams = useCallback(
    async (defaults?: ApiTeam[]): Promise<void> => {
      try {
        setLoadingUser(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/api/teams`);
        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to load teams');
        }

        const teams = (Array.isArray(data.teams) ? data.teams : []) as ApiTeam[];
        const defaultList = defaults ?? defaultTeamsRef.current;
        const defaultIds = new Set(defaultList.map(team => team.id));
        setUserTeams(
          teams
            .filter((team: ApiTeam) => !defaultIds.has(team.id))
            .map((team: ApiTeam) => ({
              ...team,
              origin: 'user',
            }))
        );
      } catch (err) {
        console.error('Failed to load teams', err);
        setUserTeams([]);
        setError(err instanceof Error ? err.message : 'Unable to load teams');
      } finally {
        setLoadingUser(false);
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      const defaults = await fetchDefaultTeams();
      await fetchUserTeams(defaults);
    })();
  }, [fetchDefaultTeams, fetchUserTeams]);

  const stats = useMemo(() => {
    const allTeams = [...defaultTeams, ...userTeams];

    if (!allTeams.length) {
      return { totalTeams: 0, totalNodes: 0, totalAgents: 0 };
    }

    let totalNodes = 0;
    let totalAgents = 0;

    allTeams.forEach(team => {
      const nodesFromConfig = team.configData?.nodes ?? [];
      const nodeCount = team.nodeCount ?? nodesFromConfig.length;

      totalNodes += nodeCount;
      totalAgents += nodesFromConfig.filter(node => node.type === 'agent').length;
    });

    return {
      totalTeams: allTeams.length,
      totalNodes,
      totalAgents,
    };
  }, [defaultTeams, userTeams]);

  const apiStatus: TeamStatus = error
    ? 'disconnected'
    : userTeams.length > 0
    ? 'connected'
    : 'unknown';

  const handleBackHome = () => navigate('/');
  const handleDesignCustom = () => navigate('/builder');
  const handleRefresh = useCallback(() => {
    fetchDefaultTeams().then(fetchUserTeams);
  }, [fetchDefaultTeams, fetchUserTeams]);
  const handleDeleteTeam = useCallback(async (teamId: string, teamName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete team');
      }
      setUserTeams(prev => prev.filter(team => team.id !== teamId));
      setDefaultTeams(prev => {
        const next = prev.filter(team => team.id !== teamId);
        defaultTeamsRef.current = next;
        return next;
      });
      message.success(`Deleted ${teamName}.`);
    } catch (err) {
      console.error('Failed to delete team', err);
      message.error('Failed to delete this team.');
    }
  }, []);

  const handleSetAsDefault = useCallback(
    async (team: ApiTeam) => {
      const displayName = getDisplayName(team);
      try {
        let config = team.configData;

        if (!config) {
          const response = await fetch(`${API_BASE_URL}/api/teams/${team.id}`);
          if (!response.ok) {
            throw new Error('Unable to load team configuration');
          }
          const data = await response.json();
          if (!data.success || !data.team || !data.team.configData) {
            throw new Error('Team configuration is missing');
          }
          config = data.team.configData as ConfigData;
        }

        const payloadConfig = config as ConfigData;
        const response = await fetch(`${API_BASE_URL}/api/default-teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: team.id,
            config: payloadConfig,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to save default team');
        }

        const defaults = await fetchDefaultTeams();
        await fetchUserTeams(defaults);
        message.success(`Set ${displayName} as default.`);
      } catch (err) {
        console.error('Failed to set default team', err);
        message.error('Failed to set this team as default.');
      }
    },
    [fetchDefaultTeams, fetchUserTeams]
  );

  const handleDeleteDefaultTeam = useCallback(
    async (team: ApiTeam) => {
      const displayName = getDisplayName(team);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/default-teams/${encodeURIComponent(team.id)}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: team.sourceFilename,
            }),
          }
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to delete default team');
        }
        const defaults = await fetchDefaultTeams();
        await fetchUserTeams(defaults);
        message.success(`Deleted default ${displayName}.`);
      } catch (err) {
        console.error('Failed to delete default team', err);
        message.error('Failed to delete this default team.');
      }
    },
    [fetchDefaultTeams, fetchUserTeams]
  );

  const confirmDeleteTeam = useCallback((team: ApiTeam) => {
    const displayName = getDisplayName(team);
    Modal.confirm({
      title: `Delete ${displayName}?`,
      content: 'Deleting a team cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => handleDeleteTeam(team.id, displayName),
    });
  }, [handleDeleteTeam]);

  const confirmDeleteDefaultTeam = useCallback((team: ApiTeam) => {
    const displayName = getDisplayName(team);
    Modal.confirm({
      title: `Delete default ${displayName}?`,
      content: 'This removes the saved default template but keeps the original team.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => handleDeleteDefaultTeam(team),
    });
  }, [handleDeleteDefaultTeam]);

  const openRunner = useCallback(async (team: ApiTeam, mode: 'preview' | 'execute') => {
    try {
      const isDefaultTeam = team.origin === 'default';
      let config = team.configData;

      if (!config && !isDefaultTeam) {
        const response = await fetch(`${API_BASE_URL}/api/teams/${team.id}`);
        if (!response.ok) {
          throw new Error('Unable to load team configuration');
        }
        const data = await response.json();
        if (!data.success || !data.team || !data.team.configData) {
          throw new Error('Team configuration is missing');
        }
        config = data.team.configData as ConfigData;
      }

      if (!config) {
        throw new Error('Team configuration is missing');
      }

      sessionStorage.setItem('selectedTeamConfig', JSON.stringify(config));
      sessionStorage.setItem('selectedTeamName', config.metadata?.name || team.name || team.id);
      sessionStorage.setItem('selectedTeamId', team.id);
      if (team.sourceFilename) {
        sessionStorage.setItem('selectedTeamFilename', team.sourceFilename);
      } else {
        sessionStorage.setItem('selectedTeamFilename', `${team.id}.yaml`);
      }
      sessionStorage.setItem('selectedTeamMode', mode);

      navigate('/python-runner');
    } catch (err) {
      console.error('Failed to open Python Runner', err);
      message.error('Failed to open Python Runner for this team.');
    }
  }, [navigate]);

  const renderTeamCard = (team: ApiTeam, variant: 'user' | 'default') => {
    const metadata = team.configData?.metadata ?? {};
    const displayName = getDisplayName(team);
    const baseDescription =
      metadata.description || team.description || 'This team does not have a description yet.';
    const description = team.error ? `Warning: ${team.error}` : baseDescription;
    const rawVersion = metadata.version || team.version || '1.0';
    const versionLabel = rawVersion.toLowerCase().startsWith('v') ? rawVersion : `v${rawVersion}`;

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
      team.origin === 'default'
        ? 'Default'
        : normalizedStatus === 'connected'
        ? 'Ready to run'
        : normalizedStatus === 'disconnected'
        ? 'Not available'
        : 'Draft';

    const disableActions = Boolean(team.error);

    const createCard = (key: string) => (
      <div key={key} className="team-card">
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
              {team.error ? 'Load error' : statusTagLabel}
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
            {tags.length > 4 && <Tag className="tag-more">+{tags.length - 4}</Tag>}
          </Space>
        )}

        <div className="team-card__actions">
          <Button onClick={() => openRunner(team, 'preview')} disabled={disableActions}>
            Preview
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => openRunner(team, 'execute')}
            disabled={disableActions}
          >
            Launch
          </Button>
        </div>
      </div>
    );

    const menuItems: MenuProps['items'] =
      variant === 'user'
        ? [
            {
              key: 'set-default',
              label: 'Set as default',
              disabled: disableActions,
            },
            { type: 'divider' },
            {
              key: 'delete',
              label: 'Delete',
              danger: true,
            },
          ]
        : [
            {
              key: 'delete-default',
              label: 'Delete',
              danger: true,
            },
          ];

    const menu: MenuProps = {
      items: menuItems,
      onClick: ({ key }) => {
        if (variant === 'user') {
          if (key === 'set-default') {
            handleSetAsDefault(team);
          } else if (key === 'delete') {
            confirmDeleteTeam(team);
          }
        } else if (key === 'delete-default') {
          confirmDeleteDefaultTeam(team);
        }
      },
    };

    return (
      <Dropdown
        key={`${variant}-${team.id}`}
        trigger={['contextMenu']}
        menu={menu}
      >
        {createCard(`${variant}-${team.id}`)}
      </Dropdown>
    );
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
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loadingUser || loadingDefault}
              >
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
          <section className="team-section">
            <div className="team-section__title">
              <Title level={3}>Default Teams</Title>
              <Paragraph type="secondary">
                Right-click a saved default for actions like deleting it. Promote new entries from "Your Teams".
              </Paragraph>
            </div>

            {loadingDefault ? (
              <div className="team-loading">
                <Spin size="large" />
                <Paragraph className="loading-copy">Loading default teams...</Paragraph>
              </div>
            ) : defaultTeams.length === 0 ? (
              <div className="empty-state glass">
                <Title level={4}>No default teams yet</Title>
                <Paragraph type="secondary">
                  Right-click a team under "Your Teams" and set it as default to add it here.
                </Paragraph>
              </div>
            ) : (
              <div className="teams-grid">
                {defaultTeams.map(team => renderTeamCard(team, 'default'))}
              </div>
            )}
          </section>

          <section className="team-section">
            <div className="team-section__title">
              <Title level={3}>Your Teams</Title>
            </div>

            {loadingUser ? (
              <div className="team-loading">
                <Spin size="large" />
                <Paragraph className="loading-copy">Loading your teams...</Paragraph>
              </div>
            ) : error ? (
              <div className="team-loading">
                <Paragraph type="secondary">{error}</Paragraph>
                <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                  Retry
                </Button>
              </div>
            ) : userTeams.length === 0 ? (
              <div className="empty-state glass">
                <Title level={4}>No teams yet</Title>
                <Paragraph type="secondary">
                  Build and compile a team in the builder. It will show up here automatically.
                </Paragraph>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleDesignCustom}>
                  Create your first team
                </Button>
              </div>
            ) : (
              <div className="teams-grid">
                {userTeams.map(team => renderTeamCard(team, 'user'))}
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
