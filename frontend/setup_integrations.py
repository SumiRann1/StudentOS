import streamlit as st
import os
import sys
import subprocess
import shutil
import time

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "../backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from utils import check_whatsapp_status, check_gmail_status, check_classroom_status

def show_setup_integrations():
    st.markdown("""
    <div class="main-header">
        <h1>⚙️ Setup & Integrations</h1>
        <p>Manage your Google credentials, auth tokens, and synchronize WhatsApp Web.</p>
    </div>
    """, unsafe_allow_html=True)
    
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
                
                if os.path.exists(qr_path):
                    st.image(qr_path, caption="WhatsApp Web QR Code (Scan with phone)", width=300)
                    with open(qr_path, "rb") as f:
                        st.download_button(
                            label="📥 Download QR Code Image",
                            data=f.read(),
                            file_name="whatsapp_qr.png",
                            mime="image/png"
                        )
                    st.write("⏳ Waiting for scan... The page will refresh automatically.")
                else:
                    st.write("⏳ Initializing browser & generating QR code... Please wait.")
                    
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
                
                time.sleep(2)
                st.rerun()
            else:
                st.session_state["whatsapp_process"] = None
                if os.path.exists(qr_path):
                    try:
                        os.remove(qr_path)
                    except Exception:
                        pass
                
                log_file = os.path.abspath(os.path.join(current_dir, "../data/whatsapp_sync.log"))
                logs = ""
                if os.path.exists(log_file):
                    try:
                        with open(log_file, "r") as f:
                            logs = f.read()
                    except Exception:
                        pass
                
                if exit_code == 0:
                    st.success("✅ WhatsApp Web connected and authenticated successfully!")
                    st.toast("WhatsApp Web authenticated!", icon="✅")
                else:
                    st.error(f"❌ WhatsApp sync failed with exit code {exit_code}.")
                    if logs:
                        st.code(logs)
                st.rerun()
        else:
            status_text, _ = check_whatsapp_status()
            if status_text == "Ready":
                st.success("✅ WhatsApp is connected and session is ready for tool calls.")
            else:
                st.warning("⚠️ WhatsApp is not logged in. You need to run the sync tool once.")
                
            if st.button("🔌 Start WhatsApp Sync"):
                # Close any active browser context in the current process first
                try:
                    from agents.whatsapp.client import WhatsAppClient
                    WhatsAppClient().close()
                except Exception:
                    pass

                if os.path.exists(qr_path):
                    try:
                        os.remove(qr_path)
                    except Exception:
                        pass
                
                log_file = os.path.abspath(os.path.join(current_dir, "../data/whatsapp_sync.log"))
                os.makedirs(os.path.dirname(log_file), exist_ok=True)
                
                cmd = [sys.executable, "-u", os.path.join(backend_dir, "agents/whatsapp/login.py")]
                env = os.environ.copy()
                env["WHATSAPP_HEADLESS"] = "false"
                
                try:
                    with open(log_file, "w") as log_f:
                        proc = subprocess.Popen(
                            cmd,
                            stdout=log_f,
                            stderr=log_f,
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
                try:
                    from agents.whatsapp.client import WhatsAppClient
                    WhatsAppClient().close()
                except Exception:
                    pass
                
                try:
                    shutil.rmtree(session_dir)
                    marker_path = os.path.abspath(os.path.join(current_dir, "../data/whatsapp_authenticated.marker"))
                    if os.path.exists(marker_path):
                        os.remove(marker_path)
                    st.toast("WhatsApp session cleared. Please log in again.", icon="🗑️")
                except Exception as e:
                    st.error(f"Error clearing session: {e}")
                st.rerun()
        else:
            st.button("🗑️ Clear WhatsApp Session", disabled=True, use_container_width=True)
            
    st.markdown("---")
    
    st.markdown("### 🔑 Google Workspace Setup")
    
    email_dir = os.path.abspath(os.path.join(current_dir, "../backend/agents/email"))
    classroom_dir = os.path.abspath(os.path.join(current_dir, "../backend/agents/classroom"))
    
    g_col1, g_col2 = st.columns(2)
    
    with g_col1:
        st.subheader("✉️ Gmail / Email Integration")
        g_status, _ = check_gmail_status()
        st.write(f"Current Status: **{g_status}**")
        
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
