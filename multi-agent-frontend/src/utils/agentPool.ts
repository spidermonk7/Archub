import { agentPresets } from '../data/agentPresets';
import { AgentPoolItem, AgentPoolCategory } from '../types/agentPool';

export const loadAgentPool = async (): Promise<AgentPoolItem[]> => {
  return agentPresets.map(agent => ({
    ...agent,
    config: {
      ...agent.config,
      tools: [...agent.config.tools],
    },
    tags: [...agent.tags],
  }));
};

export const organizeAgentsByCategory = (agents: AgentPoolItem[]): AgentPoolCategory[] => {
  const categoryMap = new Map<string, AgentPoolItem[]>();

  agents.forEach(agent => {
    if (!categoryMap.has(agent.category)) {
      categoryMap.set(agent.category, []);
    }
    categoryMap.get(agent.category)!.push(agent);
  });

  return Array.from(categoryMap.entries()).map(([name, items]) => ({
    name,
    agents: items,
  }));
};

export type { AgentPoolItem, AgentPoolCategory } from '../types/agentPool';
