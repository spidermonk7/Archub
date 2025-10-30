import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Card, Button, Input, Typography, Space, Select, message, Tag, Descriptions } from 'antd';
import { ReloadOutlined, ApiOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './PythonRunner.css';
import RunningNodeCanvas from '../components/RunningNodeCanvas';
import WorkflowChat, { WorkflowEvent } from '../components/WorkflowChat';
import MarkdownRenderer from '../components/MarkdownRenderer';

const { Content } = Layout;
const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ConfigFile {
  filename: string;
  name: string;
  version?: string;
  compiledAt?: string;
  nodeCount?: number;
  edgeCount?: number;
  error?: string;
  origin?: 'default' | 'user' | string;
}

const PythonRunner: React.FC = () => {
  const navigate = useNavigate();
  const [availableConfigs, setAvailableConfigs] = useState<ConfigFile[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [activeEdges, setActiveEdges] = useState<Set<string>>(new Set());
  const [nodeStates, setNodeStates] = useState<Record<string, 'waiting'|'processing'|'done'>>({});
  const nodeStartAtRef = useRef<Record<string, number>>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const [chatEvents, setChatEvents] = useState<WorkflowEvent[]>([]);
  const lastProcessingEventIdRef = useRef<Record<string, string>>({});
  const [finalOutput, setFinalOutput] = useState<string | null>(null);

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

  // 获取可用配置文件
  const fetchAvailableConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/configs`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableConfigs(data.configs);
      } else {
        message.error('获取配置文件失败: ' + data.error);
      }
    } catch (error) {
      message.error('无法连接到后端服务器，请确保Python API服务器正在运行');
      console.error('API连接错误:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 加载选中的配置文件
  const loadSelectedConfig = useCallback(async (filename: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/load-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentConfig(data.config);
        message.success(data.message);
        setFinalOutput(null);
      } else {
        message.error('加载配置失败: ' + data.error);
      }
    } catch (error) {
      message.error('加载配置时发生错误');
      console.error('加载配置错误:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 开始SSE流式运行
  const startLiveRun = useCallback(() => {
    if (!userInput.trim()) {
      message.warning('请输入内容');
      return;
    }
    if (!currentConfig) {
      message.warning('请先加载配置文件');
      return;
    }
    if (isLiveRunning) {
      message.info('已有运行在进行中');
      return;
    }
    try {
      setIsLiveRunning(true);
      setFinalOutput(null);
      // 关闭已有连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      const encoded = encodeURIComponent(userInput.trim());
      const es = new EventSource(`${API_BASE_URL.replace('/api','')}/api/run-sse?input=${encoded}`);
      eventSourceRef.current = es;

      const getNodeName = (id: string): string => {
        const node = currentConfig?.nodes?.find((n: any) => n.id === id);
        return node?.name || id;
      };

      const activateNode = (id: string, ttl = 2000) => {
        setActiveNodes(prev => {
          const ns = new Set(prev);
          ns.add(id);
          return ns;
        });
        window.setTimeout(() => {
          setActiveNodes(prev => {
            const ns = new Set(prev);
            ns.delete(id);
            return ns;
          });
        }, ttl);
      };

      es.onmessage = (ev) => {
        // default event without explicit type
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.type) {
            handleEvent(payload);
          }
        } catch {}
      };

      es.addEventListener('node.processing.started', (ev: MessageEvent) => {
        try {
          const e = JSON.parse(ev.data);
          const nodeId = e?.node?.id;
          const nodeName = e?.node?.name || getNodeName(nodeId);
          activateNode(nodeId);
          nodeStartAtRef.current[nodeId] = Date.now();
          setNodeStates(prev => ({ ...prev, [nodeId]: 'processing' }));
          const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          lastProcessingEventIdRef.current[nodeId] = id;
          setChatEvents(prev => ([
            { id, type: 'processing', ts: Date.now(), nodeId, nodeName, status: 'processing' },
            ...prev,
          ]));
        } catch {}
      });

      es.addEventListener('node.processing.finished', (ev: MessageEvent) => {
        try {
          const e = JSON.parse(ev.data);
          const nodeId = e?.node?.id;
          // slight delay to show finish
          activateNode(nodeId, 800);
        } catch {}
      });

      es.addEventListener('node.state.waiting', (ev: MessageEvent) => {
        try {
          const e = JSON.parse(ev.data);
          const nodeId = e?.node?.id;
          setNodeStates(prev => ({ ...prev, [nodeId]: 'waiting' }));
        } catch {}
      });

      es.addEventListener('node.state.done', (ev: MessageEvent) => {
        try {
          const e = JSON.parse(ev.data);
          const nodeId = e?.node?.id;
          const startedAt = nodeStartAtRef.current[nodeId] || 0;
          const elapsed = Date.now() - startedAt;
          const minMs = 200; // minimal processing display time
          const applyDone = () => setNodeStates(prev => ({ ...prev, [nodeId]: 'done' }));
          if (elapsed < minMs) {
            setTimeout(applyDone, minMs - elapsed);
          } else {
            applyDone();
          }
          // remove any pending processing bubble for this node
          const lastId = lastProcessingEventIdRef.current[nodeId];
          if (lastId) {
            setChatEvents(prev => prev.filter(ev => ev.id !== lastId));
            lastProcessingEventIdRef.current[nodeId] = '';
          }
          // Revert to waiting after short dwell if no new events
          setTimeout(() => {
            setNodeStates(prev => {
              if (prev[nodeId] === 'done') {
                return { ...prev, [nodeId]: 'waiting' } as typeof prev;
              }
              return prev;
            });
          }, 800);
        } catch {}
      });

      es.addEventListener('edge.message.sent', (ev: MessageEvent) => {
        try {
          const e = JSON.parse(ev.data);
          const src = e?.edge?.source;
          const tgt = e?.edge?.target;
          const preview = e?.messages?.[0]?.preview || '';
          if (src) activateNode(src);
          if (tgt) activateNode(tgt);
          const a = getNodeName(src);
          const b = getNodeName(tgt);
          const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          const content = e?.messages?.[0]?.content || preview;
          const edgeId = e?.edge?.id || `${src}__to__${tgt}`;
          // activate edge animation briefly
          setActiveEdges(prev => {
            const ns = new Set(prev);
            if (edgeId) ns.add(edgeId);
            return ns;
          });
          setTimeout(() => {
            setActiveEdges(prev => {
              const ns = new Set(prev);
              if (edgeId) ns.delete(edgeId);
              return ns;
            });
          }, 1200);
          setChatEvents(prev => {
            // remove pending processing bubble for source if exists
            const lastId = lastProcessingEventIdRef.current[src];
            const base = lastId ? prev.filter(ev => ev.id !== lastId) : prev;
            if (lastId) lastProcessingEventIdRef.current[src] = '';
            return [
              { id, type: 'message', ts: Date.now(), nodeId: src, nodeName: a, targetName: b, content },
              ...base,
            ];
          });
        } catch {}
      });

      es.addEventListener('team.run.started', () => {
        // initialize nodes to waiting state
        try {
          const map: Record<string, 'waiting'> = {} as any;
          (currentConfig?.nodes || []).forEach((n: any) => { map[n.id] = 'waiting'; });
          setNodeStates(map);
        } catch {}
      });

      es.addEventListener('team.run.finished', (ev: MessageEvent) => {
        try {
          const e = JSON.parse(ev.data);
          const out = e?.output || '';
          setFinalOutput(out);
          // After finish, revert all nodes back to waiting after short delay
          setTimeout(() => {
            setNodeStates(prev => {
              const next = { ...prev } as typeof prev;
              Object.keys(next).forEach(k => { next[k] = 'waiting' as any; });
              return next;
            });
          }, 1000);
          // stop running state
          setIsLiveRunning(false);
          // Optionally, leave final node states as-is
        } catch {}
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      });

      es.addEventListener('error', () => {
        setIsLiveRunning(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      });

      const handleEvent = (_e: any) => {
        // placeholder for default events
      };
    } catch (err) {
      setIsLiveRunning(false);
      message.error('无法启动流式运行');
    }
  }, [API_BASE_URL, currentConfig, isLiveRunning, userInput]);

  // 清理 EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // 重置会话
  const resetSession = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/reset`, { method: 'POST' });
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsLiveRunning(false);
      setCurrentConfig(null);
      setSelectedConfig('');
      setFinalOutput(null);
      setChatEvents([]);
      setActiveNodes(new Set());
      setNodeStates({});
      setUserInput('');
      message.success('会话已重置');
    } catch (error) {
      message.error('重置会话时发生错误');
    }
  }, []);

  // 检查预选的配置
  const checkPreselectedConfig = useCallback(async () => {
    const preselectedConfig = sessionStorage.getItem('selectedTeamConfig');
    const preselectedName = sessionStorage.getItem('selectedTeamName');
    const preselectedFilename = sessionStorage.getItem('selectedTeamFilename');
    const preselectedMode = sessionStorage.getItem('selectedTeamMode');

    if (preselectedConfig && preselectedName) {
      try {
        const config = JSON.parse(preselectedConfig);

        setCurrentConfig(config);
        if (preselectedFilename) {
          setSelectedConfig(preselectedFilename);
        }

        if (apiStatus === 'connected') {
          try {
            await fetch(`${API_BASE_URL}/set-team-config`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: preselectedConfig,
            });
          } catch (error) {
            console.warn('Unable to sync team config with API, defaulting to local copy.');
          }
        }

        sessionStorage.removeItem('selectedTeamConfig');
        sessionStorage.removeItem('selectedTeamName');
        sessionStorage.removeItem('selectedTeamFilename');
        sessionStorage.removeItem('selectedTeamMode');

        message.success(`Loaded ${preselectedName} from Team Pool.`);

        if (preselectedMode === 'execute') {
          setUserInput(prev => prev || '');
        }
      } catch (error) {
        console.error('Failed to parse preselected config', error);
        message.error('Unable to apply the selected team configuration.');
      }
    }
  }, [apiStatus]);

  useEffect(() => {
    checkApiConnection();
    fetchAvailableConfigs();
    
    // 检查是否有从 Team Pool 传来的预选配置
    checkPreselectedConfig();
  }, [checkApiConnection, fetchAvailableConfigs, checkPreselectedConfig]);

  const handleConfigSelect = (filename: string) => {
    setSelectedConfig(filename);
    loadSelectedConfig(filename);
  };

  const getApiStatusColor = () => {
    switch (apiStatus) {
      case 'connected': return 'green';
      case 'disconnected': return 'red';
      default: return 'orange';
    }
  };

  const getApiStatusText = () => {
    switch (apiStatus) {
      case 'connected': return '已连接';
      case 'disconnected': return '未连接';
      default: return '检查中';
    }
  };

  return (
    <Layout className="python-runner">
      <div className="runner-header glass">
        <div className="header-content">
          <div className="brand">
            <h1>Python Team Runner</h1>
            <div className="sub">高级多智能体工作流 · 实时可视化</div>
          </div>
          <Space size={12} wrap>
            <Tag color={getApiStatusColor()} icon={<ApiOutlined />}>
              API状态: {getApiStatusText()}
            </Tag>
            <Button icon={<ReloadOutlined />} onClick={() => { checkApiConnection(); fetchAvailableConfigs(); }}>
              刷新
            </Button>
            <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>返回首页</Button>
          </Space>
        </div>
      </div>

      <Content className="runner-content">
        <section className="config-bar glass-soft">
          <div className="config-bar__inputs">
            <Select
              style={{ width: '100%' }}
              placeholder="选择要运行的团队配置文件"
              value={selectedConfig}
              onChange={handleConfigSelect}
              loading={isLoading}
              disabled={apiStatus !== 'connected'}
            >
              {availableConfigs.map(config => (
                <Option key={config.filename} value={config.filename}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong>{config.name}</strong>
                    {config.origin === 'default' && (
                      <Tag color="geekblue" bordered={false} style={{ marginInlineStart: 0 }}>
                        Default
                      </Tag>
                    )}
                    {config.error ? (
                      <Text type="danger"> (加载错误)</Text>
                    ) : (
                      <Text type="secondary">
                        {config.nodeCount ? ` - ${config.nodeCount}个节点, ${config.edgeCount}个连接` : ''}
                      </Text>
                    )}
                  </div>
                </Option>
              ))}
            </Select>
            {currentConfig ? (
              <Descriptions bordered size="small" column={2} className="team-meta">
                <Descriptions.Item label="团队名称">
                  {currentConfig.metadata?.name || '未命名'}
                </Descriptions.Item>
                <Descriptions.Item label="版本">
                  {currentConfig.metadata?.version || '1.0'}
                </Descriptions.Item>
                <Descriptions.Item label="节点数量">
                  <Tag color="blue">{currentConfig.nodes?.length || 0}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="连接数量">
                  <Tag color="green">{currentConfig.edges?.length || 0}</Tag>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">请选择或加载一个团队配置以开始运行。</Text>
            )}
          </div>
          <Space size="middle" wrap className="config-bar__actions">
            <Button danger onClick={resetSession} disabled={!currentConfig}>重置会话</Button>
          </Space>
        </section>

        <div className="runner-layout">
          <div className="workflow-stage">
            <div className="workflow-window">
              <div className="workflow-window__header">
                <span className="workflow-window__title">Workflow Preview</span>
              </div>
              <div className="workflow-window__canvas">
                <RunningNodeCanvas
                  nodes={currentConfig?.nodes || []}
                  edges={currentConfig?.edges || []}
                  activeNodes={activeNodes}
                  isRunning={isLiveRunning}
                  nodeStates={nodeStates}
                  activeEdges={activeEdges}
                />
                <div className="workflow-grid-overlay" aria-hidden />
              </div>
            </div>
            <div className="workflow-status">
              <div>节点: <b>{currentConfig?.nodes?.length || 0}</b></div>
              <div>连接: <b>{currentConfig?.edges?.length || 0}</b></div>
              <div>
                状态:&nbsp;
                <Tag color={isLiveRunning ? 'green' : 'default'}>
                  {isLiveRunning ? '运行中' : '待机'}
                </Tag>
              </div>
            </div>
          </div>

          <aside className="runner-sidebar">
            <Card title="输入处理" className="input-section">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <TextArea
                  placeholder="输入你的需求，团队将为你处理..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  rows={5}
                  disabled={!currentConfig || isLiveRunning}
                />
                <Button
                  onClick={startLiveRun}
                  disabled={!currentConfig || !userInput.trim() || isLiveRunning}
                  loading={isLiveRunning}
                  type="primary"
                  block
                >
                  Live 运行并流式显示
                </Button>
              </Space>
            </Card>

            <Card title="工作流日志" className="live-logs-section">
              <WorkflowChat events={chatEvents} />
            </Card>
          </aside>
        </div>

        <Card title="处理结果" className="results-card glass-soft">
          {finalOutput ? (
            <MarkdownRenderer content={finalOutput} className="results-markdown" />
          ) : (
            <div className="empty-results">
              <Text type="secondary">暂无处理结果</Text>
            </div>
          )}
        </Card>
      </Content>
    </Layout>
  );
};

export default PythonRunner;
