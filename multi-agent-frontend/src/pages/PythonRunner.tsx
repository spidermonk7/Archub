import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Card, Button, Input, Typography, Space, Select, message, List, Tag, Descriptions } from 'antd';
import { ReloadOutlined, SendOutlined, ApiOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './PythonRunner.css';

const { Header, Content } = Layout;
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
}

interface ProcessingResult {
  input: string;
  output: string;
  processingLog: string[];
  timestamp: number;
}

const PythonRunner: React.FC = () => {
  const navigate = useNavigate();
  const [availableConfigs, setAvailableConfigs] = useState<ConfigFile[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [userInput, setUserInput] = useState<string>('');
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
        setProcessingResults([]); // 清除之前的结果
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

  // 处理用户输入
  const processUserInput = useCallback(async () => {
    if (!userInput.trim()) {
      message.warning('请输入内容');
      return;
    }

    if (!currentConfig) {
      message.warning('请先加载配置文件');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(`${API_BASE_URL}/process-input`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: userInput }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newResult: ProcessingResult = {
          input: data.input,
          output: data.output,
          processingLog: data.processingLog,
          timestamp: data.timestamp,
        };
        
        setProcessingResults(prev => [newResult, ...prev]);
        setUserInput(''); // 清空输入框
        message.success('处理完成');
      } else {
        message.error('处理失败: ' + data.error);
      }
    } catch (error) {
      message.error('处理请求时发生错误');
      console.error('处理错误:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [userInput, currentConfig]);

  // 重置会话
  const resetSession = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/reset`, { method: 'POST' });
      setCurrentConfig(null);
      setSelectedConfig('');
      setProcessingResults([]);
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
    
    if (preselectedConfig && preselectedName) {
      try {
        const config = JSON.parse(preselectedConfig);
        
        // 直接设置配置，不需要通过 API 加载文件
        setCurrentConfig(config);
        setSelectedConfig(preselectedName);
        
        // 同时尝试通过API设置后端状态（如果API可用）
        if (apiStatus === 'connected') {
          try {
            await fetch(`${API_BASE_URL}/set-team-config`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: preselectedConfig,
            });
          } catch (error) {
            console.warn('无法通过API设置团队配置，将使用本地配置');
          }
        }
        
        // 清除sessionStorage中的预选配置
        sessionStorage.removeItem('selectedTeamConfig');
        sessionStorage.removeItem('selectedTeamName');
        
        message.success(`已加载来自 Team Pool 的配置: ${preselectedName}`);
      } catch (error) {
        console.error('解析预选配置失败:', error);
        message.error('预选配置格式错误');
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
      <Header className="header">
        <div className="header-content">
          <h1>Python Team Runner</h1>
          <Space>
            <Tag color={getApiStatusColor()} icon={<ApiOutlined />}>
              API状态: {getApiStatusText()}
            </Tag>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                checkApiConnection();
                fetchAvailableConfigs();
              }}
            >
              刷新
            </Button>
            <Button
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
            >
              返回首页
            </Button>
          </Space>
        </div>
      </Header>
      
      <Content className="content">
        <div className="runner-container">
          {/* 配置选择区域 */}
          <Card title="选择团队配置" className="config-section">
            <Space direction="vertical" style={{ width: '100%' }}>
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
                    <div>
                      <strong>{config.name}</strong>
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
              
              {currentConfig && (
                <Descriptions
                  title="当前团队信息"
                  bordered
                  size="small"
                  column={2}
                >
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
              )}
              
              <Button
                danger
                onClick={resetSession}
                disabled={!currentConfig}
              >
                重置会话
              </Button>
            </Space>
          </Card>

          {/* 输入处理区域 */}
          <Card title="输入处理" className="input-section">
            <Space direction="vertical" style={{ width: '100%' }}>
              <TextArea
                placeholder="输入你的需求，团队将为你处理..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                rows={4}
                disabled={!currentConfig || isProcessing}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={processUserInput}
                loading={isProcessing}
                disabled={!currentConfig || !userInput.trim()}
                size="large"
              >
                发送给团队处理
              </Button>
            </Space>
          </Card>

          {/* 处理结果区域 */}
          <Card title="处理结果" className="results-section">
            {processingResults.length === 0 ? (
              <div className="empty-results">
                <Text type="secondary">暂无处理结果</Text>
              </div>
            ) : (
              <List
                dataSource={processingResults}
                renderItem={(result, index) => (
                  <List.Item key={index}>
                    <Card
                      size="small"
                      style={{ width: '100%' }}
                      title={
                        <Space>
                          <Text strong>#{processingResults.length - index}</Text>
                          <Text type="secondary">
                            {new Date(result.timestamp * 1000).toLocaleString()}
                          </Text>
                        </Space>
                      }
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text strong>输入: </Text>
                          <Text>{result.input}</Text>
                        </div>
                        
                        <div>
                          <Text strong>处理日志: </Text>
                          <div className="processing-log">
                            {result.processingLog.map((log, logIndex) => (
                              <div key={logIndex} className="log-item">
                                {log}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <Text strong>输出结果: </Text>
                          <div className="output-result">
                            <Text mark>{result.output}</Text>
                          </div>
                        </div>
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default PythonRunner;