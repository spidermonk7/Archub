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

    def __init__(self, source: BaseNode, target: BaseNode, edge_type: str = "HARD", id = None, emit=None, run_id: str | None = None, team_id: str | None = None):
        self.edge_id = id if id else f"{source.id}_to_{target.id}"
        self.edge_description = f"Edge from {source.id} to {target.id}"
        
        self.source_node = source
        self.target_node = target

        self.edge_type = edge_type
        self.emit = emit or (lambda _e: None)
        self.run_id = run_id
        self.team_id = team_id


    def communicate(self):
        """Communicate message from source to target node."""
        message = self.source_node.send()
        if len(message) == 0:
            print(f"⚠️ Edge {self.edge_id}: No message to communicate from source node {self.source_node.id}.")
            return
        
        print(f"Source: {self.source_node.id} sending message to Target: {self.target_node.id} via Edge: {self.edge_id}")
        try:
            self.emit({
                'type': 'edge.message.sent',
                'runId': self.run_id,
                'teamId': self.team_id,
                'edge': {
                    'id': self.edge_id,
                    'source': self.source_node.id,
                    'target': self.target_node.id,
                    'edgeType': self.edge_type,
                },
                'messages': [{
                    'maker': getattr(m, 'maker', None),
                    'target': getattr(m, 'target_agent', None),
                    'timetag': getattr(m, 'timetag', None),
                    'content': getattr(m, 'content', ''),
                    'preview': (getattr(m, 'content', '') or '')[:120],
                } for m in message],
                'meta': {'count': len(message)},
            })
            # Mark source node as done upon sending messages
            self.emit({
                'type': 'node.state.done',
                'runId': self.run_id,
                'teamId': self.team_id,
                'node': {'id': self.source_node.id, 'name': getattr(self.source_node, 'name', self.source_node.id)},
            })
        except Exception:
            pass
        self.target_node.receive(message)
        print(f"✅ Edge {self.edge_id}: Message communicated from {self.source_node.id} to {self.target_node.id}.")
        print(f"Length of target node {self.target_node.id} received messages: {len(self.target_node.received)}")

