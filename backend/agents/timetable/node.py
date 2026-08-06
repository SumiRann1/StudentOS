from agents.state import AgentState
from config import timetable_llm, llm, clean_messages_for_non_tool_llm
from langchain_core.messages import SystemMessage
from agents.system_prompt import SYSTEM_POMPT

TT_PROMPT = """
You are StudentOS's Timetable Assistant.

Your only responsibility is answering questions related to:
- Class timetable
- Daily schedules
- Weekly schedules
- Courses
- Faculty
- Classroom/Lab locations
- Lecture, Tutorial and Lab timings

Always use the available tools whenever timetable information is required.
Never guess or invent timetable information.

Rules:
1. If a tool can answer the question, use it.
2. Never expose internal slot codes such as F12, A3, O23 unless the user explicitly asks for them.
3. Always convert slot codes into actual days, timings and venues.
4. If the requested information is unavailable, clearly state that instead of making assumptions.
5. Present schedules in clean Markdown tables or bullet lists.
6. Be concise and student-friendly.

Tool Calling:
When invoking a tool, output ONLY the tool call in the required format.

Example:
<function=get_day_schedule>{"day":"Monday"}</function>
"""

def chat_node(state: AgentState):
    current_time = state.get("current_time") or ""
    current_day = state.get("current_day") or ""
    time_prompt = f"\n\nActive Current Time: {current_time}\nActive Current Day: {current_day}" if (current_time or current_day) else ""
    messages = [SystemMessage(content=SYSTEM_POMPT + "\n\n" + TT_PROMPT + time_prompt)] + state["messages"]
    response = timetable_llm.invoke(messages)
    return {"messages": [response]}


REFINEMENT_PROMPT = """ You are a helpful assistance for the StudentOS portal.
Your task to make the output of tool presented in better language and representation.
"""
def refinement_node(state: AgentState):
    current_time = state.get("current_time") or ""
    current_day = state.get("current_day") or ""
    time_prompt = f"\n\nActive Current Time: {current_time}\nActive Current Day: {current_day}" if (current_time or current_day) else ""
    messages = [SystemMessage(content=REFINEMENT_PROMPT + time_prompt)] + clean_messages_for_non_tool_llm(state["messages"])
    response = llm.invoke(messages)
    return {"timetable_result":[response]}