from config import get_router_prompt
from typing import Dict, Any
from state import AgentState, get_timetable_prompt
from config import timetable_llm, get_router_prompt, router_llm, get_current_day, get_current_date, get_current_time
from langchain_core.messages import SystemMessage, HumanMessage 


# def preprocessor(state : AgentState) -> AgentState:
#     current_day = state.get("current_day") or get_current_day()
#     current_date = state.get("current_date") or get_current_date()
#     current_time = state.get("current_time") or get_current_time()

#     router_prompt = get_router_prompt(current_day=current_day, current_date=current_date, current_time=current_time)

#     query = state["query"]

#     router_res = router_llm.invoke([SystemMessage(content=router_prompt), HumanMessage(content=query)])
#     agent_type = router_res.type if router_res and router_res.type else ["general"]

#     return {
#         "current_day": current_day,
#         "current_date": current_date,
#         "current_time": current_time,
#         "type": agent_type,
#         "messages": [HumanMessage(content=query)]
#     }

def chat_node(state : AgentState) -> AgentState:
    messages = list(state.get("messages", []))
    current_day = state.get("current_day") or get_current_day()
    current_date = state.get("current_date") or get_current_date()
    current_time = state.get("current_time") or get_current_time()

    system_prompt = get_timetable_prompt(current_day, current_date, current_time)
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=system_prompt)] + messages

    response = timetable_llm.invoke(messages)
    return {"timetable_result": [response], "messages": [response]}

