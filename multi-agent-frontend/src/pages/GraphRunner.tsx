import React, { useState, useEffect, useRef } from 'react';
import { Layout, Button, Card, Switch, message } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import RunningNodeCanvas from '../components/RunningNodeCanvas';
import TerminalOutput from '../components/TerminalOutput';
import { Node, Edge } from '../utils/types';
import { runTeam, getGraphConfig } from '../utils/api';
import './GraphRunner.css';

const { Header, Content, Sider } = Layout;

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

  const goBackToBuilder = () => {
    navigate('/');
  };

  return (
    <Layout className="graph-runner">
      <Header className="header">
        <div className="header-content">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={goBackToBuilder}
            type="text"
            className="back-button"
          >
            返回构建器
          </Button>
          <h1>Multi-Agent System Runner</h1>
          <div className="controls">
            <Button
              type="primary"
              icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleRunTeam}
              size="large"
            >
              {isRunning ? '停止运行' : '开始运行'}
            </Button>
          </div>
        </div>
      </Header>
      
      <Layout>
        <Content className="main-content">
          <RunningNodeCanvas
            nodes={nodes}
            edges={edges}
            activeNodes={activeNodes}
            isRunning={isRunning}
          />
        </Content>
        
        {showTerminal && (
          <Sider width={400} className="terminal-sider">
            <Card
              title="运行日志"
              size="small"
              extra={
                <Switch
                  checked={showTerminal}
                  onChange={setShowTerminal}
                  size="small"
                />
              }
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