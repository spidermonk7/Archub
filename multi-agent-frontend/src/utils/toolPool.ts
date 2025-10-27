export interface ToolPoolItem {
  id: string;
  name: string;
  type: 'tool';
  description: string;
  category: string;
  tags: string[];
  provider: string;
  integration: string;
  capabilities: string[];
  requirements: string;
  bestFor: string;
  author: string;
  version: string;
}

export interface ToolPoolCategory {
  name: string;
  tools: ToolPoolItem[];
}

const TOOL_DATA: ToolPoolItem[] = [
  {
    id: 'web-search-tool',
    name: 'Adaptive Web Search',
    type: 'tool',
    description: 'Aggregates real-time search results across Google, news and community sources with smart ranking.',
    category: 'Research & Knowledge',
    tags: ['search', 'knowledge', 'serp'],
    provider: 'SerpAPI',
    integration: 'REST API · JSON/Markdown output',
    capabilities: [
      'Real-time search across web, news and videos',
      'Automatic citation extraction & relevance scoring',
      'Supports geo & time scoped queries'
    ],
    requirements: 'API key required',
    bestFor: 'Research analyst and monitoring workflows',
    author: 'System',
    version: '1.1'
  },
  {
    id: 'browser-automation-tool',
    name: 'Headless Browser Runner',
    type: 'tool',
    description: 'Chromium-based automation layer for scraping, screenshotting and DOM level interactions.',
    category: 'Automation',
    tags: ['browser', 'automation', 'scraping'],
    provider: 'Playwright',
    integration: 'SDK wrapper · Async task queue',
    capabilities: [
      'Full DOM interaction with cookie/session support',
      'Smart wait conditions & anti-bot mitigations',
      'Returns HTML, markdown summaries and screenshots'
    ],
    requirements: 'Runs in managed container sandbox',
    bestFor: 'Automation agents that need headless browsing',
    author: 'System',
    version: '0.9'
  },
  {
    id: 'code-executor-tool',
    name: 'Secure Code Executor',
    type: 'tool',
    description: 'Ephemeral sandbox for Python/Node snippets with resource limits and artifact capture.',
    category: 'Execution & Sandbox',
    tags: ['code', 'sandbox', 'runtime'],
    provider: 'Docker microVM',
    integration: 'gRPC microservice · Streaming logs',
    capabilities: [
      'Supports Python 3.11 and Node 20 runtimes',
      'File mounting & stdout/stderr streaming',
      'Automatic teardown with result packaging'
    ],
    requirements: 'Execution credits per minute',
    bestFor: 'Evaluation, testing and automation pipelines',
    author: 'System',
    version: '1.3'
  },
  {
    id: 'file-manager-tool',
    name: 'Vector File Manager',
    type: 'tool',
    description: 'Hybrid storage with vector indexing for documents, enabling fast semantic retrieval.',
    category: 'Data Operations',
    tags: ['files', 'vector', 'storage'],
    provider: 'S3 + pgvector',
    integration: 'REST API · Signed upload URLs',
    capabilities: [
      'Chunking pipeline with automatic metadata extraction',
      'Semantic + keyword search endpoints',
      'Versioned assets with lifecycle policies'
    ],
    requirements: 'Workspace level provisioning',
    bestFor: 'Knowledge bases and long-term project memory',
    author: 'System',
    version: '2.0'
  }
];

export const loadToolPool = async (): Promise<ToolPoolItem[]> => {
  return TOOL_DATA;
};

export const organizeToolsByCategory = (tools: ToolPoolItem[]): ToolPoolCategory[] => {
  const categoryMap = new Map<string, ToolPoolItem[]>();

  tools.forEach(tool => {
    if (!categoryMap.has(tool.category)) {
      categoryMap.set(tool.category, []);
    }
    categoryMap.get(tool.category)!.push(tool);
  });

  return Array.from(categoryMap.entries()).map(([name, items]) => ({
    name,
    tools: items
  }));
};
