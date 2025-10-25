import sys
import os

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from Nodes.processorNodes.llm_node import LLMNode
from Nodes.processorNodes.agent_node import AgentNode
from dotenv import load_dotenv
from Tools.tools_ready import load_tools
from Nodes.processorNodes.logic_node import RandomAbandonNode
from Messages.simpleMessage import SimpleMessageCreator
from dotenv import load_dotenv

load_dotenv()

def test_llm_node():
    """Test the LLMNode functionality."""

    node = LLMNode(name="TestNode", model_name="gpt-4o-mini", system_prompt="You are a helpful assistant.")
    node.receive("What is the capital of France?")
    node.process()
    outputs = node.send()
    print(f"Outputs from {node.name}: {outputs}")
    print('-'*40)
    node.show()
    print('-'*40)
    node.reset()
    node.show()



def test_agent_node():
    """Test the AgentNode functionality."""
    node = AgentNode(name="AgentTestNode", model_name="gpt-4o-mini", system_prompt="You are a helpful assistant.", tools=load_tools('math'))
    msg = SimpleMessageCreator().create_message(content="Tell me the exact result of 5313541/52 + 17.25824", maker="Tester")
    node.receive(msg)
    node.process()
    outputs = node.send()
    print(f"Outputs from {node.name}: {outputs}")
    print('-'*40)
    node.show()
    print('-'*40)
    node.reset()
    node.show()



def test_random_node():
    node = RandomAbandonNode(name="RandomNode") 

    node.receive("Message 1")
    node.receive("Message 2")
    node.receive("Message 3")
    node.process()
    outputs = node.send()
    print(f"Outputs from {node.name}: {outputs}")
    print('-'*40)


if __name__ == "__main__":
    test_agent_node()
    # test_random_node()
