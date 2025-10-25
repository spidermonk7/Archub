import sys
import os

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Tools.tools_ready import load_tools
from Nodes.processorNodes.agent_node import AgentNode
from utils import load_agent_config


def load_regular_agent(agent_names):
    # load config file from corresponding .yaml file
    if isinstance(agent_names, str):
        agent_names = [agent_names]

    agent_nodes = []

    for agent_name in agent_names:  
        assert agent_name in [
            'browser',
            'coder', 'file_manager', 'math_agent', 'secretary', 'pubmed_searcher',
            'web_searcher', 'vision_analyst', 'data_analyst', 'code_executor', 'mesh_specialist'
        ], f"❌ Unknown agent name: {agent_name}"
        config_path = os.path.join(os.path.dirname(__file__), f"agent_prompts/pools/{agent_name}.yaml")
        config = load_agent_config(config_path)
        tools = []
        if config['tools'] is not None:
            for tool_name in config['tools']:
                tools.extend(load_tools(tool_name))
        else:
            tools = []

        agent_node = AgentNode(
            name=config['name'],
            model_name=config['model'],
            system_prompt=config['system'],
            agent_resume=config['resume'],
            tools=tools,
        )
        agent_nodes.append(agent_node)


    return agent_nodes

