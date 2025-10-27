from abc import ABC, abstractmethod
import sys
import os
import time

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Messages.simpleMessage import SimpleMessageCreator

class BaseNode(ABC):
    """Base class for all Nodes."""

    def __init__(self, name: str, id = None, emit=None, run_id: str | None = None, team_id: str | None = None):
        self.id = id if id is not None else f"node_{int(time.time()*1000)}"
        self.name = name
        self.type = None # as a marker of LLM node, agent node or logic node
    
        self.processed = []
        self.received = []
        self.resume_info = None
        self.emit = emit or (lambda _e: None)
        self.run_id = run_id
        self.team_id = team_id

    

    @abstractmethod
    def receive(self, *args, **kwargs):
        """Receive input data or messages."""
        pass

    @abstractmethod
    def process(self, *args, **kwargs):
        """Process the received data or messages."""
        pass

    def send(self):
        """Send output data or messages."""
        return self.processed


    def show(self):
        """Display or visualize the node's state."""
        pass

    def reset(self):
        """Reset the node's state."""
        self.processed = []
        self.received = []

    def parse_processed(self, output):
        """Parse processed data if needed."""



        
        return output
