from camel.toolkits.function_tool import FunctionTool
from camel.toolkits import MathToolkit, CodeExecutionToolkit
from camel.toolkits import SearchToolkit

def load_tool(tool_name): 
    if tool_name == "math":
        math_toolkit = MathToolkit()
        tools = math_toolkit.get_tools()

    elif tool_name == "code_executor": 
        code_execution_toolkit = CodeExecutionToolkit()
        tools = code_execution_toolkit.get_tools()

    elif tool_name == "wiki":
        search_toolkit = SearchToolkit()
        tools = [FunctionTool(search_toolkit.search_wiki)]


    elif tool_name == "bing_search":
        search_toolkit = SearchToolkit()
        tools = [FunctionTool(search_toolkit.search_bing)]

    return tools