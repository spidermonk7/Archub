import sys
import os
import re
from camel.agents import ChatAgent
# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Nodes.base_node import BaseNode
from Messages.simpleMessage import SimpleMessageCreator
from utils import load_prompt_from_template, parse_json_from_str, raw_LLM_response
import openai

class StageManagerNode(BaseNode):
    """A node that manages stage operations."""
    """
    这个node来：接受不同Agent的输入，写入 ｜ 写出Stage ｜ 决定工作流走向
    这个Node发出的消息有两种：
    （1）给stage的输入：StageUpdateMessage
    （2）给其他Node的输出：SimpleMessage
    """

    def __init__(self, 
                name: str = "StageManager", 
                team_goal: str = "Complete the assigned task efficiently.",
                team_member_info: str = "Team members are capable and collaborative.",
                use_chat_agent: bool = True, 
                system_prompt_path = None, 
                model_info = None, 
                version = "searchqa_v1"
                 ):
        super().__init__(name)
        self.type = "Stage-Manager-Node"
        # 初始化阶段管理节点的特定属性
        self.use_chat_agent = use_chat_agent
        self.version = version
        self.system_prompt_path = system_prompt_path if system_prompt_path else \
            f"Nodes/stageNodes/templates/{self.version}/stage_manager_system.md"
        self.model_info = model_info if model_info else ('openai', 'gpt-4o')
        self.agent = ChatAgent(
            model= self.model_info,
            system_message=load_prompt_from_template(
                template_path=self.system_prompt_path,
                params={
                    'team_goal': team_goal,
                    'team_info': team_member_info,
                }
            ),
            tools=[] 
        )
     
         # 初始化任务团队阶段的特定属性
        self.team_member_info = team_member_info
        self.team_goal = team_goal
        self.todo_list = []
        self.current_stage = 0
        
        self.history = []

        self.started = False
        self.goal_achieved = False
        self.out_of_league = False
    

    
    def to_str(self):
        str_stage = load_prompt_from_template(
            template_path="Nodes/stageNodes/templates/default/taskTeamStageNode.md", 
            params={
                'goal': self.team_goal,
                'team_info': self.team_member_info,
                'subtasks': self.todo_list,
                'current_stage': self.todo_list[self.current_stage] if len(self.todo_list) else None,
                'history': self.parse_history(),
            }
        )
        return str_stage

    

     
    def parse_history(self):
        if not self.history or len(self.history) == 0:
            return "This is the first round of the task, no history yet.\n" + '-'*10
        history_str = ""
        for id, entry in enumerate(self.history):
            history_str += f"At Round {id+1}: \n {entry}" + '-'*10

        return history_str


    def send(self):
        """Send output data or messages."""
        return self.processed

    def process(self):
        """Process the received data or messages."""
        if self.started is True and len(self.received) == 0:
            print(f"\033[33m🛠️ Stage Manager has no new messages to process. \033[0m")  # yellow
            return

        print(f"\033[33m🛠️ Stage Manager processing {len(self.received)} messages")
        history_info = self.parse_history()
        if len(self.received) == 0:
            recieved_content = "This is the first round of the task, no recieved message yet."
        else:
            recieved_content = '\n'.join([self.parse_received(recieved) for recieved in self.received])
        
        input_msg = load_prompt_from_template(
            template_path=f"Nodes/stageNodes/templates/{self.version}/stage_manager_retrieve.md", 
            params={
                'history': history_info, 
                'message': recieved_content,
            }
        )
        if self.use_chat_agent: 
            manager_decision = self.agent.step(input_msg).msgs[0].content
        else:
            manager_decision = raw_LLM_response(
                prompt = input_msg,
                model = self.model_info[1],
                temperature=0.2,
                max_tokens=1000,
                system_message=load_prompt_from_template(
                    template_path=self.system_prompt_path,
                    params={
                        'team_goal': self.team_goal,
                        'team_info': self.team_member_info,
                    }
                )
            )
        try:
            parsed_decision = self.parse_processed(manager_decision)
        except Exception as e:
            print(f"\033[31m❌ Error parsing manager decision: {e}. Decision content: {manager_decision} \033[0m")  # red
            print(f"type of decision: {type(manager_decision)}")
            exit()
            return
        # self.todo_list = parsed_decision.get('global_plans', self.todo_list)
        
        try:
            self.current_stage = parsed_decision.get('next_step', self.current_stage)
            self.goal_achieved = parsed_decision.get('done', self.goal_achieved)
            self.final_answer = parsed_decision.get('final_answer', None)
            self.out_of_league = parsed_decision.get('out_of_league', self.out_of_league)
            print(f"Parsed keys: {parsed_decision.keys()}")
        except Exception as e:
            print(f"\033[31m❌ Error updating manager state: {e}. Parsed decision content: {parsed_decision} \033[0m")  # red
            print(f"Parsed keys: {parsed_decision.keys()}")
            return
        if self.out_of_league:
            print(f"Parsed keys: {parsed_decision.keys()}")
            print(f"\033[31m❌ The task is out of league for current team capability. Stopping further processing. \033[0m")  # red
        print(f"Parsed keys: {parsed_decision.keys()}")
        manager_decision_msg = SimpleMessageCreator().create_message(
            content = str(parsed_decision['next_step']) + "\n" + str(parsed_decision['detailed_message']),
            maker = self.name,
            target_agent = str(parsed_decision['next_agent']).lower(),
        )

        self.history.append(f"[{manager_decision_msg.timetag}] You send a message to agent '{manager_decision_msg.target_agent}' with detailed message: \n{manager_decision_msg.content}.\n")
        
        self.processed.append(manager_decision_msg)
        self.started = True


    def parse_processed(self, output: str):
        """Parse the manager's decision output."""
        return parse_json_from_str(output)


    # 接到所有信息，actor的，planner的，StageNode的
    def receive(self, input_data):
        """Receive input data or messages."""
        if not isinstance(input_data, list):
            input_data = [input_data]
        self.received.extend(input_data)

    def parse_received(self, data): 
        self.history.append(f"[{data.timetag}] You received a message from '{data.maker}' with content: \n{data.content}.\n")
        
        data = load_prompt_from_template(
            template_path=f"Nodes/stageNodes/templates/{self.version}/stage_manager_parse_received.md", 
            params={
                'source': data.maker,
                'content': data.content,
                'time': data.timetag,
            }
        )
       
        return data
    

    def show(self):
        """Display or visualize the node's state."""
        print(f"Stage Manager: {self.name}")
        for stage in self.stages:
            stage.show()


    def reset_agent(self,):
        """Reset the agent state, but keep the history."""
        self.agent.reset()