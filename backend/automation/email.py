from agents.email.graph import build_email_graph
from state import AgentState
from langchain_core.messages import HumanMessage

email_agent = build_email_graph(AgentState)

async def create_email_jobs(user: str = "Student"):
    thread_id = f"default_email_{user}"
    query = "Summarize all my unread emails and important messages or announcements received in the last 24 hours (or yesterday)."
    CONFIG = {"configurable": {"thread_id": thread_id}}
    state = {"query": query, "messages": [HumanMessage(content=query)], "user_name": user}
    return await email_agent.ainvoke(state, config=CONFIG)
    