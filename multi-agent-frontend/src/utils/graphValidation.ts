import { Node, Edge } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * 验证图形的连通性和基本结构
 */
export function validateGraph(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 检查是否有输入和输出节点
  const inputNodes = nodes.filter(node => node.type === 'input');
  const outputNodes = nodes.filter(node => node.type === 'output');

  if (inputNodes.length === 0) {
    errors.push('图中必须包含至少一个输入节点');
  }

  if (outputNodes.length === 0) {
    errors.push('图中必须包含至少一个输出节点');
  }

  if (inputNodes.length === 0 || outputNodes.length === 0) {
    return { isValid: false, errors, warnings };
  }

  // 2. 检查输入节点到输出节点的连通性
  const connectivityResult = checkInputOutputConnectivity(nodes, edges, inputNodes, outputNodes);
  if (!connectivityResult.isConnected) {
    errors.push(...connectivityResult.errors);
  }

  // 3. 检查是否有孤立的节点（除了输入和输出节点的某些特殊情况）
  const isolatedNodes = findIsolatedNodes(nodes, edges);
  if (isolatedNodes.length > 0) {
    const isolatedNodeNames = isolatedNodes.map(node => node.name).join(', ');
    warnings.push(`发现孤立节点（没有连接）: ${isolatedNodeNames}`);
  }

  // 4. 检查是否有环路（虽然某些情况下环路可能是合理的）
  const hasCycles = detectCycles(nodes, edges);
  if (hasCycles) {
    warnings.push('图中存在环路，请确认这是预期的行为');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 检查输入节点到输出节点的连通性
 */
function checkInputOutputConnectivity(
  nodes: Node[], 
  edges: Edge[], 
  inputNodes: Node[], 
  outputNodes: Node[]
): { isConnected: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 构建邻接表
  const adjacencyList = buildAdjacencyList(nodes, edges);
  
  // 检查每个输入节点是否能到达至少一个输出节点
  for (const inputNode of inputNodes) {
    const reachableOutputs = findReachableOutputNodes(inputNode.id, outputNodes, adjacencyList);
    if (reachableOutputs.length === 0) {
      errors.push(`输入节点 "${inputNode.name}" 无法到达任何输出节点`);
    }
  }

  // 检查每个输出节点是否能从至少一个输入节点到达
  for (const outputNode of outputNodes) {
    const canReachFromInputs = canReachFromInputNodes(outputNode.id, inputNodes, adjacencyList);
    if (!canReachFromInputs) {
      errors.push(`输出节点 "${outputNode.name}" 无法从任何输入节点到达`);
    }
  }

  return {
    isConnected: errors.length === 0,
    errors
  };
}

/**
 * 构建邻接表表示图
 */
function buildAdjacencyList(nodes: Node[], edges: Edge[]): Map<string, string[]> {
  const adjacencyList = new Map<string, string[]>();
  
  // 初始化所有节点
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
  });
  
  // 添加边
  edges.forEach(edge => {
    const neighbors = adjacencyList.get(edge.source) || [];
    neighbors.push(edge.target);
    adjacencyList.set(edge.source, neighbors);
  });
  
  return adjacencyList;
}

/**
 * 使用BFS查找从指定节点可达的输出节点
 */
function findReachableOutputNodes(
  startNodeId: string, 
  outputNodes: Node[], 
  adjacencyList: Map<string, string[]>
): Node[] {
  const visited = new Set<string>();
  const queue = [startNodeId];
  const reachableOutputs: Node[] = [];
  
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    
    if (visited.has(currentNodeId)) {
      continue;
    }
    
    visited.add(currentNodeId);
    
    // 检查当前节点是否是输出节点
    const outputNode = outputNodes.find(node => node.id === currentNodeId);
    if (outputNode) {
      reachableOutputs.push(outputNode);
    }
    
    // 添加邻居节点到队列
    const neighbors = adjacencyList.get(currentNodeId) || [];
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        queue.push(neighborId);
      }
    });
  }
  
  return reachableOutputs;
}

/**
 * 检查指定节点是否能从输入节点到达（反向搜索）
 */
function canReachFromInputNodes(
  targetNodeId: string, 
  inputNodes: Node[], 
  adjacencyList: Map<string, string[]>
): boolean {
  // 构建反向邻接表
  const reverseAdjacencyList = buildReverseAdjacencyList(adjacencyList);
  
  const visited = new Set<string>();
  const queue = [targetNodeId];
  
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    
    if (visited.has(currentNodeId)) {
      continue;
    }
    
    visited.add(currentNodeId);
    
    // 检查当前节点是否是输入节点
    const isInputNode = inputNodes.some(node => node.id === currentNodeId);
    if (isInputNode) {
      return true;
    }
    
    // 添加前驱节点到队列
    const predecessors = reverseAdjacencyList.get(currentNodeId) || [];
    predecessors.forEach(predecessorId => {
      if (!visited.has(predecessorId)) {
        queue.push(predecessorId);
      }
    });
  }
  
  return false;
}

/**
 * 构建反向邻接表
 */
function buildReverseAdjacencyList(adjacencyList: Map<string, string[]>): Map<string, string[]> {
  const reverseAdjacencyList = new Map<string, string[]>();
  
  // 初始化
  adjacencyList.forEach((_, nodeId) => {
    reverseAdjacencyList.set(nodeId, []);
  });
  
  // 构建反向边
  adjacencyList.forEach((neighbors, nodeId) => {
    neighbors.forEach(neighborId => {
      const predecessors = reverseAdjacencyList.get(neighborId) || [];
      predecessors.push(nodeId);
      reverseAdjacencyList.set(neighborId, predecessors);
    });
  });
  
  return reverseAdjacencyList;
}

/**
 * 查找孤立节点
 */
function findIsolatedNodes(nodes: Node[], edges: Edge[]): Node[] {
  const connectedNodeIds = new Set<string>();
  
  // 收集所有在边中出现的节点ID
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  
  // 查找没有连接的节点
  return nodes.filter(node => !connectedNodeIds.has(node.id));
}

/**
 * 检测图中是否存在环路
 */
function detectCycles(nodes: Node[], edges: Edge[]): boolean {
  const adjacencyList = buildAdjacencyList(nodes, edges);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  // 对每个未访问的节点进行DFS
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycleDFS(node.id, adjacencyList, visited, recursionStack)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 使用DFS检测环路
 */
function hasCycleDFS(
  nodeId: string,
  adjacencyList: Map<string, string[]>,
  visited: Set<string>,
  recursionStack: Set<string>
): boolean {
  visited.add(nodeId);
  recursionStack.add(nodeId);
  
  const neighbors = adjacencyList.get(nodeId) || [];
  for (const neighborId of neighbors) {
    if (!visited.has(neighborId)) {
      if (hasCycleDFS(neighborId, adjacencyList, visited, recursionStack)) {
        return true;
      }
    } else if (recursionStack.has(neighborId)) {
      return true; // 发现后向边，存在环路
    }
  }
  
  recursionStack.delete(nodeId);
  return false;
}

/**
 * 生成验证结果的用户友好描述
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.isValid) {
    return '图形验证通过！';
  }
  
  let message = '图形验证失败：\n\n';
  
  if (result.errors.length > 0) {
    message += '错误：\n';
    result.errors.forEach((error, index) => {
      message += `${index + 1}. ${error}\n`;
    });
  }
  
  if (result.warnings && result.warnings.length > 0) {
    message += '\n警告：\n';
    result.warnings.forEach((warning, index) => {
      message += `${index + 1}. ${warning}\n`;
    });
  }
  
  return message.trim();
}