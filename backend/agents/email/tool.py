import os
import sys
import base64
from email.message import EmailMessage
from email.mime.text import MIMEText
from langchain_core.tools import tool
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

current_dir = os.path.dirname(os.path.abspath(__file__))
SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]
TOKEN_FILE = os.path.join(current_dir, "token.json")
CREDENTIALS_FILE = os.path.join(current_dir, "credentials.json")

def get_gmail_service():
    """Get or refresh the Gmail API client credentials."""
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                raise FileNotFoundError(
                    "Gmail credentials.json file is missing. "
                    "Please upload credentials.json and token.json in the 'Setup & Integrations' page."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)

def resolve_email_id(query_or_id: str) -> str:
    """
    Resolves an email subject, sender, query description, or index to the actual message ID.
    If it is a valid hex message ID (16-char hex), returns it directly.
    Otherwise, searches Gmail with it as a query and returns the ID of the first match.
    """
    query_or_id = str(query_or_id).strip()
    if len(query_or_id) == 16 and all(c in "0123456789abcdefABCDEF" for c in query_or_id):
        return query_or_id
        
    try:
        s = get_gmail_service()
        res = s.users().messages().list(userId="me", q=query_or_id, maxResults=1).execute()
        messages = res.get("messages", [])
        if messages:
            return messages[0]["id"]
    except Exception:
        pass
        
    return query_or_id

@tool
def draft_email(to: str, subject: str, body: str) -> dict:
    """
    Create a Gmail draft without sending it.

    Use this tool whenever the user wants to:
    - draft an email
    - compose an email
    - write an email
    - prepare an email

    Do not use this tool if the user explicitly asks to
    send the email immediately.

    Returns:
    The Gmail draft ID.

    Args:
        to: Recipient email address.
        subject: Email subject.
        body: Email body content.
    """
    s = get_gmail_service()
    m = MIMEText(body)
    m["to"] = to
    m["subject"] = subject
    raw = base64.urlsafe_b64encode(m.as_bytes()).decode()
    return s.users().drafts().create(userId="me", body={"message": {"raw": raw}}).execute()

@tool
def send_email(to: str, subject: str, body: str) -> dict:
    """
    Send an email using the authenticated Gmail account.

    Use this tool only after all required information
    (recipient, subject and body) has been collected.

    Do NOT call this tool if the user is only asking to
    draft or preview an email.

    Required:
    - recipient
    - subject
    - body

    Returns:
    Confirmation from Gmail that the email has been sent.

    Args:
        to: Recipient email address.
        subject: Email subject.
        body: Email body content.
    """
    s = get_gmail_service()
    m = MIMEText(body)
    m["to"] = to
    m["subject"] = subject
    raw = base64.urlsafe_b64encode(m.as_bytes()).decode()
    return s.users().messages().send(userId="me", body={"raw": raw}).execute()

def _search_email(query: str, max_results: int = 10) -> list:
    s = get_gmail_service()
    res = s.users().messages().list(userId="me", q=query, maxResults=max_results).execute()
    out = []
    for msg in res.get("messages", []):
        d = s.users().messages().get(userId="me", id=msg["id"], format="metadata", metadataHeaders=["Subject", "From", "Date"]).execute()
        h = {x["name"]: x["value"] for x in d["payload"]["headers"]}
        out.append({"id": msg["id"], "subject": h.get("Subject", ""), "from": h.get("From", ""), "date": h.get("Date", "")})
    return out

@tool
def search_email(query: str, max_results: int) -> str:
    """
    Search the authenticated Gmail inbox.

    Use this tool whenever the user asks to:
    - find an email
    - locate an email
    - search unread emails
    - search by sender
    - search by subject
    - search today's emails

    Returns:
    Matching email IDs, sender, subject and date.

    Args:
        query: Search query (e.g., 'from:professor', 'is:unread', 'subject:assignment').
        max_results: Maximum number of results to return.
    """
    import json
    return json.dumps(_search_email(query, max_results), default=str)

def process_message_attachments(msg: dict, message_id: str, download: bool = True) -> list:
    """
    Helper function to list and optionally download attachments from a Gmail message payload.
    """
    import base64
    import os
    
    p = msg.get("payload", {})
    attachments_info = []
    
    def process_parts(parts):
        for part in parts:
            filename = part.get("filename")
            mime_type = part.get("mimeType")
            body = part.get("body", {})
            attachment_id = body.get("attachmentId")
            
            if attachment_id and filename:
                info = {
                    "filename": filename,
                    "mimeType": mime_type,
                    "size": body.get("size", 0),
                    "attachmentId": attachment_id
                }
                
                if download:
                    try:
                        s = get_gmail_service()
                        att_res = s.users().messages().attachments().get(
                            userId="me", messageId=message_id, id=attachment_id
                        ).execute()
                        
                        save_dir = "/home/sumirann/Documents/StudentOS/data/attachments"
                        os.makedirs(save_dir, exist_ok=True)
                        filepath = os.path.join(save_dir, filename)
                        
                        with open(filepath, "wb") as f:
                            f.write(base64.urlsafe_b64decode(att_res.get("data", "")))
                            
                        info["local_path"] = f"file://{filepath}"
                    except Exception as e:
                        info["download_error"] = str(e)
                    
                attachments_info.append(info)
            
            if "parts" in part:
                process_parts(part["parts"])
                
    if "parts" in p:
        process_parts(p["parts"])
    elif "filename" in p and p.get("body", {}).get("attachmentId"):
        process_parts([p])
        
    return attachments_info

def _read_email(message_id: str) -> dict:
    s = get_gmail_service()
    msg = s.users().messages().get(userId="me", id=message_id, format="full").execute()
    p = msg["payload"]
    body = ""
    if "parts" in p:
        for part in p["parts"]:
            if part["mimeType"] == "text/plain" and "data" in part["body"]:
                body = base64.urlsafe_b64decode(part["body"]["data"]).decode(errors="ignore")
                break
    elif "data" in p["body"]:
        body = base64.urlsafe_b64decode(p["body"]["data"]).decode(errors="ignore")
    h = {x["name"]: x["value"] for x in p["headers"]}
    
    # Process and download attachments automatically when reading an email
    attachments = process_message_attachments(msg, message_id, download=True)
    
    return {
        "subject": h.get("Subject"), 
        "from": h.get("From"), 
        "to": h.get("To"), 
        "date": h.get("Date"), 
        "body": body,
        "attachments": attachments
    }

@tool
def read_email(message_id: str) -> dict:
    """
    Read the full contents of a Gmail message.

    Use this tool after obtaining an email ID, or you can pass the email's subject/sender search description directly.

    Returns:
    Sender, recipient, subject, date, message body and any attachment details.

    Args:
        message_id: The Gmail message ID, or a subject/sender search description.
    """
    resolved_id = resolve_email_id(message_id)
    return _read_email(resolved_id)

@tool
def summarize_inbox(max_results: int) -> dict:
    """Retrieve and summarize unread emails in the inbox.

    Args:
        max_results: Maximum number of unread emails to retrieve.
    """
    emails = _search_email("is:unread", max_results)
    return {"unread_count": len(emails), "emails": emails}

@tool
def reply_email(message_id: str, reply_text: str) -> dict:
    """Reply to a specific email.

    Args:
        message_id: The ID or subject/sender search description of the email to reply to.
        reply_text: The reply body content.
    """
    resolved_id = resolve_email_id(message_id)
    orig = _read_email(resolved_id)
    subj = orig["subject"] or ""
    if not subj.lower().startswith("re:"):
        subj = "Re: " + subj
    
    s = get_gmail_service()
    m = MIMEText(reply_text)
    m["to"] = orig["from"]
    m["subject"] = subj
    raw = base64.urlsafe_b64encode(m.as_bytes()).decode()
    return s.users().messages().send(userId="me", body={"raw": raw}).execute()

@tool
def read_unread_emails_in_interval(start_time: str, end_time: str) -> list:
    """Retrieve and read all unread emails received between two time intervals.

    Args:
        start_time: Start time of the interval (e.g. 'YYYY-MM-DD HH:MM:SS', 'YYYY-MM-DD', or UNIX epoch timestamp).
        end_time: End time of the interval (e.g. 'YYYY-MM-DD HH:MM:SS', 'YYYY-MM-DD', or UNIX epoch timestamp).
    """
    from datetime import datetime
    import time
    
    def parse_time(t_str):
        try:
            return int(float(t_str))
        except ValueError:
            pass
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y/%m/%d %H:%M",
            "%Y-%m-%d",
            "%Y/%m/%d"
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(t_str.strip(), fmt)
                return int(time.mktime(dt.timetuple()))
            except ValueError:
                continue
        raise ValueError(f"Unable to parse time format: {t_str}")
        
    start_epoch = parse_time(start_time)
    end_epoch = parse_time(end_time)
    
    query = f"is:unread after:{start_epoch} before:{end_epoch}"
    s = get_gmail_service()
    res = s.users().messages().list(userId="me", q=query).execute()
    
    emails = []
    for msg in res.get("messages", []):
        email_detail = _read_email(msg["id"])
        email_detail["id"] = msg["id"]
        emails.append(email_detail)
        
    import json
    return json.dumps(emails, default=str)

@tool
def get_email_attachments(message_id: str, download: bool = True) -> str:
    """
    List and optionally download attachments from a specific Gmail message.

    Use this tool when the user asks to see, check, download, or list attachments in an email.

    Args:
        message_id: The Gmail message ID, or a subject/sender search description.
        download: Whether to download and save the attachments locally. Defaults to True.
    """
    import json
    resolved_id = resolve_email_id(message_id)
    s = get_gmail_service()
    msg = s.users().messages().get(userId="me", id=resolved_id, format="full").execute()
    attachments = process_message_attachments(msg, resolved_id, download=download)
    return json.dumps(attachments, default=str)

tools_list_email = [draft_email, send_email, search_email, read_email, summarize_inbox, reply_email, read_unread_emails_in_interval, get_email_attachments]