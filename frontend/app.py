import streamlit as st
import uuid
import sys
import os
import subprocess
import time
import shutil
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

# Status checker functions for sidebar and setup pages
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
    session_dir = os.path.abspath(os.path.join(current_dir, "../data/whatsapp_session"))
    if os.path.exists(session_dir) and any(os.scandir(session_dir)):
        try:
            from agents.whatsapp.client import WhatsAppClient
            client = WhatsAppClient()
            if client.initialized:
                return "Online", "#10B981"
            else:
                return "Ready", "#3B82F6"
        except Exception:
            return "Ready", "#3B82F6"
    return "Setup Required", "#EF4444"

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
    
    # Page Navigation
    page = st.radio(
        "Navigation",
        ["💬 Chat Portal", "⚙️ Setup & Integrations"],
        index=0,
        label_visibility="collapsed"
    )
    
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
    email_status, email_color = check_gmail_status()
    classroom_status, classroom_color = check_classroom_status()
    whatsapp_status, whatsapp_color = check_whatsapp_status()
    
    st.markdown(f"""
    <div class="sidebar-card">
        <span style="color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; display: block; margin-bottom: 0.6rem;">Integration Status</span>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">📱 WhatsApp Web</span>
                <div><span style="color: {whatsapp_color}; font-weight: 500; font-size: 0.8rem;">{whatsapp_status}</span></div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">✉️ University Email</span>
                <div><span style="color: {email_color}; font-weight: 500; font-size: 0.8rem;">{email_status}</span></div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">📅 Course Timetable</span>
                <div><span style="color: #10B981; font-weight: 500; font-size: 0.8rem;">🟢 Ready</span></div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.8);">🏫 Google Classroom</span>
                <div><span style="color: {classroom_color}; font-weight: 500; font-size: 0.8rem;">{classroom_status}</span></div>
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

# --- MAIN SCREEN ---
if page == "💬 Chat Portal":
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

else:
    st.markdown("""
    <div class="main-header">
        <h1>⚙️ Setup & Integrations</h1>
        <p>Manage your Google credentials, auth tokens, and synchronize WhatsApp Web.</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Integration 1: WhatsApp
    st.markdown("### 📱 WhatsApp Web Setup")
    session_dir = os.path.abspath(os.path.join(current_dir, "../data/whatsapp_session"))
    qr_path = os.path.abspath(os.path.join(current_dir, "../data/whatsapp_qr.png"))
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.write("This setup initializes a background Chromium instance via Playwright to log in to WhatsApp Web. If not logged in, a QR code will be generated below for you to scan.")
        
        proc = st.session_state.get("whatsapp_process")
        
        if proc is not None:
            exit_code = proc.poll()
            if exit_code is None:
                st.info("🔄 WhatsApp Sync Client is running. Scan the QR code below if available.")
                
                # Check for QR code
                if os.path.exists(qr_path):
                    st.image(qr_path, caption="WhatsApp Web QR Code (Scan with phone)", width=300)
                    
                    # Add refresh code button
                    if st.button("🔄 Refresh Code/Status"):
                        st.rerun()
                else:
                    st.write("⏳ Initializing browser & generating QR code... Please wait.")
                    time.sleep(2)
                    st.rerun()
                    
                if st.button("❌ Terminate Sync Client"):
                    proc.terminate()
                    st.session_state["whatsapp_process"] = None
                    if os.path.exists(qr_path):
                        try:
                            os.remove(qr_path)
                        except Exception:
                            pass
                    st.toast("WhatsApp sync client terminated.", icon="🛑")
                    st.rerun()
            else:
                stdout, stderr = proc.communicate()
                st.session_state["whatsapp_process"] = None
                if os.path.exists(qr_path):
                    try:
                        os.remove(qr_path)
                    except Exception:
                        pass
                if exit_code == 0:
                    st.success("✅ WhatsApp Web connected and authenticated successfully!")
                    st.toast("WhatsApp Web authenticated!", icon="✅")
                else:
                    st.error(f"❌ WhatsApp sync failed with exit code {exit_code}.")
                    st.code(stderr or stdout)
                st.rerun()
        else:
            # Not running
            status_text, _ = check_whatsapp_status()
            if status_text == "Online":
                st.success("✅ WhatsApp is currently Active & Online in the system.")
            elif status_text == "Ready":
                st.info("ℹ️ WhatsApp session is saved. Ready to make tool calls.")
            else:
                st.warning("⚠️ WhatsApp is not logged in. You need to run the sync tool once.")
                
            if st.button("🔌 Start WhatsApp Sync"):
                # Remove old QR path
                if os.path.exists(qr_path):
                    try:
                        os.remove(qr_path)
                    except Exception:
                        pass
                
                # Launch subprocess
                cmd = [sys.executable, os.path.join(backend_dir, "agents/whatsapp/login.py")]
                env = os.environ.copy()
                env["WHATSAPP_HEADLESS"] = "true"  # Force headless to capture screenshot
                
                try:
                    proc = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        env=env
                    )
                    st.session_state["whatsapp_process"] = proc
                    st.toast("WhatsApp sync client started!", icon="🚀")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to start sync client: {e}")
                    
    with col2:
        st.markdown("##### Actions")
        if os.path.exists(session_dir):
            if st.button("🗑️ Clear WhatsApp Session", use_container_width=True):
                # Close any active client context
                try:
                    from agents.whatsapp.client import WhatsAppClient
                    WhatsAppClient().close()
                except Exception:
                    pass
                
                try:
                    shutil.rmtree(session_dir)
                    st.toast("WhatsApp session cleared. Please log in again.", icon="🗑️")
                except Exception as e:
                    st.error(f"Error clearing session: {e}")
                st.rerun()
        else:
            st.button("🗑️ Clear WhatsApp Session", disabled=True, use_container_width=True)
            
    st.markdown("---")
    
    # Integration 2 & 3: Google Workspace
    st.markdown("### 🔑 Google Workspace Setup")
    
    email_dir = os.path.abspath(os.path.join(current_dir, "../backend/agents/email"))
    classroom_dir = os.path.abspath(os.path.join(current_dir, "../backend/agents/classroom"))
    
    g_col1, g_col2 = st.columns(2)
    
    with g_col1:
        st.subheader("✉️ Gmail / Email Integration")
        g_status, _ = check_gmail_status()
        st.write(f"Current Status: **{g_status}**")
        
        # File uploads
        creds_file = st.file_uploader("Upload Gmail credentials.json", type="json", key="gmail_creds")
        token_file = st.file_uploader("Upload Gmail token.json", type="json", key="gmail_token")
        
        if creds_file is not None:
            if st.button("Save Gmail credentials.json", key="btn_save_gmail_creds"):
                try:
                    os.makedirs(email_dir, exist_ok=True)
                    with open(os.path.join(email_dir, "credentials.json"), "wb") as f:
                        f.write(creds_file.getbuffer())
                    st.success("Successfully saved Gmail credentials.json")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to save: {e}")
                    
        if token_file is not None:
            if st.button("Save Gmail token.json", key="btn_save_gmail_token"):
                try:
                    os.makedirs(email_dir, exist_ok=True)
                    with open(os.path.join(email_dir, "token.json"), "wb") as f:
                        f.write(token_file.getbuffer())
                    st.success("Successfully saved Gmail token.json")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to save: {e}")
                    
        if os.path.exists(os.path.join(email_dir, "credentials.json")) or os.path.exists(os.path.join(email_dir, "token.json")):
            if st.button("🗑️ Clear Gmail Auth Files", key="btn_clear_gmail"):
                try:
                    for f_name in ["credentials.json", "token.json"]:
                        p = os.path.join(email_dir, f_name)
                        if os.path.exists(p):
                            os.remove(p)
                    st.toast("Gmail credentials cleared.", icon="🗑️")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to clear: {e}")
                    
    with g_col2:
        st.subheader("🏫 Google Classroom Integration")
        c_status, _ = check_classroom_status()
        st.write(f"Current Status: **{c_status}**")
        
        # File uploads
        c_creds_file = st.file_uploader("Upload Classroom credentials.json", type="json", key="class_creds")
        c_token_file = st.file_uploader("Upload Classroom token.json", type="json", key="class_token")
        
        if c_creds_file is not None:
            if st.button("Save Classroom credentials.json", key="btn_save_class_creds"):
                try:
                    os.makedirs(classroom_dir, exist_ok=True)
                    with open(os.path.join(classroom_dir, "credentials.json"), "wb") as f:
                        f.write(c_creds_file.getbuffer())
                    st.success("Successfully saved Classroom credentials.json")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to save: {e}")
                    
        if c_token_file is not None:
            if st.button("Save Classroom token.json", key="btn_save_class_token"):
                try:
                    os.makedirs(classroom_dir, exist_ok=True)
                    with open(os.path.join(classroom_dir, "token.json"), "wb") as f:
                        f.write(c_token_file.getbuffer())
                    st.success("Successfully saved Classroom token.json")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to save: {e}")
                    
        if os.path.exists(os.path.join(classroom_dir, "credentials.json")) or os.path.exists(os.path.join(classroom_dir, "token.json")):
            if st.button("🗑️ Clear Classroom Auth Files", key="btn_clear_class"):
                try:
                    for f_name in ["credentials.json", "token.json"]:
                        p = os.path.join(classroom_dir, f_name)
                        if os.path.exists(p):
                            os.remove(p)
                    st.toast("Classroom credentials cleared.", icon="🗑️")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to clear: {e}")
