import time
from typing import Any, Dict


def now_ts() -> float:
    return time.time()


def noop_emit(event: Dict[str, Any]) -> None:
    # Default no-op emitter; callers can pass a function(event) signature
    return None


def make_event(event_type: str, run_id: str | None, team_id: str | None, **data: Any) -> Dict[str, Any]:
    event: Dict[str, Any] = {
        "type": event_type,
        "runId": run_id,
        "teamId": team_id,
        "ts": now_ts(),
    }
    event.update(data)
    return event


class QueueEmitter:
    """Emitter that pushes events into a queue-like object with put method."""

    def __init__(self, queue):
        self.queue = queue

    def __call__(self, event: Dict[str, Any]) -> None:
        try:
            self.queue.put(event)
        except Exception:
            # Swallow exceptions to avoid breaking producers
            pass

