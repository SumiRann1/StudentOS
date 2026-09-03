from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver
from state import AgentState
from langgraph.prebuilt import ToolNode, tools_condition
from agents.classroom.node import chat_node
from agents.classroom.tool import classroom_tools

tool_node = ToolNode(classroom_tools)

def build_classroom_graph(state: AgentState):
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

    return workflow.compile(checkpointer=MemorySaver())