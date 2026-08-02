from agents.timetable.node import chat_node, refinement_node
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode, tools_condition
from agents.timetable.tool import tools_list_time

tool_node = ToolNode(tools_list_time)

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