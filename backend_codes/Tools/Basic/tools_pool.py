from camel.toolkits import FunctionTool
from camel.toolkits import MathToolkit, CodeExecutionToolkit


def load_tool(tool_name): 
    if tool_name == "math":
        math_toolkit = MathToolkit()
        tools = math_toolkit.get_tools()

    elif tool_name == "code_executor": 
        code_execution_toolkit = CodeExecutionToolkit()
        tools = code_execution_toolkit.get_tools()
    
    return tools