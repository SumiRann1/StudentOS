from backend.agents.classroom.tool import get_upcoming_assignments
from db.database import save_messages, save_thread


def _fmt_score(val):
    # Grades ko properly string format me convert karne ke liye helper function
    if val is None:
        return None
    try:
        f = float(val)
        return f"{f:g}"
    except (ValueError, TypeError):
        return str(val)


async def create_classroom_jobs(user: str = "Student"):
    """
    Classroom Graph tool ka use karke CRON JOB created
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
                assigned_grade = a.get("assignedGrade")
                max_points = a.get("maxPoints")
                is_late = a.get("late", False)

                g_str = _fmt_score(assigned_grade)
                m_str = _fmt_score(max_points)

                if state == "RETURNED" or assigned_grade is not None:
                    if g_str is not None and m_str is not None:
                        status_str = f"Graded ({g_str}/{m_str})"
                    elif g_str is not None:
                        status_str = f"Graded ({g_str})"
                    else:
                        status_str = "Graded"
                elif state == "TURNED_IN":
                    status_str = "Submitted Late" if is_late else "Turned In"
                elif state == "RECLAIMED_BY_STUDENT":
                    status_str = "Draft"
                elif is_late:
                    status_str = "Overdue"
                else:
                    status_str = "Assigned"

                due_lower = str(due).lower()
                status_icon = "🔴" if "today" in due_lower else ("🟡" if "tomorrow" in due_lower else "🟢")
                link_text = f" — [Open Assignment ↗]({link})" if link else ""
                lines.append(f"{status_icon} **[{course}]** {title} — Due: `{due}` • **Status: `{status_str}`**{link_text}")
            markdown_text = "\n".join(lines)
    except Exception as e:
        markdown_text = f"⚠️ Could not fetch Google Classroom deadlines: {str(e)}"

    await save_messages(thread_id=thread_id, sender="agent", content=markdown_text)
    return {
        "status": "done",
        "response": markdown_text,
        "messages": [{"sender": "agent", "content": markdown_text}]
    }

