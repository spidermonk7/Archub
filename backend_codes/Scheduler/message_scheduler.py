from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Callable, DefaultDict, Iterable, List

from Edges.baseEdge import BaseEdge


EmitCallable = Callable[[dict], None]


@dataclass
class ScheduledDelivery:
    """Snapshot of a delivery that has been scheduled for a future tick."""

    edge: BaseEdge
    messages: List
    deliver_at: int
    scheduled_at: int
    sequence: int


class MessageScheduler:
    """Central dispatcher that delivers messages at their scheduled ticks."""

    def __init__(self, emit: EmitCallable | None = None) -> None:
        self._queue: DefaultDict[int, List[ScheduledDelivery]] = defaultdict(list)
        self.emit: EmitCallable = emit or (lambda _e: None)
        self._sequence_counter: int = 0

    def schedule(
        self,
        edge: BaseEdge,
        messages: Iterable,
        *,
        scheduled_at: int,
        deliver_at: int,
    ) -> None:
        payload = list(messages)
        if not payload:
            return

        delivery = ScheduledDelivery(
            edge=edge,
            messages=payload,
            deliver_at=deliver_at,
            scheduled_at=scheduled_at,
            sequence=self._sequence_counter,
        )
        self._queue[deliver_at].append(delivery)
        self._sequence_counter += 1

        try:
            self.emit({
                'type': 'edge.message.scheduled',
                'runId': edge.run_id,
                'teamId': edge.team_id,
                'edge': {
                    'id': edge.edge_id,
                    'source': edge.source_node.id,
                    'target': edge.target_node.id,
                    'edgeType': edge.edge_type,
                    'delay': max(0, deliver_at - scheduled_at),
                },
                'meta': {
                    'deliverAt': deliver_at,
                    'scheduledAt': scheduled_at,
                    'count': len(payload),
                },
            })
        except Exception:
            pass

    def dispatch(self, tick: int) -> List[ScheduledDelivery]:
        if tick not in self._queue:
            return []

        deliveries = self._queue.pop(tick, [])
        deliveries.sort(key=lambda d: (d.scheduled_at, d.sequence), reverse=True)
        for delivery in deliveries:
            delivery.edge.deliver(
                delivery.messages,
                delivered_at=tick,
                scheduled_at=delivery.scheduled_at,
            )
            
        return deliveries

    def pending_ticks(self) -> List[int]:
        return sorted(self._queue.keys())

    def has_pending(self) -> bool:
        return bool(self._queue)
