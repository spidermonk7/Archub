import React, { useState, useEffect, useRef } from 'react';
import { Layout, Button, Card, Switch, message, Tag, Space } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import RunningNodeCanvas from '../components/RunningNodeCanvas';
import TerminalOutput from '../components/TerminalOutput';
import { Node, Edge } from '../utils/types';
import { runTeam, getGraphConfig } from '../utils/api';
import './GraphRunner.css';

const { Content, Sider } = Layout;

const GraphRunner: React.FC = () => {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getGraphConfig();
        setNodes(config.nodes || []);
        setEdges(config.edges || []);
      } catch (error) {
        message.error('加载图配置失败');
        navigate('/');
      }
    };
    loadConfig();
  }, [navigate]);

  const handleRunTeam = async () => {
    if (isRunning) {
      setIsRunning(false);
      message.info('停止运行');
      return;
    }

    setIsRunning(true);
    setTerminalOutput([]);
    
    try {
      // 模拟运行过程
      await runTeam((output: string, activeNodeId?: string) => {
        setTerminalOutput(prev => [...prev, output]);
        
        if (activeNodeId) {
          setActiveNodes(prev => {
            const newSet = new Set(prev);
            newSet.add(activeNodeId);
            return newSet;
          });
          setTimeout(() => {
            setActiveNodes(prev => {
              const newSet = new Set(prev);
              newSet.delete(activeNodeId);
              return newSet;
            });
          }, 2000);
        }
      });
      
      message.success('团队运行完成');
    } catch (error) {
      message.error('运行失败');
    } finally {
      setIsRunning(false);
    }
  };

  const handleBackHome = () => {
    navigate('/');
  };

  return (
    <Layout className="graph-runner">
      <section className="runner-hero glass">
        <div className="runner-meta">
          <Space size="small" align="center">
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={handleBackHome}>
              返回首页
            </Button>
            <Tag className="runner-tag" bordered={false}>Execution Console</Tag>
          </Space>
          <h1>Multi-Agent System Runner</h1>
          <p>实时监控节点状态、事件流与日志输出，掌控你的多智能体执行过程。</p>
        </div>
        <div className="runner-controls">
          <div className="control-row">
            <Button
              type="primary"
              icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleRunTeam}
              size="large"
            >
              {isRunning ? '停止运行' : '开始运行'}
            </Button>
            <Switch
              checked={showTerminal}
              onChange={setShowTerminal}
              checkedChildren="日志"
              unCheckedChildren="隐藏日志"
            />
          </div>
          <div className="status-row">
            <span className={`status-dot ${isRunning ? 'on' : 'off'}`} />
            <span>{isRunning ? '运行中' : '等待启动'}</span>
            <Tag>{nodes.length} 节点</Tag>
            <Tag>{edges.length} 连接</Tag>
          </div>
        </div>
      </section>

      <Layout className="runner-body">
        <Content className="runner-canvas glass-soft">
          <RunningNodeCanvas
            nodes={nodes}
            edges={edges}
            activeNodes={activeNodes}
            isRunning={isRunning}
          />
        </Content>
        
        {showTerminal && (
          <Sider width={360} className="runner-terminal glass-soft">
            <Card
              title="运行日志"
              size="small"
              bordered={false}
            >
              <TerminalOutput
                ref={terminalRef}
                output={terminalOutput}
                isRunning={isRunning}
              />
            </Card>
          </Sider>
        )}
      </Layout>
    </Layout>
  );
};

export default GraphRunner;
