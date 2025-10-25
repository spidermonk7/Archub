import sys
import os

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from abc import ABC, abstractmethod
import sys
import os




class BaseTeam(ABC):
    """Base class for all Stages."""
    def __init__(self):
        self.nodes = {}
        self.connections = {}
      
    def initialize(self):
        """Initialize the team with nodes and connections."""
        pass

    @abstractmethod
    def run(self):
        """Run the team operations."""
        pass

    @abstractmethod
    def reset(self):
        """Reset the team to its initial state."""
        pass


    @abstractmethod
    def register_nodes(self):
        """Register nodes in the team."""
        pass





