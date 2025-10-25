import sys
import os

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
    def __init__(self, 
        goal = "Empty Goal", 
        config = None, 
        ):
        super().__init__()

        self.config = config

        print(f"团队配置内容: {self.config}")

        self.team_id = self.config.get('name', None)
        self.goal = goal
   
        self.nodes = {}
        self.edges = {}


        self.register_nodes()
        self.register_edges()


    def register_nodes(self):
        for node_config in self.config['nodes']:
            print(f"节点类型: {node_config['type']}")
            if node_config['type'].lower() == 'agent':
                node = AgentNode(
                    name = node_config['name'], 
                    id = node_config.get('id', None), 
                    model_name = node_config['config'].get('model', 'gpt-4o-mini'),
                    tools=[], 
                    system_prompt = node_config['config'].get('systemPrompt', ''),
                    agent_resume = node_config['config'].get('description', ''),
                )

                self.nodes[node.id] = node 
                print(f"✅ 注册节点: {node.name} (ID: {node.id})")

            elif node_config['type'].lower() == 'input':
                node = BaseProcedureNode(
                    name = node_config['name'], 
                    id = node_config.get('id', None)
                )
                
                initial_message = SimpleMessageCreator().create_message(
                    content = self.goal,
                    maker = "System",
                    target_agent = None
                )
                node.receive([initial_message])

                self.nodes[node.id] = node
                print(f"✅ 注册输入节点: {node.name} (ID: {node.id})")
            elif node_config['type'].lower() == 'output':
                node = BaseProcedureNode(
                    name = node_config['name'], 
                    id = node_config.get('id', None)
                )
                self.nodes[node.id] = node
                print(f"✅ 注册输出节点: {node.name} (ID: {node.id})")
              
            else:
                print(f"❌ 未知节点类型: {node['type']}")



    def register_edges(self):
        print(self.config['edges'])
        for edge_config in self.config['edges']:
            source_id = edge_config['source']
            target_id = edge_config['target']
            edge_type = edge_config.get('type', 'HARD').upper()

            if source_id in self.nodes and target_id in self.nodes:
                edge = BaseEdge(
                    source=self.nodes[source_id],
                    target=self.nodes[target_id],
                    edge_type=edge_type, 
                    id = None
                )
                self.edges[edge.edge_id] = edge
                print(f"✅ 注册边: {edge.edge_id} (源: {source_id}, 目标: {target_id}, 类型: {edge_type})")
            else:
                print(f"❌ 无法注册边: {edge_config} (源或目标节点不存在)") 

    def global_process(self):
        for node_id, node in self.nodes.items():
            node.process()
            node.received = []  # Clear received messages after processing    
        
    


    def global_communicate(self):
        for edge_id, edge in self.edges.items():
            edge.communicate()

        for node_id, node in self.nodes.items():
            print(f"{node.name} 处理后消息数量: {len(node.processed)}")
            node.processed = []  # Clear processed messages after communication


       
    def run(self):
        debug_counts = 0
        # TODO: Ending Condition
        out_node = self.nodes['output-node']

        while debug_counts < 5:
            # Color print process stage
            self.global_process()
            self.global_communicate()
            self.check_received_status()
            if len(out_node.received) > 0:
                print(f"OutNode received is: {out_node.received}")
                msg = out_node.received[-1]
                print(f"Type of msg: {type(msg)}")
                return msg.content
            debug_counts += 1
       
        return "No Output Generated"

    def check_received_status(self):
        for node_id, node in self.nodes.items():
            print(f"节点 {node.name} (ID: {node.id}) 已接收消息数量: {len(node.received)}")

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