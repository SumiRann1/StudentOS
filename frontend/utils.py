import os
import sys
import streamlit as st
from datetime import datetime
from zoneinfo import ZoneInfo

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "../backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.orchestrator import build_orchestrator
from langchain_core.messages import ToolMessage

def check_gmail_status():
    email_dir = os.path.abspath(os.path.join(current_dir, "../backend/agents/email"))
    token_path = os.path.join(email_dir, "token.json")
    creds_path = os.path.join(email_dir, "credentials.json")
    
    if not os.path.exists(creds_path):
        return "Setup Required", "#EF4444"
    if not os.path.exists(token_path):
        return "Setup Required", "#EF4444"
        
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        
        creds = Credentials.from_authorized_user_file(token_path, ["https://www.googleapis.com/auth/gmail.modify"])
        if creds and creds.valid:
            return "Online", "#10B981"
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(token_path, "w") as f:
                    f.write(creds.to_json())
                return "Online", "#10B981"
            except Exception:
                return "Auth Expired", "#EF4444"
        return "Auth Expired", "#EF4444"
    except Exception:
        return "Error", "#EF4444"

def check_classroom_status():
    classroom_dir = os.path.abspath(os.path.join(current_dir, "../backend/agents/classroom"))
    token_path = os.path.join(classroom_dir, "token.json")
    creds_path = os.path.join(classroom_dir, "credentials.json")
    
    if not os.path.exists(creds_path):
        return "Setup Required", "#EF4444"
    if not os.path.exists(token_path):
        return "Setup Required", "#EF4444"
        
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        
        scopes = [
            "https://www.googleapis.com/auth/classroom.courses.readonly",
            "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
            "https://www.googleapis.com/auth/classroom.announcements.readonly"
        ]
        
        creds = Credentials.from_authorized_user_file(token_path, scopes)
        if creds and creds.valid:
            return "Online", "#10B981"
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(token_path, "w") as f:
                    f.write(creds.to_json())
                return "Online", "#10B981"
            except Exception:
                return "Auth Expired", "#EF4444"
        return "Auth Expired", "#EF4444"
    except Exception:
        return "Error", "#EF4444"

def check_whatsapp_status():
    marker_path = os.path.abspath(os.path.join(current_dir, "../data/whatsapp_authenticated.marker"))
    if os.path.exists(marker_path):
        return "Ready", "#10B981"
    return "Setup Required", "#EF4444"


@st.cache_resource
def get_cached_orchestrator():
    return build_orchestrator()

def check_pending_approval(orchestrator, config):
    try:
        state = orchestrator.get_state(config)
        for task in state.tasks:
            if task.name in ["email_agent", "whatsapp_agent"]:
                sub_state = orchestrator.get_state(task.state)
                if "tools" in sub_state.next:
                    messages = sub_state.values.get("messages", [])
                    if messages:
                        last_msg = messages[-1]
                        if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                            for tool_call in last_msg.tool_calls:
                                if tool_call["name"] in ["send_email", "reply_email", "send_whatsapp_message"]:
                                    return task, tool_call
    except Exception:
        pass
    return None, None


def serialize_message(msg):
    """Converts LangChain message classes to plain dict structures safely."""
    if not msg:
        return None
    
    # Check if msg is a dictionary (some mock states could have dictionary messages)
    if isinstance(msg, dict):
        return msg
        
    msg_dict = {
        "type": msg.__class__.__name__,
        "content": getattr(msg, "content", ""),
    }
    if hasattr(msg, "name") and msg.name:
        msg_dict["name"] = msg.name
    if hasattr(msg, "tool_calls") and msg.tool_calls:
        msg_dict["tool_calls"] = msg.tool_calls
    if hasattr(msg, "tool_call_id") and msg.tool_call_id:
        msg_dict["tool_call_id"] = msg.tool_call_id
    return msg_dict


def get_complete_agent_state(orchestrator, thread_id):
    """Retrieves the complete state of the agent orchestrator and any running sub-agents."""
    config = {"configurable": {"thread_id": thread_id}}
    state_details = {
        "thread_id": thread_id,
        "status": "Idle",
        "next": [],
        "values": {},
        "tasks": [],
        "messages": []
    }
    
    try:
        state = orchestrator.get_state(config)
        state_details["next"] = list(state.next)
        
        if state.next:
            state_details["status"] = "Waiting/Active"
            
        values = {}
        for key, val in state.values.items():
            if key == "messages":
                state_details["messages"] = [serialize_message(m) for m in val]
            elif key in ["wa_result", "email_result", "timetable_result", "classroom_result", "general_result"]:
                if isinstance(val, list):
                    values[key] = [serialize_message(m) for m in val]
                else:
                    values[key] = val
            else:
                values[key] = val
        state_details["values"] = values
        
        for task in getattr(state, "tasks", []):
            task_info = {
                "name": task.name,
                "id": getattr(task, "id", None),
                "next": [],
                "values": {},
                "messages": []
            }
            try:
                sub_state = orchestrator.get_state(task.state)
                task_info["next"] = list(sub_state.next)
                sub_values = {}
                for sk, sv in sub_state.values.items():
                    if sk == "messages":
                        task_info["messages"] = [serialize_message(m) for m in sv]
                    elif isinstance(sv, list) and sv and hasattr(sv[0], "content"):
                        sub_values[sk] = [serialize_message(m) for m in sv]
                    else:
                        sub_values[sk] = sv
                task_info["values"] = sub_values
            except Exception as e:
                task_info["error"] = str(e)
            state_details["tasks"].append(task_info)
            
    except Exception as e:
        state_details["error"] = str(e)
        
    return state_details


def run_orchestrator(orchestrator, inputs, config):
    """
    Invokes the orchestrator and automatically resumes execution if it gets 
    interrupted before tools that do not require human approval.
    """
    response = orchestrator.invoke(inputs, config=config)
    
    max_resumes = 10
    resume_count = 0
    
    while resume_count < max_resumes:
        state = orchestrator.get_state(config)
        interrupted = False
        requires_approval = False
        
        for task in getattr(state, "tasks", []):
            if task.name in ["email_agent", "whatsapp_agent"]:
                try:
                    sub_state = orchestrator.get_state(task.state)
                    if "tools" in sub_state.next:
                        interrupted = True
                        messages = sub_state.values.get("messages", [])
                        if messages:
                            last_msg = messages[-1]
                            if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                                for tool_call in last_msg.tool_calls:
                                    if tool_call["name"] in ["send_email", "reply_email", "send_whatsapp_message"]:
                                        requires_approval = True
                except Exception:
                    pass
                    
        if interrupted and not requires_approval:
            response = orchestrator.invoke(None, config=config)
            resume_count += 1
        else:
            break
            
    return response


