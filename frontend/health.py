import streamlit as st
import os
import sys
import json
from datetime import datetime
from zoneinfo import ZoneInfo

st.set_page_config(page_title="StudentOS Diagnostics", page_icon="🏥", layout="wide", initial_sidebar_state="collapsed")

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "../backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from utils import check_classroom_status, check_gmail_status, check_whatsapp_status

def show_health_diagnostics():
    css_file = os.path.join(current_dir, "style.css")
    if os.path.exists(css_file):
        with open(css_file, "r") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

    st.markdown("""
    <div class="main-header" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.85) 0%, rgba(59, 130, 246, 0.7) 100%); box-shadow: 0 8px 32px 0 rgba(16, 185, 129, 0.15); border-color: rgba(255, 255, 255, 0.15);">
        <h1>🏥 System Diagnostics & Health</h1>
        <p>Live health metrics, integration status checks, API connectivity logs, and local databases metrics for StudentOS.</p>
    </div>
    """, unsafe_allow_html=True)

    wa_status, wa_color = check_whatsapp_status()
    gmail_status, gmail_color = check_gmail_status()
    class_status, class_color = check_classroom_status()

    st.markdown("### 🔌 API & Integration Feeds")
    col_wa, col_gmail, col_class, col_tt = st.columns(4)

    with col_wa:
        st.markdown(f"""
        <div class="sidebar-card" style="margin-bottom: 0; min-height: 250px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: white; font-size: 1.15rem;">📱 WhatsApp Web</h4>
                    <span class="status-dot {'pulse-dot' if wa_color == '#10B981' else ''}" style="background-color: {wa_color}; box-shadow: 0 0 10px {wa_color}; margin-right: 0;"></span>
                </div>
                <p style="font-size: 0.85rem; color: rgba(255,255,255,0.65); line-height: 1.4;">
                    Connects to WhatsApp Web using a headless Playwright Chromium instance. Uses cookie session caching for state persistence.
                </p>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.8rem; margin-top: auto;">
                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 600;">Status</div>
                <div style="font-size: 1.1rem; color: {wa_color}; font-weight: 700;">{wa_status}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_gmail:
        st.markdown(f"""
        <div class="sidebar-card" style="margin-bottom: 0; min-height: 250px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: white; font-size: 1.15rem;">✉️ University Gmail</h4>
                    <span class="status-dot {'pulse-dot' if gmail_color == '#10B981' else ''}" style="background-color: {gmail_color}; box-shadow: 0 0 10px {gmail_color}; margin-right: 0;"></span>
                </div>
                <p style="font-size: 0.85rem; color: rgba(255,255,255,0.65); line-height: 1.4;">
                    Connects to Gmail API via official Google OAuth Client. Scope permissions allow reading, composing, and drafting emails.
                </p>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.8rem; margin-top: auto;">
                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 600;">Status</div>
                <div style="font-size: 1.1rem; color: {gmail_color}; font-weight: 700;">{gmail_status}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_class:
        st.markdown(f"""
        <div class="sidebar-card" style="margin-bottom: 0; min-height: 250px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: white; font-size: 1.15rem;">🏫 Google Classroom</h4>
                    <span class="status-dot {'pulse-dot' if class_color == '#10B981' else ''}" style="background-color: {class_color}; box-shadow: 0 0 10px {class_color}; margin-right: 0;"></span>
                </div>
                <p style="font-size: 0.85rem; color: rgba(255,255,255,0.65); line-height: 1.4;">
                    Connects to Classroom API to list courses, retrieve uncompleted homework tasks, fetch updates, and check coursework grades.
                </p>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.8rem; margin-top: auto;">
                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 600;">Status</div>
                <div style="font-size: 1.1rem; color: {class_color}; font-weight: 700;">{class_status}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_tt:
        st.markdown(f"""
        <div class="sidebar-card" style="margin-bottom: 0; min-height: 250px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: white; font-size: 1.15rem;">📅 Timetable Engine</h4>
                    <span class="status-dot" style="background-color: #10B981; box-shadow: 0 0 10px #10B981; margin-right: 0;"></span>
                </div>
                <p style="font-size: 0.85rem; color: rgba(255,255,255,0.65); line-height: 1.4;">
                    Local schedule query engine. Matches current weekday and resolves class schedules and details using high-speed JSON queries.
                </p>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.8rem; margin-top: auto;">
                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 600;">Status</div>
                <div style="font-size: 1.1rem; color: #10B981; font-weight: 700;">Active</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    st.markdown("### 📊 Database & Cache Diagnostics")
    col_data1, col_data2 = st.columns([1, 1])

    with col_data1:
        st.subheader("📁 Database Status")
        
        timetable_file = os.path.join(current_dir, "../data/timetable.json")
        if os.path.exists(timetable_file):
            try:
                with open(timetable_file, "r") as f:
                    data = json.load(f)
                    
                courses_count = len(data.get("courses", {}))
                days_count = len(data.get("timetable", {}))
                slots_count = sum(len(slots) for slots in data.get("timetable", {}).values())
                
                st.success("🟢 `timetable.json` loaded successfully.")
                st.metric(label="Registered Courses", value=courses_count)
                
                sub_col1, sub_col2 = st.columns(2)
                with sub_col1:
                    st.metric(label="Scheduled Days", value=days_count)
                with sub_col2:
                    st.metric(label="Weekly Lecture Slots", value=slots_count)
                    
            except Exception as e:
                st.error(f"🔴 Failed to parse `timetable.json`: {str(e)}")
        else:
            st.warning("⚠️ `timetable.json` not found in `/data/` directory.")

    with col_data2:
        st.subheader("💻 System Information")
        
        now_kolkata = datetime.now(ZoneInfo("Asia/Kolkata"))
        st.info(f"📍 **Campus Timezone:** `Asia/Kolkata` (Kolkata, India)")
        st.write(f"📅 **Server Day:** `{now_kolkata.strftime('%A')}`")
        st.write(f"⏰ **Server Time:** `{now_kolkata.strftime('%Y-%m-%d %I:%M %p')}`")
        
        attachments_dir = os.path.join(current_dir, "../data/attachments")
        att_count = 0
        if os.path.exists(attachments_dir):
            att_count = len([f for f in os.listdir(attachments_dir) if os.path.isfile(os.path.join(attachments_dir, f))])
        
        st.write(f"📂 **Cached Email Attachments:** `{att_count} file(s)`")
        
        session_dir = os.path.join(current_dir, "../data/whatsapp_session")
        session_exists = "Exists" if os.path.exists(session_dir) else "Not Present"
        st.write(f"📱 **WhatsApp Persistent Session:** `{session_exists}`")

    if st.button("🔄 Trigger Diagnostics Refresh", type="primary", use_container_width=True):
        st.toast("Re-running diagnostics checks...", icon="🏥")
        st.rerun()

if __name__ == "__main__":
    show_health_diagnostics()
