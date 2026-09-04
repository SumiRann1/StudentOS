from typing import Annotated, List, Literal, Dict , Any
from agents.timetable.node import chat_node
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode, tools_condition
from agents.timetable.tool import tools_list_time

tool_node = ToolNode(tools_list_time)

def build_timetable_graph(state) -> StateGraph:
    workflow = StateGraph(state)

    # workflow.add_node("preprocessor", preprocessor)
    workflow.add_node("chat_node", chat_node)
    workflow.add_node("tool_node", tool_node)

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


