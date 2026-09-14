from state import AgentState
from datetime import datetime
from zoneinfo import ZoneInfo
from config import llm, router_llm, get_router_prompt, get_current_time, get_current_day, get_current_date
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage


def preprocessor(state: AgentState) -> dict:
    current_day = state.get("current_day") or get_current_day()
    current_date = state.get("current_date") or get_current_date()
    current_time = state.get("current_time") or get_current_time()
    user_name = state.get("user_name") or ""

    existing_messages = state.get("messages", [])

    # If the last message is an AIMessage with non-empty content (from a sub-agent), end the turn
    if existing_messages:
        last_msg = existing_messages[-1]
        if isinstance(last_msg, AIMessage) and last_msg.content:
            return {
                "type": ["end"],
                "current_day": current_day,
                "current_date": current_date,
                "current_time": current_time,
                "user_name": user_name
            }

    router_prompt = get_router_prompt(current_day, current_date, current_time, user_name)

    clean_history = []
    for msg in existing_messages[-4:]:
        if isinstance(msg, HumanMessage) and msg.content:
            clean_history.append(HumanMessage(content=str(msg.content)[:500]))
        elif isinstance(msg, AIMessage) and msg.content and isinstance(msg.content, str):
            clean_history.append(AIMessage(content=msg.content[:500]))

    if not clean_history:
        clean_history = [HumanMessage(content=state["query"])]

    messages_to_router = [SystemMessage(content=router_prompt)] + clean_history

    try:
        router_res = router_llm.invoke(messages_to_router)
        agent_type = router_res.type if router_res and router_res.type else ["general"]
    except Exception:
        agent_type = ["general"]

    return {
        "type": agent_type,
        "current_day": current_day,
        "current_date": current_date,
        "current_time": current_time,
        "user_name": user_name
    }


from state import AgentState, get_general_prompt

def general_node(state : AgentState):
    messages = list(state.get("messages", []))
    current_day = state.get("current_day") or get_current_day()
    current_date = state.get("current_date") or get_current_date()
    current_time = state.get("current_time") or get_current_time()
    user_name = state.get("user_name") or "Student"

    system_prompt = get_general_prompt(current_day, current_date, current_time, user_name)
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=system_prompt)] + messages

    response = llm.invoke(messages)
    return {"messages": [response]}
