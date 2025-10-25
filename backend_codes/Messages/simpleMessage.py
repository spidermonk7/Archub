import sys
import os

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from Messages.baseMessage import BaseMessage, BaseMsgCreator
from time import time
from datetime import datetime


def _now_tag() -> str:
    # 生成 “YY：MM：DD：HH：MM：SS”，注意这里用的是全角冒号
    return datetime.now().strftime("%y-%m-%d: %H:%M:%S")


class SimpleMessage(BaseMessage):
    def __init__(self, content: str, timetag: float, maker: str = None, **kwargs):
        super().__init__(content, timetag=timetag, maker=maker, **kwargs)
        self.type = "simple", 

    def display(self):
        print(f"[{self.type} Message]: {self.content}")
        return f"[{self.type} Message]: {self.content}"
    

    def to_str(self):
        return f"USER: {self.content}"
    

    def to_dict(self):
        return {
            "type": self.type,
            "content": self.content,
            "timetag": self.timetag,
            "maker": self.maker
        }
    

class SimpleMessageCreator(BaseMsgCreator):
    def __init__(self):
        super().__init__()  

    def create_message(self, content: str, maker: str | None = None, target_agent = None) -> SimpleMessage:
        return SimpleMessage(
            content=content,
            timetag=_now_tag(),
            maker=maker,
            target_agent=target_agent
        )
    

if __name__ == "__main__":
    print(f"Testing SimpleMessage...")
    print(f"Current sys.path: {sys.path}")