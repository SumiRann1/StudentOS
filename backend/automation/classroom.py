from agents.classroom.graph import build_classroom_graph
from state import AgentState
from langchain_core.messages import HumanMessage

classroom_agent = build_classroom_graph(AgentState)

async def create_classroom_jobs(user: str = "Student"):
    thread_id = f"default_classroom_{user}"
    query = "What are all my upcoming pending assignment deadlines and coursework due dates across my courses? List them clearly by course with due dates, times, and submission status."
    CONFIG = {"configurable": {"thread_id": thread_id}}
    state = {"query": query, "messages": [HumanMessage(content=query)], "user_name": user}
    return await classroom_agent.ainvoke(state, config=CONFIG)
