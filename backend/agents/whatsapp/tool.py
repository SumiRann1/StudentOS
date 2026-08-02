import os
import time
import re
from langchain_core.tools import tool
from agents.whatsapp.client import WhatsAppClient

@tool
def get_whatsapp_chat_list() -> list[dict]:
    """
    Return all available WhatsApp chats.

    Returns:
        List of dictionaries containing:
            - name: Chat name
            - unread: Number of unread messages
    """
    client = WhatsAppClient()
    page = client.get_page()
    
    page.wait_for_selector('div[data-testid="chat-list"]', timeout=10000)
    
    try:
        page.evaluate("document.getElementById('pane-side').scrollTop = 0")
    except Exception:
        pass
        
    time.sleep(1)
    
    chat_items = page.query_selector_all('div[data-testid="cell-frame-container"]')
    if not chat_items:
        chat_items = page.query_selector_all('div[role="row"]')
        
    chats = []
    for item in chat_items:
        name_element = item.query_selector('span[data-testid="chat-title"], span[title]')
        if not name_element:
            continue
        name = name_element.get_attribute('title') or name_element.inner_text()
        name = name.strip()
        if not name:
            continue
            
        unread_element = item.query_selector('span[data-testid="icon-unread-count"]')
        if not unread_element:
            unread_element = item.query_selector('span[aria-label*="unread"], span[class*="unread"]')
            
        unread = 0
        if unread_element:
            try:
                unread_text = unread_element.inner_text().strip()
                unread = int(unread_text) if unread_text.isdigit() else 1
            except Exception:
                unread = 1
                
        chats.append({
            "name": name,
            "unread": unread
        })
        
    seen = set()
    unique_chats = []
    for c in chats:
        if c["name"] not in seen:
            seen.add(c["name"])
            unique_chats.append(c)
            
    return unique_chats

def open_whatsapp_chat(page, chat_name: str) -> str:
    """
    Helper function to search, resolve, and click a chat by name (exact or substring).
    Returns the exact resolved chat name.
    """
    query = chat_name.strip().lower()
    
    # 1. Try finding in the currently visible chat list
    chat_items = page.query_selector_all('div[data-testid="cell-frame-container"]')
    if not chat_items:
        chat_items = page.query_selector_all('div[role="row"]')
        
    best_match = None
    best_match_name = None
    for item in chat_items:
        name_element = item.query_selector('span[data-testid="chat-title"], span[title]')
        if not name_element:
            continue
        name = name_element.get_attribute('title') or name_element.inner_text()
        name = name.strip()
        if not name:
            continue
        if name.lower() == query:
            item.click()
            time.sleep(1)
            return name
        if query in name.lower():
            best_match = item
            best_match_name = name
            
    if best_match:
        best_match.click()
        time.sleep(1)
        return best_match_name
        
    # 2. Try searching via the search box
    search_box = page.query_selector('div[contenteditable="true"][data-tab="3"], input[data-testid="chat-list-search"]')
    if search_box:
        search_box.click()
        search_box.focus()
        page.keyboard.press("Control+A")
        page.keyboard.press("Backspace")
        time.sleep(0.5)
        
        search_box.type(chat_name)
        time.sleep(1.5)
        
        chat_items = page.query_selector_all('div[data-testid="cell-frame-container"]')
        if not chat_items:
            chat_items = page.query_selector_all('div[role="row"]')
            
        best_match = None
        best_match_name = None
        for item in chat_items:
            name_element = item.query_selector('span[data-testid="chat-title"], span[title]')
            if not name_element:
                continue
            name = name_element.get_attribute('title') or name_element.inner_text()
            name = name.strip()
            if not name:
                continue
            if name.lower() == query:
                item.click()
                time.sleep(1)
                return name
            if query in name.lower():
                best_match = item
                best_match_name = name
                
        if best_match:
            best_match.click()
            time.sleep(1)
            return best_match_name
            
        # Fallback press Enter to open first result
        search_box.press("Enter")
        time.sleep(1.5)
        
        header = page.query_selector("header span[title], header span")
        if header:
            opened_name = header.get_attribute("title") or header.inner_text()
            if query in opened_name.lower():
                return opened_name
                
    raise ValueError(f"Chat '{chat_name}' not found on WhatsApp Web.")

@tool
def read_whatsapp_messages(chat_name: str, limit: int = 10) -> list[dict]:
    """
    Read the latest messages from a WhatsApp chat.

    Args:
        chat_name: Name of the chat (or a search description/partial name).
        limit: Number of recent messages to return.

    Returns:
        List of dictionaries containing:
            - sender
            - message
            - timestamp
    """
    client = WhatsAppClient()
    page = client.get_page()
    resolved_name = open_whatsapp_chat(page, chat_name)
    
    page.wait_for_selector('div[data-testid="msg-container"]', timeout=10000)
    
    msg_containers = page.query_selector_all('div[data-testid="msg-container"]')
    if not msg_containers:
        msg_containers = page.query_selector_all('div.message-in, div.message-out')
        
    messages = []
    for container in msg_containers[-limit:]:
        sender = "Unknown"
        timestamp = ""
        
        meta_element = container.query_selector('[data-pre-plain-text]')
        if meta_element:
            meta_text = meta_element.get_attribute('data-pre-plain-text')
            match = re.match(r'\[([^\]]+)\]\s*([^:]+):', meta_text)
            if match:
                timestamp = match.group(1)
                sender = match.group(2).strip()
        else:
            class_attr = container.get_attribute('class') or ""
            if 'message-out' in class_attr:
                sender = "You"
            elif 'message-in' in class_attr:
                sender = resolved_name
                
        text_element = container.query_selector('span.selectable-text')
        if text_element:
            message_text = text_element.inner_text()
        else:
            message_text = container.inner_text()
            lines = [l.strip() for l in message_text.split('\n') if l.strip()]
            if len(lines) > 1 and re.match(r'^\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?$', lines[-1]):
                message_text = "\n".join(lines[:-1])
                
        messages.append({
            "sender": sender,
            "message": message_text.strip(),
            "timestamp": timestamp
        })
        
    search_box = page.query_selector('div[contenteditable="true"][data-tab="3"], input[data-testid="chat-list-search"]')
    if search_box:
        search_box.focus()
        page.keyboard.press("Control+A")
        page.keyboard.press("Backspace")
        page.keyboard.press("Escape")
        time.sleep(0.5)
        
    return messages

@tool
def send_whatsapp_message(chat_name: str, message: str) -> str:
    """
    Send a WhatsApp message.

    Args:
        chat_name: Recipient name (or a search description/partial name).
        message: Message text.

    Returns:
        Success message.
    """
    client = WhatsAppClient()
    page = client.get_page()
    resolved_name = open_whatsapp_chat(page, chat_name)
    
    input_box = page.wait_for_selector('div[contenteditable="true"][data-tab="10"], div[data-testid="conversation-text-input"]', timeout=10000)
    if not input_box:
        raise ValueError("Could not locate the message text input field.")
        
    input_box.click()
    input_box.focus()
    
    try:
        input_box.fill(message)
    except Exception:
        page.keyboard.type(message)
        
    time.sleep(0.5)
    
    send_btn = page.query_selector('span[data-testid="send"], button[data-testid="compose-btn-send"]')
    if send_btn:
        send_btn.click()
    else:
        input_box.press("Enter")
        
    time.sleep(1)
    
    search_box = page.query_selector('div[contenteditable="true"][data-tab="3"], input[data-testid="chat-list-search"]')
    if search_box:
        search_box.focus()
        page.keyboard.press("Control+A")
        page.keyboard.press("Backspace")
        page.keyboard.press("Escape")
        time.sleep(0.5)
        
    return f"Message sent to {resolved_name} successfully."

@tool
def summarize_whatsapp_chat(chat_name: str, limit: int = 30) -> str:
    """
    Summarize the latest messages from a WhatsApp chat.

    Args:
        chat_name: Name of the chat.
        limit: Number of messages to summarize.

    Returns:
        Natural language summary.
    """

    messages = read_whatsapp_messages.func(chat_name=chat_name, limit=limit)
    if not messages:
        return f"No messages found in chat '{chat_name}' to summarize."
        
    formatted_messages = []
    for msg in messages:
        sender = msg.get("sender", "Unknown")
        timestamp = msg.get("timestamp", "")
        text = msg.get("message", "")
        time_str = f"[{timestamp}] " if timestamp else ""
        formatted_messages.append(f"{time_str}{sender}: {text}")
        
    chat_history = "\n".join(formatted_messages)
    
    from config import llm
    
    prompt = (
        f"You are StudentOS Assistant. Summarize the following WhatsApp chat "
        f"between '{chat_name}' and 'You' (or others) in a clear, friendly, and "
        f"concise student-friendly style. Focus on key decisions, assignments, schedules, "
        f"or action items discussed.\n\n"
        f"Chat History:\n{chat_history}\n\n"
        f"Summary:"
    )
    
    try:
        response = llm.invoke(prompt)
        return response.content
    except Exception:
        return (
            f"Here is a summary of the latest {len(messages)} messages from {chat_name}:\n"
            f"- Last message from {messages[-1]['sender']}: \"{messages[-1]['message']}\"\n"
            f"- Chat has {len(messages)} recent interactions."
        )

tools_list_whatsapp = [get_whatsapp_chat_list, read_whatsapp_messages, send_whatsapp_message, summarize_whatsapp_chat]