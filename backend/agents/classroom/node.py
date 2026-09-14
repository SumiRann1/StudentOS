from state import AgentState, get_classroom_prompt
from config import classroom_llm_with_tools, get_current_day, get_current_date, get_current_time, router_llm, get_router_prompt
from langchain_core.messages import HumanMessage, SystemMessage

# def preprocessor(state: AgentState) -> dict:
#     current_day = state.get("current_day") or get_current_day()
#     current_date = state.get("current_date") or get_current_date()
#     current_time = state.get("current_time") or get_current_time()

#     router_prompt = get_router_prompt(current_day, current_date, current_time)
#     query = state["query"]
#     messages = state["messages"]

#     router_res = router_llm.invoke([SystemMessage(content=router_prompt), HumanMessage(content=query)])
#     agent_type = router_res.type if router_res and router_res.type else ["general"]

#     return {
#         "type" : agent_type,
#         "current_day": current_day,
#         "current_date": current_date,
#         "current_time": current_time,
#         "messages": messages
#     }

def chat_node(state: AgentState):
    messages = list(state.get("messages", []))
    current_day = state.get("current_day") or get_current_day()
    current_date = state.get("current_date") or get_current_date()
    current_time = state.get("current_time") or get_current_time()
    user_name = state.get("user_name") or ""

    system_prompt = get_classroom_prompt(current_day, current_date, current_time, user_name)
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=system_prompt)] + messages

    response = classroom_llm_with_tools.invoke(messages)
    return {"classroom_result": [response], "messages": [response]}

