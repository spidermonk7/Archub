import sys
import os
import re

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Messages.simpleMessage import SimpleMessage, SimpleMessageCreator
from Nodes.base_node import BaseNode
import openai



class LLMNode(BaseNode):
    """A Node that utilizes a Large Language Model (LLM) for processing."""

    def __init__(self, name: str, model_name: str = "gpt-4o-mini", system_prompt: str = "You are a helpful assistant."):
        super().__init__(name)
        self.type = "LLM-Node"
        self.model_name = model_name  #
        self.system_prompt = system_prompt


    def parse_received(self, data: SimpleMessage, pattern = None):
        # Remained to be solved!
        return data


    def receive(self, input_data: SimpleMessage, pattern=None):
        """Receive input data or messages."""
    
        self.received.extend(input_data if isinstance(input_data, list) else [input_data])

        print(f"{self.name} received data: {input_data}")


    
    def process(self):
        """Process the received data using the LLM."""
        if not self.received:
            print(f"{self.name} has no data to process.")
            return
        
        for data in self.received:
            data = self.parse_received(data)
            try:
                processed_data = openai.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": data}
                    ]
                ).choices[0].message.content.strip()

            except Exception as e:
                print(f"Node {self.type}-{self.name} with model {self.model_name} processing error: {e}")
                processed_data = None
            print(f"Raw processed data: {processed_data}")

            processed_data = self.parse_processed(processed_data)

            processed_data = SimpleMessageCreator().create_message(content=processed_data, maker=self.name)
            self.processed.append(processed_data)
            print(f"{self.name} processed data: {processed_data}")

    def show(self): 
        """Display or visualize the node's state."""
        print(f"Node Name: {self.name}")
        print(f"Node Type: {self.type}")
        print(f"Model Name: {self.model_name}")
        print(f"System Prompt: {self.system_prompt}")
        print(f"Received Messages: {self.received}")
        print(f"Processed Messages: {self.processed}")

    def reset(self):
        """Reset the node's state."""
        super().reset()
       
