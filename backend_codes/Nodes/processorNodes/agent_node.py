import sys
import os
import re

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Messages.simpleMessage import SimpleMessage, SimpleMessageCreator
from Nodes.base_node import BaseNode
from camel.agents import ChatAgent



class AgentNode(BaseNode):
    """A Node that utilizes a Camel Chat Agent for processing."""

    def __init__(self, name: str, 
                 model_name: str = "gpt-4o-mini", 
                 system_prompt: str = "You are a helpful assistant.", 
                 tools: list = [], 
                 agent_resume = "An AI agent designed to assist with various tasks.", 
                 id = None,
                 emit=None,
                 run_id: str | None = None,
                 team_id: str | None = None,
                 ):
        super().__init__(name, id, emit=emit, run_id=run_id, team_id=team_id)
        self.type = "Chat_Agent-Node"
        self.model_name = model_name  
        self.system_prompt = system_prompt


        self.agent = ChatAgent(
            model=self.model_name,
            system_message=self.system_prompt,
            tools=tools, 
        )
        self.resume_info = agent_resume


    def parse_received(self, data: SimpleMessage): 
        if isinstance(data, SimpleMessage):
            return data.to_str()
        elif isinstance(data, list):
            combined_content = "\n".join([msg.to_str() for msg in data if isinstance(msg, SimpleMessage)])
            return combined_content
    

    def receive(self, input_data: SimpleMessage):
        """Receive input data or messages."""
        self.received.extend([input_data] if not isinstance(input_data, list) else input_data)
       

    def process(self):
        """Process the received data using the LLM."""
        if not self.received:
            print(f"{self.name} has no data to process.")
            return

        # Emit start once per processing call when there is input
        try:
            self.emit({
                'type': 'node.processing.started',
                'runId': self.run_id,
                'teamId': self.team_id,
                'node': {'id': self.id, 'name': self.name},
                'meta': {'receivedCount': len(self.received)},
            })
        except Exception:
            pass

        for data in self.received:
            data = self.parse_received(data)
            try:
                print(f"[ATTENTION!]Node {self.type}-{self.name} with model {self.model_name} processing data: \n{data}")
                processed_data = self.agent.step(data).msgs[0].content
            except Exception as e:
                print(f"Node {self.type}-{self.name} with model {self.model_name} processing error: {e}")
                processed_data = None
            processed_data = SimpleMessageCreator().create_message(content=self.parse_processed(processed_data), maker=self.name, target_agent='stage_manager')
            self.processed.append(processed_data)
            print(f"[SUCCESS!]Node {self.type}-{self.name} with model {self.model_name} finished processing data.")
            print(f"Processed data: \n{processed_data.content}")

        # Emit finished once after completing processing of all inputs
        try:
            self.emit({
                'type': 'node.processing.finished',
                'runId': self.run_id,
                'teamId': self.team_id,
                'node': {'id': self.id, 'name': self.name},
                'messages': [{
                    'maker': getattr(m, 'maker', None),
                    'target': getattr(m, 'target_agent', None),
                    'timetag': getattr(m, 'timetag', None),
                    'preview': (getattr(m, 'content', '') or '')[:120],
                } for m in self.processed[-len(self.received):] if self.received],
                'meta': {'producedCount': len(self.processed)},
            })
        except Exception:
            pass


    def show(self):
        """Display or visualize the node's state."""
        print(f"Node Name: {self.name}")
        print(f"Node Type: {self.type}")
        print(f"LLM Model: {self.model_name}")
        print(f"Received Data: {self.received}")
        print(f"Processed Data: {self.processed}")

    def reset(self,):
        """Reset the node's state."""
        super().reset()
       
    def reset_agent(self,):
        """Reset the agent state, but keep the history."""
        self.agent.reset()
     

