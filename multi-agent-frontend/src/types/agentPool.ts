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
