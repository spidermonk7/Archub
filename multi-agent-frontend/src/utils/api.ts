import * as yaml from 'js-yaml';
import { Node, Edge, GraphConfig, NodeType } from './types';

// 保存节点配置到YAML文件
export const saveNodeConfig = async (node: Node): Promise<void> => {
  try {
    const yamlContent = yaml.dump({
      id: node.id,
      name: node.name,
      type: node.type,
      description: node.description,
      config: node.config,
      position: node.position,
    });

    // 模拟API调用 - 实际项目中需要连接真实后端
    console.log('保存节点配置:', yamlContent);
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 模拟保存成功
    return Promise.resolve();
  } catch (error) {
    console.error('Error saving node config:', error);
    throw new Error('Failed to save node config');
  }
};

// 保存边配置
export const saveEdgeConfig = async (edge: Edge): Promise<void> => {
  try {
    const edgeData = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      delay: edge.delay ?? 0,
      config: edge.config || {},
    };

    // 模拟API调用
    console.log('保存边配置:', edgeData);
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error saving edge config:', error);
    throw new Error('Failed to save edge config');
  }
};

// 编译和保存图配置（支持自定义名称和描述）
export const compileAndSaveGraph = async (
  nodes: Node[], 
  edges: Edge[], 
  teamName?: string, 
  teamDescription?: string
): Promise<void> => {
  try {
    const graphConfig: GraphConfig = {
      nodes,
      edges,
      metadata: {
        compiledAt: new Date().toISOString(),
        version: '1.0',
        name: teamName || `multi-agent-graph-${Date.now()}`,
        description: teamDescription || `包含 ${nodes.length} 个节点和 ${edges.length} 个连接的多智能体系统`,
      },
    };

    // 模拟编译过程
    console.log('编译图配置:', graphConfig);
    
    // 模拟编译验证
    if (nodes.length === 0) {
      throw new Error('Graph must contain at least one node');
    }
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 保存到数据库
    await saveToDatabase(graphConfig);
    
    // 保存到本地文件（可选，用户可以选择下载）
    await saveToLocalFile(graphConfig);
    
    // 同时保存到localStorage作为备份
    localStorage.setItem('compiledGraphConfig', JSON.stringify(graphConfig));
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error compiling graph:', error);
    throw error;
  }
};

// 仅编译验证（不保存到数据库，用于命名前的验证）
export const validateGraph = async (nodes: Node[], edges: Edge[]): Promise<GraphConfig> => {
  try {
    const graphConfig: GraphConfig = {
      nodes,
      edges,
      metadata: {
        compiledAt: new Date().toISOString(),
        version: '1.0',
        name: `temp-graph-${Date.now()}`,
      },
    };

    // 模拟编译验证过程
    console.log('验证图配置:', graphConfig);
    
    if (nodes.length === 0) {
      throw new Error('Graph must contain at least one node');
    }
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return graphConfig;
  } catch (error) {
    console.error('Error validating graph:', error);
    throw error;
  }
};

// 保持向后兼容的原函数
export const compileGraph = async (nodes: Node[], edges: Edge[]): Promise<void> => {
  return compileAndSaveGraph(nodes, edges);
};

// 保存到数据库
const saveToDatabase = async (config: GraphConfig): Promise<void> => {
  try {
    const response = await fetch('http://localhost:5000/api/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log('✅ 团队配置已保存到数据库:', data.teamId);
        return;
      }
    }
    
    // 如果数据库保存失败，抛出错误但不阻止后续流程
    console.warn('⚠️ 数据库保存失败，但配置已保存到本地');
  } catch (error) {
    console.warn('⚠️ 无法连接到数据库，配置已保存到本地存储');
  }
};

// 保存配置到本地文件
const saveToLocalFile = async (config: GraphConfig): Promise<void> => {
  try {
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
    
    const blob = new Blob([yamlContent], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const fileName = `${config.metadata?.name || 'multi-agent-graph'}.yaml`;
    link.href = url;
    link.download = fileName;
    
    // 设置建议的保存路径（浏览器会记住上次使用的目录）
    link.setAttribute('data-suggested-filename', `SourceFiles/${fileName}`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('图配置已准备下载到 SourceFiles 目录:', fileName);
    
    // // 显示提示信息
    // setTimeout(() => {
    //   const result = window.confirm(`文件 ${fileName} 已下载\n\n为了在 Team Pool 中显示此团队，请将文件保存到项目根目录下的 SourceFiles 文件夹中。\n\n点击"确定"查看详细说明。`);
    //   if (result) {
    //     window.alert('步骤:\n1. 找到下载的 ' + fileName + ' 文件\n2. 将其移动到项目目录中的 SourceFiles 文件夹\n3. 在 Team Pool 中刷新即可看到新团队');
    //   }
    // }, 500);
  } catch (error) {
    console.error('保存到本地文件失败:', error);
    throw new Error('Failed to save to local file');
  }
};

// 从本地文件加载配置
export const loadFromLocalFile = (): Promise<GraphConfig> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml,.json';
    
    // 提示用户从 SourceFiles 目录选择文件
    console.log('请从 SourceFiles 目录选择配置文件');
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      try {
        const text = await file.text();
        let config: GraphConfig;
        
        if (file.name.endsWith('.json')) {
          config = JSON.parse(text);
        } else {
          config = yaml.load(text) as GraphConfig;
        }
        
        // 验证配置格式
        if (!config.nodes || !Array.isArray(config.nodes)) {
          throw new Error('Invalid config format: missing nodes array');
        }
        
        if (!config.edges || !Array.isArray(config.edges)) {
          throw new Error('Invalid config format: missing edges array');
        }
        
        console.log('从本地文件加载配置:', file.name);
        console.log('建议将配置文件保存在 SourceFiles 目录中以便管理');
        resolve(config);
      } catch (error) {
        console.error('读取文件失败:', error);
        reject(new Error(`Failed to load file: ${error}`));
      }
    };
    
    input.click();
  });
};

// 运行团队
export const runTeam = async (
  onOutput: (output: string, activeNodeId?: string) => void
): Promise<void> => {
  try {
    // 模拟运行过程
    const config = JSON.parse(localStorage.getItem('compiledGraphConfig') || '{"nodes":[],"edges":[]}');
    const nodes = config.nodes || [];
    
    onOutput('[INFO] 开始运行多智能体系统...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onOutput('[INFO] 初始化节点配置...');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 模拟每个节点的运行
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      onOutput(`[INFO] 激活节点: ${node.name}`, node.id);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onOutput(`[SUCCESS] 节点 ${node.name} 处理完成`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    onOutput('[SUCCESS] 所有节点运行完成');
    onOutput('[INFO] 系统运行结束', undefined);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error running team:', error);
    throw error;
  }
};

// 获取图配置
export const getGraphConfig = async (): Promise<GraphConfig> => {
  try {
    // 从localStorage获取编译后的配置
    const configStr = localStorage.getItem('compiledGraphConfig');
    if (!configStr) {
      throw new Error('No compiled graph configuration found');
    }
    
    const config = JSON.parse(configStr);
    await new Promise(resolve => setTimeout(resolve, 200)); // 模拟网络延迟
    
    return config;
  } catch (error) {
    console.error('Error getting graph config:', error);
    throw error;
  }
};

// 获取可用的节点类型
export const getNodeTypes = async (): Promise<NodeType[]> => {
  try {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 返回默认的节点类型
    return [
      {
        value: 'input',
        label: '输入节点',
        description: '接收用户输入的入口节点',
        configSchema: [
          { name: 'inputType', label: '输入类型', type: 'select' as const, required: true, options: [
            { value: 'text', label: '文本输入' },
            { value: 'file', label: '文件输入' },
            { value: 'voice', label: '语音输入' },
          ]},
          { name: 'validation', label: '输入验证', type: 'textarea' as const, placeholder: '输入验证规则（可选）' },
          { name: 'placeholder', label: '提示文本', type: 'text' as const, defaultValue: '请输入您的需求...' },
        ],
      },
      {
        value: 'output',
        label: '输出节点',
        description: '向用户返回结果的出口节点',
        configSchema: [
          { name: 'outputFormat', label: '输出格式', type: 'select' as const, required: true, options: [
            { value: 'text', label: '文本输出' },
            { value: 'json', label: 'JSON格式' },
            { value: 'markdown', label: 'Markdown格式' },
          ]},
          { name: 'template', label: '输出模板', type: 'textarea' as const, placeholder: '输出格式模板（可选）' },
          { name: 'successMessage', label: '成功提示', type: 'text' as const, defaultValue: '处理完成' },
        ],
      },
      {
        value: 'agent',
        label: '智能体',
        description: '基础智能体节点',
        configSchema: [
          { name: 'model', label: '模型', type: 'select' as const, required: true, options: [
            { value: 'gpt-4', label: 'GPT-4' },
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5-Turbo' },
            { value: 'claude-3', label: 'Claude-3' },
          ]},
          { name: 'systemPrompt', label: '系统提示', type: 'textarea' as const, required: true },
          { name: 'temperature', label: '温度', type: 'number' as const, defaultValue: 0.7 },
        ],
      },
      {
        value: 'tool',
        label: '工具节点',
        description: '执行特定功能的工具',
        configSchema: [
          { name: 'toolType', label: '工具类型', type: 'select' as const, required: true, options: [
            { value: 'web_search', label: '网络搜索' },
            { value: 'code_executor', label: '代码执行' },
            { value: 'file_processor', label: '文件处理' },
          ]},
          { name: 'parameters', label: '参数配置', type: 'textarea' as const },
        ],
      },
      {
        value: 'coordinator',
        label: '协调器',
        description: '协调多个智能体的工作',
        configSchema: [
          { name: 'strategy', label: '协调策略', type: 'select' as const, required: true, options: [
            { value: 'sequential', label: '顺序执行' },
            { value: 'parallel', label: '并行执行' },
            { value: 'conditional', label: '条件执行' },
          ]},
          { name: 'maxRetries', label: '最大重试次数', type: 'number' as const, defaultValue: 3 },
        ],
      },
    ] as NodeType[];
  } catch (error) {
    console.error('Error getting node types:', error);
    throw error;
  }
};
