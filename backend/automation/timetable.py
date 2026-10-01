import os
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from backend.agents.timetable.tool import get_day_schedule, get_day_override_info, get_all_holidays
from db.database import save_messages, save_thread

async def create_timetable_jobs(user: str = "Student"):
    """
    Direct zero-LLM connector job for daily timetable schedule.
    Formatted cleanly as bullet points for maximum UI readability.
    """
    thread_id = f"default_tt_{user}"
    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    target_dt = now
    time_str = now.strftime("%H:%M:%S")
    date_str = now.strftime("%Y-%m-%d")
    weekday = now.strftime("%A")

    if time_str >= "17:00:00":
        target_dt = now + timedelta(days=1)
        weekday = target_dt.strftime("%A")
        date_str = target_dt.strftime("%Y-%m-%d")

    thread_title = "Tomorrow's Timetable Schedule" if time_str >= "17:00:00" else "Today's Timetable Schedule"
    await save_thread(thread_id=thread_id, user_name=user, title=thread_title)
    effective_day = weekday
    try:
        overrides_res = get_day_override_info.invoke({"query": date_str})
        if overrides_res.get("success") and overrides_res.get("data"):
            for item in overrides_res["data"]:
                if item.get("date") == date_str:
                    effective_day = item.get("followsTimetableOf", weekday).capitalize()
                    break
    except Exception:
        pass

    try:
        holidays_res = get_all_holidays.invoke({"query": date_str})
        if holidays_res.get("success") and holidays_res.get("data"):
            for h in holidays_res["data"]:
                if h.get("date") == date_str:
                    h_name = h.get("name", "Institute Holiday")
                    markdown_text = f"🎉 **Holiday on {weekday} ({date_str})**: {h_name}. No classes scheduled!"
                    await save_messages(thread_id=thread_id, sender="agent", content=markdown_text)
                    return {
                        "status": "done",
                        "response": markdown_text,
                        "messages": [{"sender": "agent", "content": markdown_text}]
                    }
    except Exception:
        pass

    try:
        res = get_day_schedule.invoke({"day": effective_day})
        data = res.get("data", []) if isinstance(res, dict) else []
        slots = data[0].get("timetable", []) if data else []

        IGNORE_KEYWORDS = ["free", "lunch",  "holiday", "no class", "nil"]
        active_slots = [
            s for s in slots
            if not any(k in (s.get("courseCode") or s.get("courseKey") or s.get("type") or "").lower() for k in IGNORE_KEYWORDS)
        ]

        header_title = f"Timetable Schedule for {weekday}" if effective_day == weekday else f"Timetable Schedule for {weekday} (follows {effective_day} timetable)"

        if not active_slots:
            markdown_text = f"📅 **No classes scheduled for {weekday}.** Enjoy your day!"
        else:
            lines = [f"### 📅 {header_title}\n"]
            for s in active_slots:
                time_slot = s.get("time", "")
                course = s.get("courseCode") or s.get("courseKey") or "Class"
                stype = s.get("type", "Lecture")
                venue = s.get("venue", "TBA")
                lines.append(f"- **{time_slot}**: **{course}** ({stype}) — *Venue*: `{venue}`")
            markdown_text = "\n".join(lines)
    except Exception as e:
        markdown_text = f"⚠️ Could not fetch timetable schedule: {str(e)}"

    await save_messages(thread_id=thread_id, sender="agent", content=markdown_text)
    return {
        "status": "done",
        "response": markdown_text,
        "messages": [{"sender": "agent", "content": markdown_text}]
    }
