from langgraph.graph import StateGraph, END, START
from agents.state import AgentState
from agents.whatsapp.graph import build_graph as build_whatsapp_graph
from agents.email.graph import build_graph as build_email_graph
from agents.email.node import refinement_node as email_refinement_node
from agents.timetable.graph import build_graph as build_timetable_graph
from agents.classroom.graph import build_graph as build_classroom_graph

from langchain_core.messages import SystemMessage, ToolMessage, HumanMessage, AIMessage
from langgraph.checkpoint.memory import MemorySaver
from config import llm
from agents.system_prompt import SYSTEM_POMPT

from datetime import datetime
from zoneinfo import ZoneInfo

ROUTER_PROMPT = """You are the master router for StudentOS, an intelligent university assistant.
Analyze the user's latest message and the conversation history. Decide which category the request belongs to:
1. "whatsapp": Checking messages, reading chats, sending messages, or summarizing chats.
2. "email": Checking inbox, searching emails, reading emails, drafting emails, sending emails, replying, or summarizing emails.
3. "timetable": Class schedules, daily/weekly timetables, courses, faculty, classroom locations, timings, or credits.
4. "classroom": Google Classroom operations, listing courses/classes, checking coursework/assignments, checking announcements, creating announcements, or listing classroom submissions.
5. "general": Greetings, small talk, questions about StudentOS, or generic queries that do not require specialized tools.

Respond with exactly one of these words: "whatsapp", "email", "timetable", "classroom", "general". Do not write any other word, punctuation, or explanation."""

def route_by_llm(state: AgentState) -> str:
    cleaned_messages = []
    for msg in state["messages"]:
        if isinstance(msg, HumanMessage):
            cleaned_messages.append(HumanMessage(content=msg.content))
        elif isinstance(msg, AIMessage) and not (hasattr(msg, "tool_calls") and msg.tool_calls):
            cleaned_messages.append(AIMessage(content=msg.content))
            
    messages = [SystemMessage(content=ROUTER_PROMPT)] + cleaned_messages
    response = llm.invoke(messages)
    decision = response.content.strip().lower()
    
    for option in ["whatsapp", "email", "timetable", "classroom"]:
        if option in decision:
            return option
    return "general"

def general_chat_node(state: AgentState):
    current_time = state.get("current_time") or ""
    current_day = state.get("current_day") or ""
    time_prompt = f"\n\nActive Current Time: {current_time}\nActive Current Day: {current_day}" if (current_time or current_day) else ""
    messages = [SystemMessage(content=SYSTEM_POMPT + time_prompt)] + state["messages"]
    response = llm.invoke(messages)
    return {"messages": [response], "general_result": [response]}

def initialize_node(state: AgentState):
    current_time = state.get("current_time")
    if not current_time:
        current_time = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M")
        
    current_day = state.get("current_day")
    if not current_day:
        current_day = datetime.now().strftime("%A")
        
    return {
        "current_time": current_time, 
        "current_day": current_day,
        "wa_result": [],
        "email_result": [],
        "timetable_result": [],
        "classroom_result": [],
        "general_result": []
    }

def email_post_condition(state: AgentState) -> str:
    if len(state["messages"]) >= 2 and isinstance(state["messages"][-2], ToolMessage):
        return "email_refinement"
    return END

def build_orchestrator():
    
    whatsapp_subgraph = build_whatsapp_graph(AgentState)
    email_subgraph = build_email_graph(AgentState)
    timetable_subgraph = build_timetable_graph(AgentState)
    classroom_subgraph = build_classroom_graph(AgentState)

    workflow = StateGraph(AgentState)
    
    
    workflow.add_node("initialize", initialize_node)
    workflow.add_node("whatsapp_agent", whatsapp_subgraph)
    workflow.add_node("email_agent", email_subgraph)
    workflow.add_node("email_refinement", email_refinement_node)
    workflow.add_node("timetable_agent", timetable_subgraph)
    workflow.add_node("classroom_agent", classroom_subgraph)
    workflow.add_node("general_chat", general_chat_node)
    
    workflow.add_edge(START, "initialize")
    workflow.add_conditional_edges("initialize", route_by_llm, {
        "whatsapp": "whatsapp_agent",
        "email": "email_agent",
        "timetable": "timetable_agent",
        "classroom": "classroom_agent",
        "general": "general_chat"
    })
    workflow.add_edge("whatsapp_agent", END)
    workflow.add_edge("timetable_agent", END)
    workflow.add_edge("classroom_agent", END)
    workflow.add_conditional_edges("email_agent", email_post_condition, {
        "email_refinement": "email_refinement",
        END: END
    })
    workflow.add_edge("email_refinement", END)
    workflow.add_edge("general_chat", END)
    
    return workflow.compile(checkpointer=MemorySaver())
