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

from agents.orchestrator import build_orchestrator

st.set_page_config(
    page_title="StudentOS Portal",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

@st.cache_resource
def get_cached_orchestrator():
    return build_orchestrator()

if "orchestrator" not in st.session_state:
    st.session_state.orchestrator = get_cached_orchestrator()

if "thread_id" not in st.session_state:
    st.session_state.thread_id = f"st_{uuid.uuid4().hex[:8]}"

if "messages" not in st.session_state:
    st.session_state.messages = []

# Load custom CSS
css_file = os.path.join(current_dir, "style.css")
if os.path.exists(css_file):
    with open(css_file, "r") as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)


# --- SIDEBAR UI ---
with st.sidebar:
    st.markdown("""
    <div style="text-align: center; padding: 1rem 0;">
        <h1 style="color: #7C3AED; font-weight: 700; margin: 0; font-size: 2rem;">StudentOS</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 0.2rem;">University AI Assistant</p>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    # 1. System Clock Panel
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
    
    # 2. Integration Feeds Status Panel
    st.markdown("""
    <div class="sidebar-card">
        <span style="color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; display: block; margin-bottom: 0.6rem;">Integration Status</span>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">📱 WhatsApp Web</span>
                <div><span class="status-dot pulse-dot"></span><span style="color: #10B981; font-weight: 500; font-size: 0.8rem;">Online</span></div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">✉️ University Email</span>
                <div><span class="status-dot pulse-dot"></span><span style="color: #10B981; font-weight: 500; font-size: 0.8rem;">Online</span></div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">📅 Course Timetable</span>
                <div><span class="status-dot"></span><span style="color: #10B981; font-weight: 500; font-size: 0.8rem;">Ready</span></div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">🏫 Google Classroom</span>
                <div><span class="status-dot pulse-dot"></span><span style="color: #10B981; font-weight: 500; font-size: 0.8rem;">Online</span></div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # 3. Settings Panel
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

# --- MAIN SCREEN HEADER ---
st.markdown("""
<div class="main-header">
    <h1>🎓 StudentOS Portal</h1>
    <p>Your AI-Powered University Assistant. Seamlessly integrating WhatsApp, Gmail, Campus Timetables, and Google Classroom.</p>
</div>
""", unsafe_allow_html=True)

# --- CHAT WINDOW ZONE ---
# Render Chat History
for msg in st.session_state.messages:
    with st.chat_message(msg["role"], avatar=msg["avatar"]):
        # Dynamic module tag for responses
        if msg["role"] == "assistant" and msg.get("category"):
            category_names = {
                "whatsapp": "📱 WhatsApp Assistant",
                "email": "✉️ Email Assistant",
                "timetable": "📅 Timetable Assistant",
                "classroom": "🏫 Classroom Assistant",
                "general": "💬 General Assistant"
            }
            tag = category_names.get(msg["category"], "💬 Assistant")
            st.markdown(f"<span style='color: #a78bfa; font-weight: 600; font-size: 0.8rem; text-transform: uppercase;'>{tag}</span>", unsafe_allow_html=True)
        st.markdown(msg["content"])

# User Chat Input
if query := st.chat_input("Ask StudentOS about your classes, emails, whatsapp, or calendar..."):
    # 1. Render User Message
    st.session_state.messages.append({
        "role": "user",
        "content": query,
        "avatar": "👤",
        "category": "general"
    })
    
    with st.chat_message("user", avatar="👤"):
        st.markdown(query)
        
    # 2. Render Assistant Message with Spinner
    with st.chat_message("assistant", avatar="🎓"):
        message_placeholder = st.empty()
        
        with st.spinner("StudentOS Orchestrator is coordinating agents..."):
            try:
                # Prepare arguments
                config = {"configurable": {"thread_id": st.session_state.thread_id}}
                
                # Invoke Graph
                response = st.session_state.orchestrator.invoke(
                    {"messages": [("human", query)], "query": query},
                    config=config
                )
                
                # Determine response content and matching category
                content = ""
                category = "general"
                
                if response.get("wa_result"):
                    content = response["wa_result"][-1].content
                    category = "whatsapp"
                elif response.get("email_result"):
                    content = response["email_result"][-1].content
                    category = "email"
                elif response.get("timetable_result"):
                    content = response["timetable_result"][-1].content
                    category = "timetable"
                elif response.get("classroom_result"):
                    content = response["classroom_result"][-1].content
                    category = "classroom"
                elif response.get("general_result"):
                    content = response["general_result"][-1].content
                    category = "general"
                
                # Fallback to general messages if none found
                if not content:
                    if response.get("messages"):
                        content = response["messages"][-1].content
                    else:
                        content = "⚠️ Orchestrator execution finished, but no messages were produced."
                
                # Determine avatar icon
                avatars = {
                    "whatsapp": "📱",
                    "email": "✉️",
                    "timetable": "📅",
                    "classroom": "🏫",
                    "general": "💬"
                }
                avatar = avatars.get(category, "💬")
                
                # Store back in message history
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": content,
                    "avatar": avatar,
                    "category": category
                })
                
                # Rerun to update avatars and render correctly
                st.rerun()
                
            except Exception as e:
                error_msg = f"❌ **Error executing Orchestrator:** {str(e)}"
                message_placeholder.markdown(error_msg)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": error_msg,
                    "avatar": "❌",
                    "category": "general"
                })
