from agents.email.node import preprocessor, chat_node
from state import AgentState
from config import email_tools
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode, tools_condition

tool_node = ToolNode(email_tools)

def build_email_graph(state) -> StateGraph:
    workflow = StateGraph(state)

    # workflow.add_node("preprocessor", preprocessor)
    workflow.add_node("chat_node", chat_node)
    workflow.add_node("tool_node", tool_node)
    
    # workflow.add_edge(START, "preprocessor")
    # workflow.add_edge("preprocessor", "chat_node")
    workflow.add_edge(START, "chat_node")
    workflow.add_conditional_edges(
        "chat_node",
        tools_condition,
        {
            "tools": "tool_node",
            END: END,
        }
    )
    workflow.add_edge("tool_node", "chat_node")

    return workflow.compile()
