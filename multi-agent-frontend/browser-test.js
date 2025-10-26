// 简单测试验证函数
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
  }
];

// 没有边的情况
const testEdges = [];

// 在浏览器控制台中运行这段代码来测试
console.log('测试数据:', { nodes: testNodes, edges: testEdges });

// 如果你能在浏览器控制台中看到这个，那么可以手动调用：
// validateGraph(testNodes, testEdges);