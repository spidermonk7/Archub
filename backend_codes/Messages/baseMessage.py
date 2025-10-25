from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, Optional
from enum import Enum
import time


class BaseMessage(ABC):
    """Base class for all Messages."""

    def __init__(self, content: str, 
                 timetag: Optional[float] = None, 
                 maker: Optional[str] = None, 
                 **kwargs
                 ):
        self.content = content
        self.timetag = timetag 
        self.maker = maker
        self.target_agent = kwargs.get("target_agent", None)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def render(self) -> str:
        return f"[Message]: {self.content}"
    

class BaseMsgCreator(ABC):
    """Abstract Creator for Messages."""
    
    @abstractmethod
    def create_message(self, content: str) -> BaseMessage:
        pass