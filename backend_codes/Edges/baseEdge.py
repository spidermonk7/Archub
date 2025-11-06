import os
import sys
from collections import defaultdict
from abc import ABC
from typing import Callable, DefaultDict, Iterable, List

# 鎶婇」鐩牴鐩綍鍔犲叆鎼滅储璺緞
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from Nodes.base_node import BaseNode
from Messages.simpleMessage import SimpleMessage

class BaseEdge(ABC):
    """Base class for all Edges with scheduler-aware communication."""

    def __init__(
        self,
        source: BaseNode,
        target: BaseNode,
        edge_type: str = "HARD",
        *,
        delay: int = 0,
        id=None,
        emit=None,
        run_id: str | None = None,
        team_id: str | None = None,
    ):
        self.edge_id = id if id else f"{source.id}_to_{target.id}"
        self.edge_description = f"Edge from {source.id} to {target.id}"

        self.source_node = source
        self.target_node = target

        self.edge_type = edge_type
        self.delay = max(0, int(delay or 0))
        self.emit = emit or (lambda _e: None)
        self.run_id = run_id
        self.team_id = team_id

        self.msg_queue = []


    def _flatten_messages(self, data):
        """递归展平嵌套列表，确保所有消息都在同一层级"""
        result = []
        if isinstance(data, list):
            for item in data:
                result.extend(self._flatten_messages(item))
        else:
            result.append(data)
        return result

    def deliver(self, current_tick: int) -> None:
        """Queue a message transfer via the provided scheduler."""
        messages_to_deliver = self.msg_queue if current_tick == self.delay+1 else []
        if not messages_to_deliver:
            return
        
        # 展平消息列表，避免嵌套列表问题
        flattened_messages = self._flatten_messages(messages_to_deliver)
        
        deliver_at = current_tick
        self.target_node.receive(flattened_messages)
        
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
                    'attachments': getattr(m, 'attachments', []),
                } for m in flattened_messages],
                'meta': {
                    'count': len(flattened_messages),
                    'deliveredAt': current_tick,
                },
            })
        except Exception:
            pass

        try:
            # Preserve legacy event so the UI can mark the source as having completed a send action.
            self.emit({
                'type': 'node.state.done',
                'runId': self.run_id,
                'teamId': self.team_id,
                'node': {
                    'id': self.source_node.id,
                    'name': getattr(self.source_node, 'name', self.source_node.id),
                },
                'meta': {'scheduledAt': current_tick, 'deliverAt': deliver_at},
            })
        except Exception:
            pass




    def load(self) -> None:
        """Load messages from the source node to the target node."""
        message = self.source_node.send()
        self.msg_queue.append(message)
