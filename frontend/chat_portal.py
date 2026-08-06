import streamlit as st
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "../backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from langchain_core.messages import ToolMessage
from utils import check_pending_approval, run_orchestrator

def show_chat_portal():
    if "action_to_take" in st.session_state and st.session_state.action_to_take:
        action_info = st.session_state.action_to_take
        st.session_state.action_to_take = None
        
        action = action_info["action"]
        msg_index = action_info["msg_index"]
        task_state = action_info["task_state"]
        tool_call = action_info["tool_call"]
        
        st.session_state.messages[msg_index]["status"] = "approved" if action == "approve" else "rejected"
        
        with st.spinner("Processing approved action..." if action == "approve" else "Cancelling action..."):
            try:
                config = {"configurable": {"thread_id": st.session_state.thread_id}}
                
                if action == "approve":
                    response = run_orchestrator(st.session_state.orchestrator, None, config=config)
                else:
                    st.session_state.orchestrator.update_state(
                        task_state,
                        {"messages": [ToolMessage(content="Tool execution rejected by user.", tool_call_id=tool_call["id"], name=tool_call["name"])]},
                        as_node="tools"
                    )
                    response = run_orchestrator(st.session_state.orchestrator, None, config=config)
                    
                pending_task, pending_tool = check_pending_approval(st.session_state.orchestrator, config)
                
                if pending_tool:
                    category = "whatsapp" if pending_task.name == "whatsapp_agent" else "email"
                    st.session_state.messages.append({
                        "role": "assistant",
                        "type": "assistant_approval",
                        "avatar": "📱" if category == "whatsapp" else "✉️",
                        "category": category,
                        "tool_call": pending_tool,
                        "status": "pending",
                        "task_state": pending_task.state
                    })
                else:
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
                    
                    if not content:
                        if response.get("messages"):
                            content = response["messages"][-1].content
                        else:
                            content = "⚠️ Execution completed, but no messages were produced."
                    
                    avatars = {
                        "whatsapp": "📱",
                        "email": "✉️",
                        "timetable": "📅",
                        "classroom": "🏫",
                        "general": "💬"
                    }
                    avatar = avatars.get(category, "💬")
                    
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": content,
                        "avatar": avatar,
                        "category": category
                    })
                    
                st.rerun()
                
            except Exception as e:
                st.error(f"❌ **Error executing action:** {str(e)}")

    st.markdown("""
    <div class="main-header">
        <h1>🎓 StudentOS Portal</h1>
        <p>Your AI-Powered University Assistant. Seamlessly integrating WhatsApp, Gmail, Campus Timetables, and Google Classroom.</p>
    </div>
    """, unsafe_allow_html=True)
    
    for index, msg in enumerate(st.session_state.messages):
        with st.chat_message(msg["role"], avatar=msg["avatar"]):
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
            
            if msg.get("type") == "assistant_approval":
                tool_call = msg["tool_call"]
                status = msg["status"]
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                
                display_name = tool_name.replace("_", " ").title()
                
                args_html = ""
                for arg_name, arg_val in tool_args.items():
                    args_html += f"<div style='margin-bottom: 4px;'><b>{arg_name}:</b> {arg_val}</div>"
                
                card_html = f"""
                <div class="approval-card" style="
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px dashed rgba(139, 92, 246, 0.3);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-top: 0.5rem;
                    margin-bottom: 0.5rem;
                    backdrop-filter: blur(8px);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <span style="color: #a78bfa; font-weight: 600; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">Approval Required</span>
                        <span style="font-size: 0.8rem; padding: 2px 8px; border-radius: 20px; background: rgba(139, 92, 246, 0.15); color: #c084fc; font-weight: 500;">{display_name}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: rgba(255,255,255,0.8); line-height: 1.4; margin-bottom: 1rem;">
                        {args_html}
                    </div>
                """
                
                if status == "approved":
                    card_html += """
                    <div style="display: flex; align-items: center; gap: 6px; color: #10B981; font-weight: 600; font-size: 0.9rem;">
                        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px #10B981;"></span>
                        Action Approved & Executed
                    </div>
                    """
                elif status == "rejected":
                    card_html += """
                    <div style="display: flex; align-items: center; gap: 6px; color: #EF4444; font-weight: 600; font-size: 0.9rem;">
                        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #EF4444; box-shadow: 0 0 8px #EF4444;"></span>
                        Action Rejected & Cancelled
                    </div>
                    """
                
                card_html += "</div>"
                st.markdown(card_html, unsafe_allow_html=True)
                
                if status == "pending":
                    col_approve, col_reject, _ = st.columns([1, 1, 2])
                    with col_approve:
                        if st.button("👍 Approve", key=f"appr_{tool_call['id']}_{index}", use_container_width=True, type="primary"):
                            st.session_state.action_to_take = {
                                "action": "approve",
                                "msg_index": index,
                                "task_state": msg["task_state"],
                                "tool_call": tool_call
                            }
                            st.rerun()
                    with col_reject:
                        if st.button("👎 Reject", key=f"rej_{tool_call['id']}_{index}", use_container_width=True):
                            st.session_state.action_to_take = {
                                "action": "reject",
                                "msg_index": index,
                                "task_state": msg["task_state"],
                                "tool_call": tool_call
                            }
                            st.rerun()
            else:
                st.markdown(msg["content"])

    if query := st.chat_input("Ask StudentOS about your classes, emails, whatsapp, or calendar..."):
        st.session_state.messages.append({
            "role": "user",
            "content": query,
            "avatar": "👤",
            "category": "general"
        })
        st.rerun()
        
    if st.session_state.messages and st.session_state.messages[-1]["role"] == "user":
        user_msg = st.session_state.messages[-1]
        
        with st.chat_message("assistant", avatar="🎓"):
            message_placeholder = st.empty()
            with st.spinner("StudentOS Orchestrator is coordinating agents..."):
                try:
                    config = {"configurable": {"thread_id": st.session_state.thread_id}}
                    
                    response = run_orchestrator(
                        st.session_state.orchestrator,
                        {"messages": [("human", user_msg["content"])], "query": user_msg["content"]},
                        config=config
                    )
                    
                    pending_task, pending_tool = check_pending_approval(st.session_state.orchestrator, config)
                    
                    if pending_tool:
                        category = "whatsapp" if pending_task.name == "whatsapp_agent" else "email"
                        st.session_state.messages.append({
                            "role": "assistant",
                            "type": "assistant_approval",
                            "avatar": "📱" if category == "whatsapp" else "✉️",
                            "category": category,
                            "tool_call": pending_tool,
                            "status": "pending",
                            "task_state": pending_task.state
                        })
                    else:
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
                        
                        if not content:
                            if response.get("messages"):
                                content = response["messages"][-1].content
                            else:
                                content = "⚠️ Orchestrator execution finished, but no messages were produced."
                        
                        avatars = {
                            "whatsapp": "📱",
                            "email": "✉️",
                            "timetable": "📅",
                            "classroom": "🏫",
                            "general": "💬"
                        }
                        avatar = avatars.get(category, "💬")
                        
                        st.session_state.messages.append({
                            "role": "assistant",
                            "content": content,
                            "avatar": avatar,
                            "category": category
                        })
                    
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
                    st.rerun()
