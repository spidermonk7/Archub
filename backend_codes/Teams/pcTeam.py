import sys
import os

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Nodes.base_node import BaseNode
from Nodes.stageNodes.taskTeamStage import StageManagerNode
from Teams.baseTeam import BaseTeam
from utils import parse_team


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
class PCTeam(BaseTeam):
    def __init__(self, 
        goal = "Empty Goal", 
        nodes = [], 
        instructions = None, 
        use_chat_stage_manager = True,
        manager_model = ('openai', 'gpt-4o'),
        manager_version = "searchqa_ablation"
        ):
        super().__init__()

        self.goal = goal
        self.node_colors = {}
        self.use_chat_stage_manager = use_chat_stage_manager
        self.manager_model = manager_model
        self.instructions = instructions
        self.manager_version = manager_version
        self.initialize(nodes=nodes)
        self.max_replan_times = 3

        
        


    def initialize(self, nodes):
        """Initialize the stage """
        self.register_nodes(nodes)
        
        team_member_info = {}
        for node in nodes:
            team_member_info[node.name] = node.resume_info if hasattr(node, 'resume_info') else "No resume info."

        team_member_info = parse_team(team_member_info)

        self.stage_manager = StageManagerNode(
            name="stage_manager", 
            team_goal=self.goal,
            team_member_info=team_member_info,
            use_chat_agent=self.use_chat_stage_manager,
            model_info=self.manager_model,
            version = self.manager_version
        )

        self.register_nodes(self.stage_manager)
       
    def run(self):
        
        debug_counts = 0
        while not self.stage_manager.goal_achieved and debug_counts < 10:
            # Color print process stage
            print(f"="*50)
            print(f"Round {debug_counts+1} of processing and communication begins:")
            self.global_process()
            returned_msg = self.global_communicate()
            debug_counts += 1
            if self.stage_manager.out_of_league:
                break

        return returned_msg

    
    def global_process(self):
        # 所有Node，都进行Process
        for key, node in self.nodes.items():
            node.process()
            if key != "stage_manager":
                node.reset_agent()
            node.received = []  # 清空接收列表，准备下一轮接收

    def global_communicate(self):
        if self.stage_manager.goal_achieved:
            print(f"\033[32m🎉 Task Completed! Final Answer:\n {self.stage_manager.final_answer} \033[0m")  # green
            return self.stage_manager.final_answer
        # 所有Node，根据他们手里的信息类型，进行communicate
        for key, node in self.nodes.items():
            current_tobesent = node.send()
            for msg in current_tobesent:
                if self.stage_manager.goal_achieved:
                    print(f"\033[32m🎉 Task Completed! Final Answer:\n {self.stage_manager.final_answer} \033[0m")  # green
                    return self.stage_manager.final_answer
                elif self.stage_manager.out_of_league:
                    print(f"\033[31m❌ Task Failed! Out of League. \033[0m")  # red
                    return "Out of League"
                target = msg.target_agent
                self.nodes[target].receive([msg])
                print(f"📡: {node.name} → {target}:\n {msg.content}")

        # Sorting all nodes msg according to the timetag, earlier goes first
        for key, node in self.nodes.items():
            print(f"📝 Node {node.name}'s recieving list size is: {len(node.received)}")
            node.received.sort(key=lambda x: x.timetag)
            # clear | reset the processed messages after sending
            node.processed = []

    def register_nodes(self, nodes):
        """Register nodes in the team and assign colors."""
        if isinstance(nodes, list):
            for node in nodes:
                self.nodes[node.name.lower()] = node
        elif isinstance(nodes, BaseNode):
            self.nodes[nodes.name.lower()] = nodes
        else:
            raise ValueError("Nodes should be a list of BaseNode instances or a single BaseNode instance.")

        # 每次注册完后，更新颜色映射
        for i, name in enumerate(self.nodes.keys()):
            self.node_colors[name] = COLORS[i % len(COLORS)]



    def reset(self):
        """Reset the team to its initial state."""
        for node in self.nodes.values():
            node.reset()
        self.stage.reset()


    def save(self):
        """Save the current state of the team."""

        # Save the plan: subtasks
        with open("Task_Recording.txt", "w") as f:
            f.write("\n".join(self.stage.subtasks))
            f.write("\n\n")

        with open("Task_Recording.txt", "a") as f:
            f.write("\n".join(self.stage.history))


# An Agent Team for task completion
class PCTaskTeam(BaseTeam):
    def __init__(self, 
        goal = "Empty Goal", 
        nodes = [], 
        instructions = None,
        use_chat_stage_manager = True
        ):
        super().__init__()

        self.goal = goal
        self.node_colors = {}
        self.use_chat_stage_manager = use_chat_stage_manager
        self.instructions = instructions
        self.initialize(nodes=nodes)
        self.max_replan_times = 3



    def initialize(self, nodes):
        """Initialize the stage """
        self.register_nodes(nodes)
        
        team_member_info = {}
        for node in nodes:
            team_member_info[node.name] = node.resume_info if hasattr(node, 'resume_info') else "No resume info."

        self.stage_manager = StageManagerNode(
            name="stage_manager", 
            team_goal=self.goal,
            team_member_info=team_member_info,
            system_prompt_path="Nodes\\stageNodes\\templates\\task_completion\\stage_manager_system.md",
            use_chat_agent=self.use_chat_stage_manager,
        )

        self.register_nodes(self.stage_manager)

    def run(self):
        
        debug_counts = 0
        while not self.stage_manager.goal_achieved and debug_counts < 10:
            # Color print process stage
            print(f"="*50)
            print(f"Round {debug_counts+1} of processing and communication begins:")
            print(f"\033[33m🚦 Team members are processing \033[0m")  # yellow
            self.global_process()
            print(f"\033[32m📡 Team members are communicating \033[0m")  # yellow
            self.global_communicate()
            debug_counts += 1
            if self.stage_manager.out_of_league:
                break

        return self.stage_manager.final_answer

    
    def global_process(self):
        # 所有Node，都进行Process
        for key, node in self.nodes.items():
            node.process()
            node.reset_agent()

            node.received = []  # 清空接收列表，准备下一轮接收

    def global_communicate(self):
        if self.stage_manager.goal_achieved:
            print(f"\033[32m🎉 Task Completed! Final Answer:\n {self.stage_manager.final_answer} \033[0m")  # green
            return self.stage_manager.final_answer
        # 所有Node，根据他们手里的信息类型，进行communicate
        for key, node in self.nodes.items():
            current_tobesent = node.send()
            for msg in current_tobesent:
                if self.stage_manager.goal_achieved:
                    print(f"\033[32m🎉 Task Completed! Final Answer:\n {self.stage_manager.final_answer} \033[0m")  # green
                    return self.stage_manager.final_answer
                elif self.stage_manager.out_of_league:
                    print(f"\033[31m❌ Task Failed! Out of League. \033[0m")  # red
                    return "Out of League"
                target = msg.target_agent
                self.nodes[target].receive([msg])
                print(f"📡: {node.name} → {target}:\n {msg.content}")

        # Sorting all nodes msg according to the timetag, earlier goes first
        for key, node in self.nodes.items():
            print(f"📝 Node {node.name}'s recieving list size is: {len(node.received)}")
            node.received.sort(key=lambda x: x.timetag)
            # clear | reset the processed messages after sending
            node.processed = []

    def register_nodes(self, nodes):
        """Register nodes in the team and assign colors."""
        if isinstance(nodes, list):
            for node in nodes:
                self.nodes[node.name.lower()] = node
        elif isinstance(nodes, BaseNode):
            self.nodes[nodes.name.lower()] = nodes
        else:
            raise ValueError("Nodes should be a list of BaseNode instances or a single BaseNode instance.")

        # 每次注册完后，更新颜色映射
        for i, name in enumerate(self.nodes.keys()):
            self.node_colors[name] = COLORS[i % len(COLORS)]



    def reset(self):
        """Reset the team to its initial state."""
        for node in self.nodes.values():
            node.reset()
        self.stage.reset()


    def save(self):
        """Save the current state of the team."""

        # Save the plan: subtasks
        with open("Task_Recording.txt", "w") as f:
            f.write("\n".join(self.stage.subtasks))
            f.write("\n\n")

        with open("Task_Recording.txt", "a") as f:
            f.write("\n".join(self.stage.history))


