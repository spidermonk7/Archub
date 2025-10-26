import { validateGraph } from '../src/utils/graphValidation';

// 创建测试数据
const testNodes = [
  {
    id: 'input-node',
    name: '用户输入',
    type: 'input',
    description: '接收用户输入的入口节点',
    config: {},
    position: { x: 100, y: 200 },
  },
  {
    id: 'output-node', 
    name: '结果输出',
    type: 'output',
    description: '向用户返回结果的出口节点',
    config: {},
    position: { x: 600, y: 200 },
  },
  {
    id: 'agent-node',
    name: '处理智能体',
    type: 'agent',
    description: '处理用户请求的智能体',
    config: {},
    position: { x: 350, y: 200 },
  }
];

// 测试场景1：没有连接的图（应该失败）
const testEdges1 = [];

// 测试场景2：有连接的图（应该成功）
const testEdges2 = [
  {
    id: 'edge1',
    source: 'input-node',
    target: 'agent-node',
    type: 'hard',
    config: { description: '输入到智能体' }
  },
  {
    id: 'edge2',
    source: 'agent-node',
    target: 'output-node',
    type: 'hard',
    config: { description: '智能体到输出' }
  }
];

console.log('=== 测试场景1：没有连接的图 ===');
const result1 = validateGraph(testNodes, testEdges1);
console.log('结果:', result1);

console.log('\n=== 测试场景2：有连接的图 ===');
const result2 = validateGraph(testNodes, testEdges2);
console.log('结果:', result2);

// 测试场景3：只有输入节点
const inputOnlyNodes = [testNodes[0]]; // 只有输入节点
console.log('\n=== 测试场景3：只有输入节点 ===');
const result3 = validateGraph(inputOnlyNodes, []);
console.log('结果:', result3);