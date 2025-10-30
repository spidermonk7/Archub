import os
import sys

# Ensure the parent directory is on the path for relative imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from Nodes.procedureNodes.baseprocedureNodes import BaseProcedureNode


class GoThroughNode(BaseProcedureNode):
    """Logic node that forwards received messages without modification."""

    def __init__(
        self,
        name: str,
        *,
        logic_type: str = "go-through",
        id=None,
        emit=None,
        run_id: str | None = None,
        team_id: str | None = None,
    ):
        super().__init__(name=name, id=id, emit=emit, run_id=run_id, team_id=team_id)
        self.type = "logic"
        self.logic_type = logic_type

    def receive(self, input_data):
        """Receive input data or messages."""
        self.received.extend([input_data] if not isinstance(input_data, list) else input_data)
       