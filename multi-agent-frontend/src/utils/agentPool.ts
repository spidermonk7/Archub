import yaml from 'js-yaml';

// Agent Pool相关类型定义
export interface AgentPoolItem {
  id: string;
  name: string;
  type: 'agent';
  description: string;
  config: {
    llmModel: string;
    systemPrompt: string;
    inputDataType: string;
    outputDataType: string;
    outputSchema?: string;
    customSchema?: string;
    tools: string[];
  };
  category: string;
  tags: string[];
  author: string;
  version: string;
}

export interface AgentPoolCategory {
  name: string;
  agents: AgentPoolItem[];
}

// 预定义的Agent YAML文件名列表
const AGENT_FILES = [
  'data-analyst.yaml',
  'writing-assistant.yaml',
  'code-reviewer.yaml',
  'research-analyst.yaml'
];

// 加载Agent Pool
export const loadAgentPool = async (): Promise<AgentPoolItem[]> => {
  const agents: AgentPoolItem[] = [];
  
  for (const fileName of AGENT_FILES) {
    try {
      // 由于是静态文件，我们需要将YAML内容直接嵌入
      const agentData = await loadAgentFromFile(fileName);
      if (agentData) {
        agents.push(agentData);
      }
    } catch (error) {
      console.warn(`Failed to load agent from ${fileName}:`, error);
    }
  }
  
  return agents;
};

// 从文件加载单个Agent（这里我们需要直接嵌入YAML内容）
const loadAgentFromFile = async (fileName: string): Promise<AgentPoolItem | null> => {
  try {
    // 在实际的Web环境中，我们需要将YAML内容作为模块导入
    // 这里我们先用硬编码的方式实现，后续可以优化
    const agentConfigs = getHardcodedAgentConfigs();
    const agentData = agentConfigs[fileName];
    
    if (agentData) {
      return yaml.load(agentData) as AgentPoolItem;
    }
    
    return null;
  } catch (error) {
    console.error(`Error parsing agent file ${fileName}:`, error);
    return null;
  }
};

// 硬编码的Agent配置（在生产环境中可以改为动态加载）
const getHardcodedAgentConfigs = (): Record<string, string> => {
  return {
    'data-analyst.yaml': `
id: data-analyst-agent
name: 数据分析专家
type: agent
description: 专业的数据分析和可视化专家，能够处理各种数据格式并生成深入的分析报告
config:
  llmModel: gpt-4o-mini
  systemPrompt: |
    你是一位专业的数据分析专家。你的任务是：
    1. 分析用户提供的数据集
    2. 识别数据中的模式、趋势和异常
    3. 生成清晰的数据洞察和建议
    4. 创建可视化图表来展示分析结果
    
    请始终保持客观、准确，并提供可操作的建议。
  inputDataType: datafile
  outputDataType: text
  outputSchema: json
  tools:
    - math
    - code_executor
category: "数据分析"
tags:
  - "数据科学"
  - "分析"
  - "可视化"
author: "System"
version: "1.0"`,
    
    'writing-assistant.yaml': `
id: writing-assistant-agent
name: 写作助手
type: agent
description: 专业的写作助手，擅长各种文体的创作、编辑和优化
config:
  llmModel: gpt-4o
  systemPrompt: |
    你是一位专业的写作助手。你的核心能力包括：
    1. 创作各种类型的文章（技术文档、营销文案、学术论文等）
    2. 编辑和改进现有文本的结构、语法和风格
    3. 提供写作建议和创意灵感
    4. 根据不同受众调整写作风格和语调
    
    请始终注重文本的清晰性、逻辑性和可读性。
  inputDataType: text
  outputDataType: text
  outputSchema: markdown
  tools: []
category: "内容创作"
tags:
  - "写作"
  - "编辑"
  - "文案"
author: "System"
version: "1.0"`,
    
    'code-reviewer.yaml': `
id: code-reviewer-agent
name: 代码审查专家
type: agent
description: 专业的代码审查和质量保障专家，能够分析代码质量、发现问题并提供改进建议
config:
  llmModel: gpt-4o
  systemPrompt: |
    你是一位资深的代码审查专家。你的职责包括：
    1. 分析代码的质量、可读性和维护性
    2. 识别潜在的bug、安全漏洞和性能问题
    3. 检查代码是否遵循最佳实践和编码规范
    4. 提供具体的改进建议和重构方案
    5. 评估代码的测试覆盖率和文档完整性
    
    请提供详细、具体的反馈，重点关注代码质量和可维护性。
  inputDataType: file
  outputDataType: text
  outputSchema: json
  tools:
    - code_executor
category: "软件开发"
tags:
  - "代码审查"
  - "质量保障"
  - "最佳实践"
author: "System"
version: "1.0"`,
    
    'research-analyst.yaml': `
id: research-analyst-agent
name: 研究分析师
type: agent
description: 专业的研究分析专家，能够进行深度调研、信息整合和趋势分析
config:
  llmModel: gpt-4o-mini
  systemPrompt: |
    你是一位专业的研究分析师。你的专长包括：
    1. 收集和整理来自多个来源的信息
    2. 进行竞品分析和市场研究
    3. 识别行业趋势和发展机会
    4. 生成深入的研究报告和洞察
    5. 提供基于数据的决策建议
    
    请确保你的分析客观、全面，并基于可靠的信息来源。
  inputDataType: text
  outputDataType: text
  outputSchema: free_text
  tools:
    - math
category: "研究咨询"
tags:
  - "市场研究"
  - "竞品分析"
  - "趋势分析"
author: "System"
version: "1.0"`
  };
};

// 按分类组织Agent
export const organizeAgentsByCategory = (agents: AgentPoolItem[]): AgentPoolCategory[] => {
  const categoryMap = new Map<string, AgentPoolItem[]>();
  
  agents.forEach(agent => {
    if (!categoryMap.has(agent.category)) {
      categoryMap.set(agent.category, []);
    }
    categoryMap.get(agent.category)!.push(agent);
  });
  
  return Array.from(categoryMap.entries()).map(([name, agents]) => ({
    name,
    agents
  }));
};