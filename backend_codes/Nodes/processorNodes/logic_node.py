import sys
import os
import re

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from Nodes.base_node import BaseNode



class RandomAbandonNode(BaseNode):
    """A Node that randomly abandons received messages."""

    def __init__(self, name: str):
        super().__init__(name)
        self.type = "Logic:Random_Abandon-Node"

    def receive(self, input_data):
        """Receive input data or messages."""
        self.received.append(input_data)
        print(f"{self.name} received data: {input_data}")

    def process(self):
        """Randomly abandon the received data."""
        import random
        if not self.received:
            print(f"{self.name} has no data to process.")
            return
        
        for data in self.received:
            if random.choice([True, False]):
                self.processed.append(data)
                print(f"{self.name} kept data: {data}")
            else:
                print(f"{self.name} abandoned data: {data}")

    def show(self):
        """Display or visualize the node's state."""
        print(f"Node Name: {self.name}")
        print(f"Node Type: {self.type}")
        print(f"Received Messages: {self.received}")
        print(f"Processed Messages: {self.processed}")


    def reset(self):
        """Reset the node's state."""
        super().reset()


