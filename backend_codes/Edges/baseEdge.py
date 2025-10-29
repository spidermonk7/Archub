import os
import sys
from abc import ABC

# 鎶婇」鐩牴鐩綍鍔犲叆鎼滅储璺緞
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from Nodes.base_node import BaseNode


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

    def communicate(self, scheduler, *, current_tick: int) -> None:
        """Queue a message transfer via the provided scheduler."""
        message = self.source_node.send()
        if len(message) == 0:
            print(f"⚠️ Edge {self.edge_id}: No message to communicate from source node {self.source_node.id}.")
            return

        deliver_at = current_tick + 1 + self.delay

        scheduler.schedule(
            self,
            message,
            scheduled_at=current_tick,
            deliver_at=deliver_at,
        )

        print(
            f"Source: {self.source_node.id} scheduled message to Target: {self.target_node.id} "
            f"via Edge: {self.edge_id} (deliver_at={deliver_at})"
        )

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

    def deliver(self, message, delivered_at: int, scheduled_at: int | None = None) -> None:
        """Deliver previously scheduled messages to the target node."""
        try:
            print(
                f"[Scheduler] delivering edge {self.edge_id} "
                f"(source={self.source_node.id} -> target={self.target_node.id}) "
                f"scheduled_at={scheduled_at}, delivered_at={delivered_at}, "
                f"message_count={len(message)}"
            )
        except Exception:
            pass

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
                'meta': {
                    'count': len(message),
                    'deliveredAt': delivered_at,
                    'scheduledAt': scheduled_at,
                    'delay': None if scheduled_at is None else max(0, delivered_at - scheduled_at),
                },
            })
        except Exception:
            pass

        self.target_node.receive(message)
        print(
            f"✅ Edge {self.edge_id}: Message delivered from {self.source_node.id} to {self.target_node.id} "
            f"at tick {delivered_at}."
        )
        print(f"Length of target node {self.target_node.id} received messages: {len(self.target_node.received)}")
