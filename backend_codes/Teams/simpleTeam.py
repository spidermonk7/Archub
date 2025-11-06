import sys
import os
from collections import defaultdict

from typing import Any, Dict, List, Optional

from networkx import config, nodes

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Nodes.base_node import BaseNode
from Nodes.processorNodes.agent_node import AgentNode
from Nodes.procedureNodes.baseprocedureNodes import BaseProcedureNode
from Nodes.stageNodes.taskTeamStage import StageManagerNode
from Messages.simpleMessage import SimpleMessageCreator
from Teams.baseTeam import BaseTeam
from utils import parse_team
import yaml
from Edges.baseEdge import BaseEdge
from Tools.Basic.tools_pool import load_tool
from Nodes.logicNodes.goThroughNode import GoThroughNode

from dotenv import load_dotenv
load_dotenv()

# 颜色列表 (循环使用)
COLORS = [
    "\033[31m",  # red
    "\033[32m",  # green
    "\033[33m",  # yellow
    "\033[34m",  # blue
    "\033[35m",  # magenta
    "\033[36m",  # cyan
    "\033[37m",  # white
]
RESET = "\033[0m"

# An Agent Team for question answering
class SimpleTeam(BaseTeam):
    def __init__(
        self,
        goal: str = "Empty Goal",
        config: Optional[Dict[str, Any]] = None,
        emit=None,
        run_id: str | None = None,
        input_attachments: Optional[List[Dict[str, Any]]] = None,
        ):
        super().__init__()

        self.config = config

        # print(f"团队配置内容: {self.config}")

        self.team_id = self.config.get('name', None)
        self.goal = goal
        self.emit = emit or (lambda _e: None)
        self.run_id = run_id
        self.initial_attachments: List[Dict[str, Any]] = list(input_attachments or [])
   
        self.nodes = {}
        self.edges = {}
        self.edges_by_source = defaultdict(list)
        self.output_node_id = None


        self.register_nodes()
        self.register_edges()


    def register_nodes(self):
        for node_config in self.config['nodes']:
            print(f"节点类型: {node_config['type']}")
            if node_config['type'].lower() == 'agent':
                tools = []
                for tool_name in node_config['config'].get('tools', []):
                    print(f"Trying To Load Tool: {tool_name}")
                    tool_instances = load_tool(tool_name)
                    tools.extend(tool_instances)
                
                try:
                    node = AgentNode(
                        name = node_config['name'], 
                        id = node_config.get('id', None), 
                        model_name = node_config['config'].get('model', 'gpt-4o-mini'),
                        system_prompt = node_config['config'].get('systemPrompt', ''),
                        agent_resume = node_config['config'].get('description', ''),
                        emit=self.emit,
                        run_id=self.run_id,
                        team_id=self.team_id,
                        tools = tools,
                    )
                except Exception as e:
                    print(f"❌ 无法创建代理节点: {e}")
                    continue

                self.nodes[node.id] = node 
                print(f"✅ 注册节点: {node.name} (ID: {node.id})")

            elif node_config['type'].lower() == 'input':
                node = BaseProcedureNode(
                    name = node_config['name'], 
                    id = node_config.get('id', None),
                    emit=self.emit,
                    run_id=self.run_id,
                    team_id=self.team_id,
                )
                
                initial_message = SimpleMessageCreator().create_message(
                    content = self.goal,
                    maker = "System",
                    target_agent = None,
                    attachments=self.initial_attachments if self.initial_attachments else None,
                )
                node.receive([initial_message])

                self.nodes[node.id] = node
                print(f"✅ 注册输入节点: {node.name} (ID: {node.id})")
            elif node_config['type'].lower() == 'logic':
                logic_type = node_config.get('config', {}).get('logicType', 'go-through').lower()
                try:
                    if logic_type in ('go-through', 'go_through', 'gothrough'):
                        node = GoThroughNode(
                            name=node_config['name'],
                            id=node_config.get('id', None),
                            emit=self.emit,
                            run_id=self.run_id,
                            team_id=self.team_id,
                            logic_type=logic_type,
                        )
                    else:
                        print(f"⚠️ 未知的逻辑节点类型: {logic_type}")
                        continue
                except Exception as e:
                    print(f"⚠️ 无法创建逻辑节点: {e}")
                    continue

                self.nodes[node.id] = node
                print(f"✅ 注册逻辑节点: {node.name} (ID: {node.id}, 类型: {logic_type})")

            elif node_config['type'].lower() == 'output':
                node = BaseProcedureNode(
                    name = node_config['name'], 
                    id = node_config.get('id', None),
                    emit=self.emit,
                    run_id=self.run_id,
                    team_id=self.team_id,
                )
                self.nodes[node.id] = node
                self.output_node_id = node.id
                print(f"✅ 注册输出节点: {node.name} (ID: {node.id})")
              
            else:
                print(f"❌ 未知节点类型: {node['type']}")



    def register_edges(self):
        print(self.config['edges'])
        for edge_config in self.config['edges']:
            source_id = edge_config['source']
            target_id = edge_config['target']
            edge_type = edge_config.get('type', 'HARD').upper()
            delay = edge_config.get('delay', 0)

            if source_id in self.nodes and target_id in self.nodes:
                edge = BaseEdge(
                    source=self.nodes[source_id],
                    target=self.nodes[target_id],
                    edge_type=edge_type,
                    delay=delay,
                    id=None,
                    emit=self.emit,
                    run_id=self.run_id,
                    team_id=self.team_id,
                )
                self.edges[edge.edge_id] = edge
                self.edges_by_source[source_id].append(edge)
                print(f"✅ 注册边: {edge.edge_id} (源: {source_id}, 目标: {target_id}, 类型: {edge_type})")
            else:
                print(f"❌ 无法注册边: {edge_config} (源或目标节点不存在)") 
    
    def run(self):
        output_id = self.output_node_id or 'output-node'
        if output_id not in self.nodes:
            raise ValueError('SimpleTeam requires an output node.')
        out_node = self.nodes[output_id]
      
        settings = self.config.get('settings', {}) if isinstance(self.config, dict) else {}
        max_ticks = settings.get('maxTicks', 5)
        current_tick = 0
       

        try:
            self.emit({
                'type': 'team.run.started',
                'runId': self.run_id,
                'teamId': self.team_id,
                'meta': {
                    'nodeCount': len(self.nodes),
                    'edgeCount': len(self.edges),
                }
            })
            for node in self.nodes.values():
                self.emit({
                    'type': 'node.state.waiting',
                    'runId': self.run_id,
                    'teamId': self.team_id,
                    'node': {'id': node.id, 'name': node.name},
                })
        except Exception:
            pass

        def is_system_stable() -> bool:
            """检查系统是否达到稳定状态：
            除了output node以外，没有任何其他node有received消息
            """
            # 检查除输出节点外的所有节点是否还有待处理的消息
            for node in self.nodes.values():
                if node.id != self.output_node_id and getattr(node, 'received', []):
                    print(f"节点 {node.id} 还有 {len(node.received)} 条待处理消息")
                    return False
                    
            print("系统已达到稳定状态：除输出节点外无待处理消息")
            return True

        def finalize() -> str | None:
            if not is_system_stable():
                return None
                
            msg = '\n'.join([getattr(m, 'content') for m in out_node.received])
            print(f"\n🏁 系统稳定，输出节点 {out_node.id} 收到最终消息:\n{msg}\n")
            try:
                self.emit({
                    'type': 'node.state.done',
                    'runId': self.run_id,
                    'teamId': self.team_id,
                    'node': {'id': out_node.id, 'name': out_node.name},
                })
            except Exception:
                pass
            try:
                self.emit({
                    'type': 'team.run.finished',
                    'runId': self.run_id,
                    'teamId': self.team_id,
                    'output': msg
                })
            except Exception:
                pass
            return msg

        final_output = None
        while current_tick < max_ticks:
            print(f"\n=== Tick {current_tick} ===")
            
            # 传递消息
            for edge in self.edges.values():
                edge.deliver(current_tick)

            # deliver后检查是否已经稳定，如果稳定就结束
            final_output = finalize()
            if final_output is not None:
                return final_output

            # 处理节点
            for node_id, node in self.nodes.items():
                if getattr(node, 'received', []):
                    node.process()
                    node.received = []
                    # 加载输出到边
                    for edge in self.edges_by_source.get(node_id, []):
                        edge.load()
 
            current_tick += 1
            
            
        print(f"Final output is: {final_output}")

        final_output = finalize()
        if final_output is not None:
            return final_output
        return 'No Output Generated'



    def reset(self):
        """Reset the team to its initial state."""
        for node in self.nodes.values():
            node.reset()
        self.stage.reset()




if __name__ == "__main__":
    print(f"当前运行时路径: {os.getcwd()}")
    print(f"系统路径: {sys.path}")

    config_path = "D:\\csy_projects\\Archub\\multi-agent-frontend\\SourceFiles\\multi-agent-graph-1761230571548.yaml"
    
    with open(config_path, 'r', encoding='utf-8') as file:
        config = yaml.safe_load(file)
    load_dotenv()

    team = SimpleTeam(
        goal="回答用户的问题: 什么是人工智能？",
        config = config
    )

    ans = team.run()

    print(f"\n🎉 团队运行完成，输出结果:\n{ans}\n")
