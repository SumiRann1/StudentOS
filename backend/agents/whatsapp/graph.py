from agents.whatsapp.node import chat_node, refinement_node
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import tools_condition
from agents.whatsapp.tool import tools_list_whatsapp
from langchain_core.messages import ToolMessage

def tool_node(state):
    messages = state.get("messages", [])
    if not messages:
        return {"messages": []}
    
    last_message = messages[-1]
    tool_outputs = []
    
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        tools_map = {tool.name: tool for tool in tools_list_whatsapp}
        
        for tool_call in last_message.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_id = tool_call["id"]
            
            tool = tools_map.get(tool_name)
            if tool is None:
                content = f"Error: Tool '{tool_name}' not found."
            else:
                try:
                    content = tool.invoke(tool_args)
                except Exception as e:
                    content = f"Error invoking tool '{tool_name}': {str(e)}"
            
            tool_outputs.append(
                ToolMessage(content=str(content), tool_call_id=tool_id, name=tool_name)
            )
            
    return {"messages": tool_outputs}

def build_graph(state):
    graph = StateGraph(state)

    graph.add_node("chat", chat_node)
    graph.add_node("tools", tool_node)
    graph.add_node("refinement", refinement_node)

    graph.add_edge(START, "chat")
    graph.add_conditional_edges("chat", tools_condition)
    graph.add_edge("tools", "refinement")
    graph.add_edge("refinement", END)

    return graph.compile(checkpointer = MemorySaver())