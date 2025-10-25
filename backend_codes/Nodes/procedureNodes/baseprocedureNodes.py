from abc import ABC, abstractmethod
import sys
import os
import time

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Nodes.base_node import BaseNode

class BaseProcedureNode(BaseNode):
    """Base class for all Procedure Nodes."""

    def __init__(self, name: str, id = None):
        super().__init__(name, id)
        self.type = None # as a marker of LLM node, agent node or logic node
    
        self.processed = []
        self.received = []
        self.resume_info = None


    def receive(self, message):
        """Receive input data or messages."""
        self.received.extend(message)


    def process(self):
        for message in self.received:
            self.processed.append(message)

    def send(self):
        """Send output data or messages."""
        message = self.processed
        return message
        

