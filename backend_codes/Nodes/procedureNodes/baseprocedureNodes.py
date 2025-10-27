from abc import ABC, abstractmethod
import sys
import os
import time

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Nodes.base_node import BaseNode

class BaseProcedureNode(BaseNode):
    """Base class for all Procedure Nodes."""

    def __init__(self, name: str, id = None, emit=None, run_id: str | None = None, team_id: str | None = None):
        super().__init__(name, id, emit=emit, run_id=run_id, team_id=team_id)
        self.type = None # as a marker of LLM node, agent node or logic node
        self.processed = []
        self.received = []
        self.resume_info = None


    def receive(self, message):
        """Receive input data or messages."""
        self.received.extend(message)


    def process(self):
        # Only emit processing events when there is actual input
        if not self.received:
            return
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
        for message in self.received:
            self.processed.append(message)
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
                } for m in self.processed],
                'meta': {'producedCount': len(self.processed)},
            })
        except Exception:
            pass

    def send(self):
        """Send output data or messages."""
        message = self.processed
        return message
        

