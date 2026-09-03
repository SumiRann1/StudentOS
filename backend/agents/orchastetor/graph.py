from langgraph.graph import START, END, StateGraph
from .node import preprocessor, general_node
from state import AgentState
from langgraph.checkpoint.memory import MemorySaver
from agents.classroom.graph import build_classroom_graph
from agents.email.graph import build_email_graph
from agents.timetable.graph import build_timetable_graph

classroom_agent = build_classroom_graph(AgentState)
email_agent = build_email_graph(AgentState)
timetable_agent = build_timetable_graph(AgentState)


def route_decision(state: AgentState):
    types = state.get("type", [])
    if not types:
        return "general"
    last_type = types[-1] if isinstance(types, list) else types
    if last_type == "end" or "end" in types:
        return "end"
    return last_type if last_type in ["classroom", "email", "timetable", "general"] else "general"


def build_orchastetor_graph(state):
    orchastetor_graph = StateGraph(state)

    orchastetor_graph.add_node("preprocessor", preprocessor)
    orchastetor_graph.add_node("classroom", classroom_agent)
    orchastetor_graph.add_node("email", email_agent)
    orchastetor_graph.add_node("timetable", timetable_agent)
    orchastetor_graph.add_node("general", general_node)

    orchastetor_graph.add_edge(START, "preprocessor")

    orchastetor_graph.add_conditional_edges(
        "preprocessor",
        route_decision,
        {
            "classroom": "classroom",
            "email": "email",
            "timetable": "timetable",
            "general": "general",
            "end" : END
        }
    )

    orchastetor_graph.add_edge("classroom", "preprocessor")
    orchastetor_graph.add_edge("email", "preprocessor")
    orchastetor_graph.add_edge("timetable", "preprocessor")
    orchastetor_graph.add_edge("general", "preprocessor")


    return orchastetor_graph.compile(checkpointer= MemorySaver())
