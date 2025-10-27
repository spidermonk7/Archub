import React, { useMemo } from 'react';
import { Layout, Typography, Tag, Space, Button } from 'antd';
import {
  TeamOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './TeamPool.css';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type TeamSize = 'small' | 'medium' | 'large';
type TeamStatus = 'connected' | 'disconnected' | 'unknown';

interface TeamSummary {
  id: string;
  name: string;
  description: string;
  size: TeamSize;
  version: string;
  successRate: number;
  avgResponseTime: string;
  tasksSolved: number;
  activeAgents: number;
  tags: string[];
  status: TeamStatus;
  maturity: 'Stable' | 'Beta' | 'Experimental';
}

const TEAM_LIBRARY: TeamSummary[] = [
  {
    id: 'insight-triad',
    name: 'Insight Triad',
    description:
      'Three-agent research crew that triangulates sources, drafts narrative summaries, and validates key findings before handoff.',
    size: 'medium',
    version: 'v1.4.2',
    successRate: 94,
    avgResponseTime: '42s',
    tasksSolved: 312,
    activeAgents: 3,
    tags: ['research', 'analysis', 'reports'],
    status: 'connected',
    maturity: 'Stable',
  },
  {
    id: 'ops-quartet',
    name: 'Ops Quartet',
    description:
      'Operations-focused workflow that routes support tickets, enriches data, writes responses, and escalates edge cases.',
    size: 'large',
    version: 'v2.1.0',
    successRate: 88,
    avgResponseTime: '55s',
    tasksSolved: 528,
    activeAgents: 4,
    tags: ['support', 'routing', 'automation'],
    status: 'connected',
    maturity: 'Stable',
  },
  {
    id: 'creative-duo',
    name: 'Creative Duo',
    description:
      'Ideation partner pairing a strategist and a critic to generate campaigns, iterate on copy, and surface top options.',
    size: 'small',
    version: 'v0.9.5',
    successRate: 81,
    avgResponseTime: '36s',
    tasksSolved: 164,
    activeAgents: 2,
    tags: ['marketing', 'ideation', 'copywriting'],
    status: 'connected',
    maturity: 'Beta',
  },
];

const TeamPool: React.FC = () => {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const totalTeams = TEAM_LIBRARY.length;
    const totalAgents = TEAM_LIBRARY.reduce((sum, team) => sum + team.activeAgents, 0);
    const aggregateSuccess =
      totalTeams > 0
        ? Math.round(TEAM_LIBRARY.reduce((sum, team) => sum + team.successRate, 0) / totalTeams)
        : 0;
    const totalTasks = TEAM_LIBRARY.reduce((sum, team) => sum + team.tasksSolved, 0);
    return { totalTeams, totalAgents, aggregateSuccess, totalTasks };
  }, []);

  const apiStatus: TeamStatus = useMemo(() => {
    if (TEAM_LIBRARY.every(team => team.status === 'connected')) return 'connected';
    if (TEAM_LIBRARY.some(team => team.status === 'disconnected')) return 'disconnected';
    return 'unknown';
  }, []);

  const renderStatusLabel = (status: TeamStatus) => {
    switch (status) {
      case 'connected':
        return 'API Connected';
      case 'disconnected':
        return 'API Offline';
      default:
        return 'API Status Unknown';
    }
  };

  const renderTeamHealth = (status: TeamStatus, maturity: TeamSummary['maturity']) => {
    if (status === 'disconnected') return 'Needs attention';
    return maturity;
  };

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
              Browse curated multi-agent teams with preconfigured roles, tools, and routing logic.
              Launch a team as-is or use it as a starting point for your own orchestrations.
            </Paragraph>
            <Space size="middle" wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBackHome}>
                Back to Home
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
              <span className="stat-label">Agents combined</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{stats.aggregateSuccess}%</span>
              <span className="stat-label">Avg success rate</span>
            </div>
          </div>
        </div>
      </div>

      <Content className="team-pool-content">
        <div className="team-content-shell">
          <section>
            <Title level={3}>Featured teams</Title>
            <div className="teams-grid">
              {TEAM_LIBRARY.map(team => (
                <div key={team.id} className="team-card">
                  <div className="team-card__header">
                    <div>
                      <Title level={4}>{team.name}</Title>
                      <Tag bordered={false} className="version-badge">
                        {team.version}
                      </Tag>
                      <div className={`size-pill ${team.size}`}>{team.size} team</div>
                    </div>
                    <Space direction="vertical" align="end">
                      <Tag bordered={false} className={`api-pill ${team.status}`}>
                        {renderTeamHealth(team.status, team.maturity)}
                      </Tag>
                      <Text type="secondary">Agents: {team.activeAgents}</Text>
                      <Text type="secondary">Solved: {team.tasksSolved}</Text>
                    </Space>
                  </div>

                  <Paragraph className="team-description">
                    {team.description}
                  </Paragraph>

                  <div className="team-card__stats">
                    <div className="stat-chip">
                      <ThunderboltOutlined />
                      <span>{team.successRate}% success</span>
                    </div>
                    <div className="stat-chip">
                      <ClockCircleOutlined />
                      <span>{team.avgResponseTime} avg runtime</span>
                    </div>
                    <div className="stat-chip">
                      <TeamOutlined />
                      <span>{team.activeAgents} active agents</span>
                    </div>
                  </div>

                  <Space size="small" wrap>
                    {team.tags.map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>

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
              ))}
            </div>
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


