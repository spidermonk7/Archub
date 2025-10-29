import { TOOL_REGISTRY, ToolDefinition, ToolKind } from './toolsRegistry';

export interface ToolPoolItem {
  id: ToolKind;
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

const mapDefinitionToPoolItem = (definition: ToolDefinition): ToolPoolItem => ({
  id: definition.id,
  name: definition.name,
  type: 'tool',
  description: definition.description,
  category: definition.category,
  tags: definition.tags,
  provider: definition.provider,
  integration: definition.integration,
  capabilities: definition.capabilities,
  requirements: definition.requirements,
  bestFor: definition.bestFor,
  author: 'System',
  version: definition.version
});

export const loadToolPool = async (): Promise<ToolPoolItem[]> => {
  return TOOL_REGISTRY.map(mapDefinitionToPoolItem);
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
