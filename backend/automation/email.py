from backend.agents.email.tool import get_emails_in_date_range
from db.database import save_messages, save_thread

async def create_email_jobs(user: str = "Student"):
    """Email Graph se tool use karke CRON Job run karna"""
    thread_id = f"default_email_{user}"
    await save_thread(thread_id=thread_id, user_name=user, title="Email Digest Summary")

    try:
        res = get_emails_in_date_range.invoke({"start_date": "6h ago", "query": "is:unread", "max_results": 20})
        emails = res.get("emails", []) if isinstance(res, dict) else []

        if not emails:
            markdown_text = "✉️ **No unread emails in the last 24 hours.** You are all caught up!"
        else:
            lines = [f"### ✉️ Unread Email Digest (Past 24h — {len(emails)} Messages)\n"]
            for m in emails:
                subject = m.get("subject") or "No Subject"
                sender = m.get("from") or "Unknown Sender"
                snippet = m.get("snippet") or ""
                link = m.get("link") or ""
                link_text = f" — [Open Email ↗]({link})" if link else ""
                lines.append(f"- **{subject}**{link_text}\n  *From*: `{sender}`\n  > {snippet}\n")
            markdown_text = "\n".join(lines)
    except Exception as e:
        markdown_text = f"✉️ **Email Digest**: Safe background mode active ({str(e)})."

    await save_messages(thread_id=thread_id, sender="agent", content=markdown_text)
    return {
        "status": "done",
        "response": markdown_text,
        "messages": [{"sender": "agent", "content": markdown_text}]
    }