from agents.timetable.graph import build_timetable_graph
from state import AgentState
from langchain_core.messages import HumanMessage

timetable_agent = build_timetable_graph(AgentState)

async def create_timetable_jobs(user: str = "Student"):
    thread_id = f"default_tt_{user}"
    query = "What is my complete timetable and class schedule for today?"
    CONFIG = {"configurable": {"thread_id": thread_id}}
    state = {"query": query, "messages": [HumanMessage(content=query)], "user_name": user}
    return await timetable_agent.ainvoke(state, config=CONFIG)
