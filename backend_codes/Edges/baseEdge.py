import sys
import os

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from Nodes.base_node import BaseNode
from abc import ABC
import sys
import os




class BaseEdge(ABC):
    """Base class for all Edges."""

    def __init__(self, source: BaseNode, target: BaseNode, edge_type: str = "HARD", id = None):
        self.edge_id = id if id else f"{source.id}_to_{target.id}"
        self.edge_description = f"Edge from {source.id} to {target.id}"
        
        self.source_node = source
        self.target_node = target

        self.edge_type = edge_type


    def communicate(self):
        """Communicate message from source to target node."""
        message = self.source_node.send()
        if len(message) == 0:
            print(f"⚠️ Edge {self.edge_id}: No message to communicate from source node {self.source_node.id}.")
            return
        
        print(f"Source: {self.source_node.id} sending message to Target: {self.target_node.id} via Edge: {self.edge_id}")
        self.target_node.receive(message)
        print(f"✅ Edge {self.edge_id}: Message communicated from {self.source_node.id} to {self.target_node.id}.")
        print(f"Length of target node {self.target_node.id} received messages: {len(self.target_node.received)}")

