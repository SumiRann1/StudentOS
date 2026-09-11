import os
import base64
import email.utils
from email.message import EmailMessage
from typing import Optional, List, Dict, Any
from datetime import datetime
from zoneinfo import ZoneInfo
import json

def format_email_date(raw_date_str: str) -> str:
    """Converts email raw date header to Asia/Kolkata IST string."""
    try:
        dt = email.utils.parsedate_to_datetime(raw_date_str)
        return dt.astimezone(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %I:%M %p")
    except Exception:
        return str(raw_date_str or "")

os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from langchain_core.tools import tool

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

import json

SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../.."))
TOKEN_PATH = os.path.join(BASE_DIR, "data", "email_oauth_token.json")
CREDENTIALS_PATH = os.path.join(BASE_DIR, "data", "email_oauth_credentials.json")


def get_gmail_service():
    """
    Authenticates and builds the Gmail API service object.
    Uses token.json if available, EMAIL_OAUTH_TOKEN_JSON env var, or safe error handling on headless servers.
    """
    creds = None
    env_token = os.getenv("EMAIL_OAUTH_TOKEN_JSON")
    if env_token:
        try:
            info = json.loads(env_token)
            creds = Credentials.from_authorized_user_info(info, SCOPES)
        except Exception:
            pass

    if not creds and os.path.exists(TOKEN_PATH):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        except Exception:
            pass

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                if os.path.exists(TOKEN_PATH):
                    with open(TOKEN_PATH, "w", encoding="utf-8") as f:
                        f.write(creds.to_json())
            except Exception:
                creds = None

        if not creds or not creds.valid:
            # If running on Render or non-interactive server, do NOT block process with run_local_server
            if os.getenv("RENDER") or os.getenv("PORT") or os.getenv("HEADLESS"):
                raise RuntimeError(
                    "Gmail OAuth token is missing or invalid on the server. "
                    "Please upload your email_oauth_token.json via the app Setup menu or set EMAIL_OAUTH_TOKEN_JSON on Render."
                )

            if not os.path.exists(CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"Gmail OAuth credentials file not found at '{CREDENTIALS_PATH}'. "
                    "Please upload email_oauth_token.json via the app Setup menu."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")

            os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)
            with open(TOKEN_PATH, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def parse_email_body(payload: Dict[str, Any]) -> str:
    """Helper to extract text body from a Gmail message payload."""
    body = ""
    if "parts" in payload:
        for part in payload["parts"]:
            mime_type = part.get("mimeType", "")
            data = part.get("body", {}).get("data", "")
            if mime_type == "text/plain" and data:
                return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
            elif mime_type == "text/html" and data and not body:
                body = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
            elif "parts" in part:
                sub_body = parse_email_body(part)
                if sub_body:
                    return sub_body
    else:
        data = payload.get("body", {}).get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    return body


@tool
def search_emails(query: str = "is:unread", max_results: int = 5) -> dict:
    """
    Search emails in Gmail using a search query string.

    Args:
        query: Gmail search query (e.g., 'is:unread', 'from:professor@univ.edu', 'subject:assignment', 'label:INBOX').
        max_results: Maximum number of emails to retrieve (default 5).

    Returns:
        Dict with 'success', 'count', and list of email summaries containing id, sender, recipient, subject, date, snippet, and body.
    """
    try:
        service = get_gmail_service()
        response = service.users().messages().list(userId="me", q=query, maxResults=max_results).execute()
        messages = response.get("messages", [])

        if not messages:
            return {"success": True, "message": f"No emails found matching query '{query}'.", "count": 0, "emails": []}

        email_list = []
        for msg_meta in messages:
            msg = service.users().messages().get(userId="me", id=msg_meta["id"], format="full").execute()
            payload = msg.get("payload", {})
            headers = payload.get("headers", [])

            headers_dict = {h["name"].lower(): h["value"] for h in headers}

            subject = headers_dict.get("subject", "(No Subject)")
            sender = headers_dict.get("from", "Unknown")
            raw_date = headers_dict.get("date", "")
            date = format_email_date(raw_date)
            recipient = headers_dict.get("to", "")
            snippet = msg.get("snippet", "")
            body = parse_email_body(payload)

            email_list.append({
                "id": msg["id"],
                "threadId": msg.get("threadId"),
                "from": sender,
                "to": recipient,
                "subject": subject,
                "date": date,
                "snippet": snippet,
                "body": body[:500] if body else snippet  # return first 500 chars of body
            })

        return {"success": True, "count": len(email_list), "emails": email_list}
    except Exception as e:
        return {"success": False, "message": f"Failed to search emails: {str(e)}", "emails": []}


@tool
def read_email(message_id: str) -> dict:
    """
    Fetch full details and full text body of a specific email by message ID.

    Args:
        message_id: The Gmail message ID string.

    Returns:
        Dict with full email headers, full body, snippets, and label information.
    """
    try:
        service = get_gmail_service()
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
        payload = msg.get("payload", {})
        headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}
        body = parse_email_body(payload)

        return {
            "success": True,
            "id": msg["id"],
            "threadId": msg.get("threadId"),
            "from": headers.get("from", ""),
            "to": headers.get("to", ""),
            "subject": headers.get("subject", ""),
            "date": format_email_date(headers.get("date", "")),
            "labels": msg.get("labelIds", []),
            "body": body[:1500] if body else ""
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to read email '{message_id}': {str(e)}"}



@tool
def send_email(to: str, subject: str, body: str) -> dict:
    """
    Send an email via Gmail API.

    Args:
        to: Recipient email address.
        subject: Subject line of the email.
        body: Plain text body of the email.

    Returns:
        Dict confirming delivery status and sent message ID.
    """
    try:
        service = get_gmail_service()

        message = EmailMessage()
        message.set_content(body)
        message["To"] = to
        message["Subject"] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {"raw": encoded_message}

        sent_msg = service.users().messages().send(userId="me", body=create_message).execute()
        return {
            "success": True,
            "message": f"Email successfully sent to {to}.",
            "id": sent_msg["id"]
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to send email to {to}: {str(e)}"}


@tool
def create_email_draft(to: str, subject: str, body: str) -> dict:
    """
    Create a draft email in Gmail without sending it immediately.

    Args:
        to: Recipient email address.
        subject: Subject line of the draft.
        body: Body text of the draft.

    Returns:
        Dict confirming draft creation and draft ID.
    """
    try:
        service = get_gmail_service()

        message = EmailMessage()
        message.set_content(body)
        message["To"] = to
        message["Subject"] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        draft_body = {"message": {"raw": encoded_message}}

        draft = service.users().drafts().create(userId="me", body=draft_body).execute()
        return {
            "success": True,
            "message": f"Draft created for {to}.",
            "draft_id": draft["id"]
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to create draft: {str(e)}"}


@tool
def get_emails_in_date_range(start_date: str, end_date: str = "", query: str = "", max_results: int = 10) -> dict:
    """
    Retrieve all emails received between two dates or time intervals.

    Args:
        start_date: Start date/time string (e.g., 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM', 'YYYY-MM-DD HH:MM:SS', or '1h ago').
        end_date: End date/time string (e.g., 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM', 'YYYY-MM-DD HH:MM:SS'). If empty, defaults to current time or end of start date.
        query: Optional additional search filter (e.g., 'from:professor@univ.edu', 'is:unread').
        max_results: Maximum number of emails to retrieve (default 10).

    Returns:
        Dict with 'success', 'count', and list of email summaries within the specified date/time range.
    """
    try:
        service = get_gmail_service()

        import re
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo

        tz = ZoneInfo("Asia/Kolkata")

        def parse_datetime_input(dt_str: str, is_end: bool = False) -> Optional[datetime]:
            if not dt_str or not dt_str.strip():
                return None
            clean_str = dt_str.strip().replace("/", "-")

            if clean_str.isdigit():
                try:
                    return datetime.fromtimestamp(int(clean_str), tz=tz)
                except Exception:
                    pass

            rel_match = re.match(r"^(\d+)\s*(hour|hr|h|minute|min|m|day|d)s?\s*(ago)?$", clean_str.lower())
            if rel_match:
                num = int(rel_match.group(1))
                unit = rel_match.group(2)
                now_dt = datetime.now(tz=tz)
                if unit in ("hour", "hr", "h"):
                    return now_dt - timedelta(hours=num)
                elif unit in ("minute", "min", "m"):
                    return now_dt - timedelta(minutes=num)
                elif unit in ("day", "d"):
                    return now_dt - timedelta(days=num)

            datetime_formats = [
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S",
                "%d-%m-%Y %H:%M:%S",
                "%Y-%m-%dT%H:%M",
                "%Y-%m-%d %H:%M",
                "%d-%m-%Y %H:%M",
            ]
            for fmt in datetime_formats:
                try:
                    dt = datetime.strptime(clean_str, fmt)
                    return dt.replace(tzinfo=tz)
                except ValueError:
                    pass

            date_formats = ["%Y-%m-%d", "%d-%m-%Y"]
            for fmt in date_formats:
                try:
                    d = datetime.strptime(clean_str, fmt).date()
                    if is_end:
                        return datetime.combine(d, datetime.max.time(), tzinfo=tz)
                    else:
                        return datetime.combine(d, datetime.min.time(), tzinfo=tz)
                except ValueError:
                    pass

            return None

        start_dt = parse_datetime_input(start_date, is_end=False)
        end_dt = parse_datetime_input(end_date, is_end=True)

        if start_dt:
            if not end_dt:
                end_dt = datetime.now(tz=tz)

            start_epoch = int(start_dt.timestamp())
            end_epoch = int(end_dt.timestamp())
            search_query = f"after:{start_epoch} before:{end_epoch}"
        else:
            formatted_start = start_date.strip().replace("-", "/")
            formatted_end = end_date.strip().replace("-", "/") if end_date else formatted_start
            search_query = f"after:{formatted_start} before:{formatted_end}"

        if query:
            search_query += f" {query.strip()}"

        response = service.users().messages().list(userId="me", q=search_query, maxResults=max_results).execute()
        messages = response.get("messages", [])

        if not messages:
            return {
                "success": True,
                "message": f"No emails found between {start_date} and {end_date}.",
                "count": 0,
                "emails": []
            }

        email_list = []
        for msg_meta in messages:
            msg = service.users().messages().get(userId="me", id=msg_meta["id"], format="full").execute()
            payload = msg.get("payload", {})
            headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}
            body = parse_email_body(payload)

            email_list.append({
                "id": msg["id"],
                "threadId": msg.get("threadId"),
                "from": headers.get("from", "Unknown"),
                "to": headers.get("to", ""),
                "subject": headers.get("subject", "(No Subject)"),
                "date": format_email_date(headers.get("date", "")),
                "snippet": msg.get("snippet", ""),
                "body": body[:500] if body else msg.get("snippet", "")
            })

        return {"success": True, "count": len(email_list), "emails": email_list}
    except Exception as e:
        return {"success": False, "message": f"Failed to retrieve emails in date range: {str(e)}", "emails": []}


@tool
def search_emails_by_keyword(keyword: str, max_results: int = 5) -> dict:
    """
    Search emails for a specific keyword in subject, body, or sender information.

    Args:
        keyword: The keyword or phrase to search for (e.g. 'assignment', 'midterm', 'CSL201', 'project').
        max_results: Maximum number of emails to retrieve (default 5).

    Returns:
        Dict with 'success', 'count', and list of matching email summaries.
    """
    try:
        service = get_gmail_service()
        clean_keyword = keyword.strip()

        response = service.users().messages().list(userId="me", q=clean_keyword, maxResults=max_results).execute()
        messages = response.get("messages", [])

        if not messages:
            return {
                "success": True,
                "message": f"No emails found matching keyword '{keyword}'.",
                "count": 0,
                "emails": []
            }

        email_list = []
        for msg_meta in messages:
            msg = service.users().messages().get(userId="me", id=msg_meta["id"], format="full").execute()
            payload = msg.get("payload", {})
            headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}
            body = parse_email_body(payload)

            email_list.append({
                "id": msg["id"],
                "threadId": msg.get("threadId"),
                "from": headers.get("from", "Unknown"),
                "to": headers.get("to", ""),
                "subject": headers.get("subject", "(No Subject)"),
                "date": format_email_date(headers.get("date", "")),
                "snippet": msg.get("snippet", ""),
                "body": body[:500] if body else msg.get("snippet", "")
            })

        return {"success": True, "count": len(email_list), "emails": email_list}
    except Exception as e:
        return {"success": False, "message": f"Failed to search emails by keyword '{keyword}': {str(e)}", "emails": []}


@tool
def search_emails_by_keyword_in_date_range(keyword: str, start_date: str, end_date: str = "", max_results: int = 10) -> dict:
    """
    Search emails for a specific keyword within a specific date or time interval.

    Args:
        keyword: Keyword or phrase to search for (e.g. 'electricity', 'assignment', 'exam', 'lost umbrella').
        start_date: Start date/time string (e.g. 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM', '5h ago', '1 day ago').
        end_date: End date/time string (e.g. 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM'). If empty, defaults to current time or end of start date.
        max_results: Maximum number of emails to retrieve (default 10).

    Returns:
        Dict with 'success', 'count', and list of email summaries matching the keyword within the specified date/time range.
    """
    return get_emails_in_date_range.func(start_date=start_date, end_date=end_date, query=keyword, max_results=max_results)


email_tools = [
    search_emails,
    search_emails_by_keyword,
    search_emails_by_keyword_in_date_range,
    read_email,
    get_emails_in_date_range,
    send_email,
    create_email_draft,
]
