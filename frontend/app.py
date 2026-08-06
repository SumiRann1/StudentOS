import streamlit as st
import uuid
import sys
import os
from datetime import datetime
from zoneinfo import ZoneInfo

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "../backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from utils import check_gmail_status, check_classroom_status, check_whatsapp_status, get_cached_orchestrator, get_complete_agent_state
from chat_portal import show_chat_portal
from setup_integrations import show_setup_integrations
from health import show_health_diagnostics

st.set_page_config(page_title="StudentOS Portal", page_icon="🎓", layout="wide", initial_sidebar_state="expanded")

if "orchestrator" not in st.session_state:
    st.session_state.orchestrator = get_cached_orchestrator()

if "thread_id" not in st.session_state:
    st.session_state.thread_id = f"st_{uuid.uuid4().hex[:8]}"

if "messages" not in st.session_state:
    st.session_state.messages = []

css_file = os.path.join(current_dir, "style.css")
if os.path.exists(css_file):
    with open(css_file, "r") as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)


@st.dialog("🤖 Complete Agent State", width="large")
def show_state_modal():
    state_details = get_complete_agent_state(st.session_state.orchestrator, st.session_state.thread_id)
    
    if "error" in state_details:
        st.error(f"❌ **Failed to retrieve agent state:** {state_details['error']}")
        st.write("Ensure you have initiated a chat to instantiate the state snapshot.")
        return
        
    tab_overview, tab_history, tab_variables, tab_subagents, tab_raw = st.tabs([
        "📊 Overview", 
        "💬 LangGraph Messages", 
        "🧩 State Variables", 
        "🕸️ Active Sub-agents", 
        "⚙️ Raw JSON State"
    ])
    
    with tab_overview:
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"""
            <div class="state-metric-container">
                <span style="color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Thread ID</span>
                <code style="font-size: 1rem; color: #a78bfa; display: block; margin-top: 4px;">{state_details['thread_id']}</code>
            </div>
            """, unsafe_allow_html=True)
            
            status_color = "#10B981" if state_details['status'] == "Idle" else "#f59e0b"
            st.markdown(f"""
            <div class="state-metric-container">
                <span style="color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Execution Status</span>
                <div style="color: {status_color}; font-size: 1.1rem; font-weight: bold; margin-top: 4px;">{state_details['status']}</div>
            </div>
            """, unsafe_allow_html=True)
            
        with col2:
            route_history = state_details["values"].get("type", [])
            route_history_str = " -> ".join([r.upper() for r in route_history]) if route_history else "NONE (INITIALIZED)"
            st.markdown(f"""
            <div class="state-metric-container">
                <span style="color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Routing Intent History</span>
                <div style="font-size: 0.95rem; font-weight: 500; margin-top: 4px; color: #60a5fa;">{route_history_str}</div>
            </div>
            """, unsafe_allow_html=True)
            
            next_steps = state_details.get("next", [])
            next_steps_str = ", ".join([f"`{step}`" for step in next_steps]) if next_steps else "`END`"
            st.markdown(f"""
            <div class="state-metric-container">
                <span style="color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Next Scheduled Steps</span>
                <div style="font-size: 0.95rem; margin-top: 4px;">{next_steps_str}</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("### 🕒 Active Campus Context")
        sub_col1, sub_col2 = st.columns(2)
        with sub_col1:
            st.write(f"📅 **Current Day:** `{state_details['values'].get('current_day', 'Not Set')}`")
        with sub_col2:
            st.write(f"⏰ **Current Time:** `{state_details['values'].get('current_time', 'Not Set')}`")
            
    with tab_history:
        messages = state_details.get("messages", [])
        if not messages:
            st.info("No messages stored in the LangGraph memory checkpointer for this thread yet.")
        else:
            st.markdown("### 📝 LangGraph Memory Checkpoint Message Log")
            st.caption("These are the serialized messages stored inside the compiled graph's persistent checkpointer:")
            
            for idx, msg in enumerate(messages):
                msg_type = msg.get("type", "Message")
                content = msg.get("content", "")
                name = msg.get("name")
                tool_calls = msg.get("tool_calls")
                tool_call_id = msg.get("tool_call_id")
                
                if msg_type == "SystemMessage":
                    badge_class = "state-badge-system"
                    sender_name = "SYSTEM PROMPT"
                elif msg_type == "HumanMessage":
                    badge_class = "state-badge-human"
                    sender_name = "USER"
                elif msg_type == "AIMessage":
                    badge_class = "state-badge-ai"
                    sender_name = "ORCHESTRATOR / AGENT"
                elif msg_type == "ToolMessage":
                    badge_class = "state-badge-tool"
                    sender_name = f"TOOL RESPONSE ({name or 'unnamed'})"
                else:
                    badge_class = "state-badge-system"
                    sender_name = msg_type.upper()
                
                st.markdown(f"""
                <div class="state-message-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span class="state-badge {badge_class}">{sender_name}</span>
                        <span style="font-size: 0.75rem; color: rgba(255,255,255,0.3);">Index: #{idx}</span>
                    </div>
                    <div style="font-size: 0.9rem; white-space: pre-wrap; line-height: 1.4;">{content}</div>
                </div>
                """, unsafe_allow_html=True)
                
                if tool_calls:
                    for tc in tool_calls:
                        st.warning(f"🔧 **Tool Call:** `{tc.get('name')}` with args: `{tc.get('args')}` (ID: `{tc.get('id')}`)")
                if tool_call_id:
                    st.info(f"🆔 **Tool Call Match ID:** `{tool_call_id}`")
                        
    with tab_variables:
        st.markdown("### 🧩 Agent Specialized Output Registers")
        st.caption("These lists store the final generated output for the most recent transaction of each sub-agent node:")
        
        results_keys = {
            "general_result": "💬 General Agent Outputs",
            "wa_result": "📱 WhatsApp Agent Outputs",
            "email_result": "✉️ Email Agent Outputs",
            "timetable_result": "📅 Timetable Agent Outputs",
            "classroom_result": "🏫 Classroom Agent Outputs"
        }
        
        for key, display_name in results_keys.items():
            results = state_details["values"].get(key, [])
            with st.expander(f"{display_name} ({len(results)} messages)", expanded=False):
                if not results:
                    st.write("No output generated yet.")
                else:
                    for r_idx, r_msg in enumerate(results):
                        r_type = r_msg.get("type", "Message")
                        r_content = r_msg.get("content", "")
                        st.markdown(f"**[{r_type}] Output #{r_idx}:**")
                        st.info(r_content)
                        
    with tab_subagents:
        tasks = state_details.get("tasks", [])
        if not tasks:
            st.info("No sub-agent subgraphs are currently active or holding states in memory.")
        else:
            st.markdown("### 🕸️ Active Sub-agent Checkpoint Environments")
            st.caption("Each agent acts as a compiled sub-graph within the orchestrator state machine:")
            
            for task in tasks:
                task_name = task.get("name", "Unnamed Subgraph")
                task_status = "Waiting/Active" if task.get("next") else "Finished/Idle"
                st.markdown(f"#### 🤖 Agent: **{task_name}**")
                
                sc1, sc2 = st.columns(2)
                with sc1:
                    st.write(f"📌 **Sub-agent Step Pointer:** `{task_status}`")
                with sc2:
                    st.write(f"➡️ **Next Local Node:** `{', '.join(task.get('next', [])) or 'END'}`")
                
                sub_msgs = task.get("messages", [])
                with st.expander(f"Inspect local messages ({len(sub_msgs)})", expanded=True):
                    if not sub_msgs:
                        st.write("No local messages recorded in sub-agent scope.")
                    else:
                        for s_idx, sm in enumerate(sub_msgs):
                            sm_type = sm.get("type", "Message")
                            sm_content = sm.get("content", "")
                            sm_name = sm.get("name")
                            sm_tool_calls = sm.get("tool_calls")
                            sm_tool_call_id = sm.get("tool_call_id")
                            
                            if sm_type == "SystemMessage":
                                badge_class = "state-badge-system"
                                sender_name = "SYSTEM PROMPT"
                            elif sm_type == "HumanMessage":
                                badge_class = "state-badge-human"
                                sender_name = "USER"
                            elif sm_type == "AIMessage":
                                badge_class = "state-badge-ai"
                                sender_name = "AGENT DECISION"
                            elif sm_type == "ToolMessage":
                                badge_class = "state-badge-tool"
                                sender_name = f"TOOL RESPONSE ({sm_name or 'unnamed'})"
                            else:
                                badge_class = "state-badge-system"
                                sender_name = sm_type.upper()
                            
                            st.markdown(f"""
                            <div class="state-message-card">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <span class="state-badge {badge_class}">{sender_name}</span>
                                    <span style="font-size: 0.75rem; color: rgba(255,255,255,0.3);">Index: #{s_idx}</span>
                                </div>
                                <div style="font-size: 0.9rem; white-space: pre-wrap; line-height: 1.4;">{sm_content or "(Empty content)"}</div>
                            </div>
                            """, unsafe_allow_html=True)
                            
                            if sm_tool_calls:
                                for tc in sm_tool_calls:
                                    st.warning(f"🔧 **Tool Call:** `{tc.get('name')}` with arguments: `{tc.get('args')}` (ID: `{tc.get('id')}`)")
                            if sm_tool_call_id:
                                st.info(f"🆔 **Tool Call Match ID:** `{sm_tool_call_id}`")
                                
                sub_values = task.get("values", {})
                other_vals = {k: v for k, v in sub_values.items() if k not in ["messages"]}
                if other_vals:
                    with st.expander("Inspect sub-agent state variables", expanded=False):
                        st.json(other_vals)
                st.markdown("---")
                
    with tab_raw:
        st.markdown("### ⚙️ Raw JSON State Snapshot")
        st.caption("Complete representation of the state snapshot from the checkpointer:")
        st.json(state_details)


with st.sidebar:
    st.markdown("""
    <div style="text-align: center; padding: 1rem 0;">
        <h1 style="color: #7C3AED; font-weight: 700; margin: 0; font-size: 2rem;">StudentOS</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 0.2rem;">University AI Assistant</p>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    page = st.radio("Navigation", ["💬 Chat Portal", "⚙️ Setup & Integrations", "🏥 Diagnostics & Health"], index=0, label_visibility="collapsed")
    
    st.markdown("---")
    
    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    time_str = now.strftime("%I:%M %p")
    day_str = now.strftime("%A, %b %d")
    
    st.markdown(f"""
    <div class="sidebar-card">
        <span style="color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Active Campus Time</span>
        <h3 style="color: white; margin: 0.2rem 0 0 0; font-size: 1.6rem; font-weight: 700;">{time_str}</h3>
        <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin: 0;">{day_str}</p>
    </div>
    """, unsafe_allow_html=True)
    
    email_status, email_color = check_gmail_status()
    classroom_status, classroom_color = check_classroom_status()
    whatsapp_status, whatsapp_color = check_whatsapp_status()
    
    st.markdown(f"""
    <div class="sidebar-card">
        <span style="color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; display: block; margin-bottom: 0.6rem;">Integration Status</span>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">📱 WhatsApp Web</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="status-dot {'pulse-dot' if whatsapp_color == '#10B981' else ''}" style="background-color: {whatsapp_color}; box-shadow: 0 0 10px {whatsapp_color}; margin-right: 0;"></span>
                    <span style="color: {whatsapp_color}; font-weight: 500; font-size: 0.8rem;">{whatsapp_status}</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">✉️ University Email</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="status-dot {'pulse-dot' if email_color == '#10B981' else ''}" style="background-color: {email_color}; box-shadow: 0 0 10px {email_color}; margin-right: 0;"></span>
                    <span style="color: {email_color}; font-weight: 500; font-size: 0.8rem;">{email_status}</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">📅 Course Timetable</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="status-dot" style="background-color: #10B981; box-shadow: 0 0 10px #10B981; margin-right: 0;"></span>
                    <span style="color: #10B981; font-weight: 500; font-size: 0.8rem;">Ready</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">🏫 Google Classroom</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="status-dot {'pulse-dot' if classroom_color == '#10B981' else ''}" style="background-color: {classroom_color}; box-shadow: 0 0 10px {classroom_color}; margin-right: 0;"></span>
                    <span style="color: {classroom_color}; font-weight: 500; font-size: 0.8rem;">{classroom_status}</span>
                </div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    <div class="sidebar-card">
        <span style="color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; display: block; margin-bottom: 0.6rem;">Session Controls</span>
    </div>
    """, unsafe_allow_html=True)
    
    st.caption(f"Thread ID: `{st.session_state.thread_id}`")
    
    if st.button("✨ Clear & Restart Chat", use_container_width=True, type="primary"):
        st.session_state.thread_id = f"st_{uuid.uuid4().hex[:8]}"
        st.session_state.messages = []
        st.toast("Chat context reset successfully!", icon="✨")
        st.rerun()

    if st.button("🤖 Inspect Complete State", use_container_width=True):
        show_state_modal()

if page == "💬 Chat Portal":
    show_chat_portal()
elif page == "⚙️ Setup & Integrations":
    show_setup_integrations()
else:
    show_health_diagnostics()
