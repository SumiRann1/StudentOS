import os
import sys
from backend.agents.classroom.tool import get_upcoming_assignments
from db.database import save_messages, save_thread

async def create_classroom_jobs(user: str = "Student"):
    """
    Direct zero-LLM connector job for Google Classroom upcoming assignment deadlines.
    Fetches raw Google API data and formats clean Markdown output instantly without consuming LLM tokens.
    """
    thread_id = f"default_classroom_{user}"
    await save_thread(thread_id=thread_id, user_name=user, title="Classroom Pending Deadlines")

    try:
        res = get_upcoming_assignments.invoke({"max_results": 5})
        assignments = res.get("assignments", []) if isinstance(res, dict) else []

        if not assignments:
            markdown_text = "🎉 **No upcoming pending assignments!** You are all caught up across your enrolled Google Classroom courses."
        else:
            lines = ["### 📚 Upcoming Classroom Assignment Deadlines\n"]
            for a in assignments:
                course = a.get("courseName") or "Course"
                title = a.get("title") or "Assignment"
                due = a.get("due") or "Upcoming"
                link = a.get("alternateLink") or ""
                state = a.get("submissionState", "NEW")

                due_lower = str(due).lower()
                status_icon = "🔴" if "today" in due_lower else ("🟡" if "tomorrow" in due_lower else "🟢")
                link_text = f" — [Open Assignment ↗]({link})" if link else ""
                lines.append(f"{status_icon} **[{course}]** {title} — Due: `{due}` ({state}){link_text}")
            markdown_text = "\n".join(lines)
    except Exception as e:
        markdown_text = f"⚠️ Could not fetch Google Classroom deadlines: {str(e)}"

    await save_messages(thread_id=thread_id, sender="agent", content=markdown_text)
    return {
        "status": "done",
        "response": markdown_text,
        "messages": [{"sender": "agent", "content": markdown_text}]
    }
