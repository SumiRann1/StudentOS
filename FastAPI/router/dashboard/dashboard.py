from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Dict, Any, Optional
from fastapi import APIRouter, Query
from backend.agents.timetable.tool import get_day_schedule, get_day_override_info, get_all_holidays
from backend.agents.classroom.tool import get_upcoming_assignments
from backend.automation.classroom import create_classroom_jobs
from backend.automation.timetable import create_timetable_jobs
from backend.automation.email import create_email_jobs
from db.database import get_thread_messages
from FastAPI.router.dashboard.schema import DashBoardResponse, BreifingClass

dashboard_router = APIRouter(tags=["Dashboard"])


def _get_kolkata_now():
    """Kolkata timezone me current datetime nikalne ka simple helper."""
    return datetime.now(ZoneInfo("Asia/Kolkata"))


def _calculate_greeting(now_dt: datetime) -> str:
    """Time of day ke hisab se greeting text calculate karta hai."""
    hour = now_dt.hour
    if 5 <= hour < 12:
        return "Good morning"
    elif 12 <= hour < 17:
        return "Good afternoon"
    elif 17 <= hour < 22:
        return "Good evening"
    return "Good night"


def _parse_time_to_minutes(time_str: str) -> Optional[int]:
    """Time string (e.g. '09:00', '9:30 AM', '14:00') ko midnight se elapsed minutes me convert karta hai."""
    if not time_str:
        return None
    s = time_str.strip()
    for fmt in ("%H:%M", "%I:%M %p", "%I:%M%p", "%H:%M:%S"):
        try:
            t = datetime.strptime(s, fmt)
            return t.hour * 60 + t.minute
        except ValueError:
            pass
    return None


def _parse_slot_times(time_range_str: str):
    """Slot time range string ('09:00 - 10:00') ko start aur end minutes me parse karta hai."""
    if not time_range_str or "-" not in time_range_str:
        return None, None
    parts = time_range_str.split("-")
    start_mins = _parse_time_to_minutes(parts[0])
    end_mins = _parse_time_to_minutes(parts[1])
    return start_mins, end_mins


def get_next_class_logic(user_now: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Current ongoing class, next upcoming class countdown aur total active class hours calculate karta hai (IST me).
    """
    now = user_now or _get_kolkata_now()
    weekday = now.strftime("%A")
    date_str = now.strftime("%Y-%m-%d")
    current_minutes = now.hour * 60 + now.minute

    # Check for Holiday using shared holiday tool engine
    try:
        h_res = get_all_holidays.invoke({"query": date_str})
        if h_res.get("success") and h_res.get("data"):
            for h in h_res["data"]:
                if h.get("date") == date_str:
                    return {
                        "status": "holiday",
                        "message": f"Holiday today: {h.get('name', 'Institute Holiday')}",
                        "day": weekday,
                        "current_class": None,
                        "next_class": None,
                        "active_hours": 0,
                        "active_slots_count": 0,
                    }
    except Exception:
        pass

    # Check for Day Override using shared override tool engine
    effective_day = weekday
    try:
        o_res = get_day_override_info.invoke({"query": date_str})
        if o_res.get("success") and o_res.get("data"):
            for item in o_res["data"]:
                if item.get("date") == date_str:
                    effective_day = item.get("followsTimetableOf", weekday).capitalize()
                    break
    except Exception:
        pass

    # Fetch schedule slots using shared schedule tool engine
    day_slots = []
    try:
        s_res = get_day_schedule.invoke({"day": effective_day})
        if s_res.get("success") and s_res.get("data"):
            day_slots = s_res["data"][0].get("timetable", [])
    except Exception:
        pass

    if not day_slots:
        return {
            "status": "no_classes",
            "message": f"No classes scheduled for {effective_day}.",
            "day": effective_day,
            "current_class": None,
            "next_class": None,
            "active_hours": 0,
            "active_slots_count": 0,
        }

    IGNORE_KEYWORDS = ["free", "lunch", "recess", "break", "interval", "holiday", "no class", "nil"]
    active_slots = []
    for s in day_slots:
        val = (s.get("courseCode") or s.get("courseKey") or s.get("type") or "").lower()
        if any(k in val for k in IGNORE_KEYWORDS):
            continue
        start_m, end_m = _parse_slot_times(s.get("time", ""))
        active_slots.append({
            "courseCode": s.get("courseCode") or s.get("courseKey") or "Class",
            "courseName": s.get("courseName") or s.get("type") or s.get("courseCode") or "Lecture",
            "venue": s.get("venue", "TBA"),
            "time": s.get("time", ""),
            "type": s.get("type", "Lecture"),
            "start_mins": start_m,
            "end_mins": end_m,
        })

    total_active_mins = 0
    for s in active_slots:
        if s["start_mins"] is not None and s["end_mins"] is not None:
            total_active_mins += max(60, s["end_mins"] - s["start_mins"])
        else:
            total_active_mins += 60
    total_active_hours = round(total_active_mins / 60.0, 1)

    current_class = None
    next_class = None

    for s in active_slots:
        start_m = s["start_mins"]
        end_m = s["end_mins"]
        if start_m is None:
            continue
        if end_m and start_m <= current_minutes < end_m:
            current_class = {**s, "ends_in_mins": end_m - current_minutes}
        elif start_m > current_minutes:
            if next_class is None or start_m < next_class["start_mins"]:
                next_class = {**s, "starts_in_mins": start_m - current_minutes}

    if current_class:
        status = "ongoing"
    elif next_class:
        status = "upcoming"
    else:
        status = "day_completed"

    return {
        "status": status,
        "day": effective_day,
        "current_class": current_class,
        "next_class": next_class,
        "active_hours": total_active_hours,
        "active_slots_count": len(active_slots),
    }


def parse_badge_text_from_markdown(text: str, widget_type: str, active_hours: float = 0.0) -> str:
    """Markdown content ya counts me se badge text nikalne ka logic."""
    if not text or not isinstance(text, str):
        if widget_type == "timetable" and active_hours > 0:
            return f"{active_hours} Hours"
        return "Live"

    clean = text.strip()
    if "|" in clean:
        rows = [l.strip() for l in clean.split("\n") if l.strip().startswith("|") and l.strip().endswith("|")]
        data_rows = []
        for r in rows[2:]:
            line = r.lower()
            if "---" in line:
                continue
            if any(k in line for k in ["lunch", "break", "no class",  "interval", "holiday"]):
                continue
            data_rows.append(r)
        count = len(data_rows)
        if widget_type == "email":
            return f"{count} Unread"
        if widget_type == "classroom":
            return f"{count} Pending"
        if widget_type == "timetable":
            return f"{count} Hours"

    bullets = []
    for l in clean.split("\n"):
        trimmed = l.strip()
        lower = trimmed.lower()
        if any(k in lower for k in ["lunch", "break", "recess", "no class", "free period", "interval", "holiday"]):
            continue
        if (trimmed.startswith("-") or trimmed.startswith("*") or trimmed.startswith("•")) and len(trimmed) > 5:
            bullets.append(trimmed)

    count = len(bullets)
    if count == 0:
        # Check if header contains (X Messages) or count
        import re
        m = re.search(r"\((\d+)\s*(Messages|Pending|Assignments)?\)", clean, re.IGNORECASE)
        if m:
            count = int(m.group(1))

    if widget_type == "email":
        return f"{count} Unread" if count > 0 else "Live"
    if widget_type == "classroom":
        return f"{count} Pending" if count > 0 else "Live"
    if widget_type == "timetable":
        return f"{count} Hours" if count > 0 else (f"{active_hours} Hours" if active_hours > 0 else "Live")
    return "Synced"


def compute_submission_status(
    submission_state: str,
    assigned_grade: Optional[Any] = None,
    max_points: Optional[Any] = None,
    is_late: bool = False
) -> Dict[str, str]:
    """Submission status ka human-readable label aur badge emoji compute karta hai."""
    state = (submission_state or "NEW").upper()

    def _fmt(val):
        if val is None:
            return None
        try:
            f = float(val)
            return f"{f:g}"
        except (ValueError, TypeError):
            return str(val)

    g_str = _fmt(assigned_grade)
    m_str = _fmt(max_points)

    if state == "RETURNED" or assigned_grade is not None:
        if g_str is not None and m_str is not None:
            lbl = f"Graded: {g_str}/{m_str}"
        elif g_str is not None:
            lbl = f"Graded: {g_str}"
        else:
            lbl = "Graded"
        return {"statusLabel": lbl, "statusType": "graded", "statusBadge": "🟣 Graded"}

    if state == "TURNED_IN":
        if is_late:
            return {"statusLabel": "Submitted Late", "statusType": "late", "statusBadge": "🟡 Submitted Late"}
        return {"statusLabel": "Turned In", "statusType": "turned_in", "statusBadge": "🟢 Turned In"}

    if state == "RECLAIMED_BY_STUDENT":
        return {"statusLabel": "Unsubmitted (Draft)", "statusType": "reclaimed", "statusBadge": "🟠 Draft"}

    if is_late or state in ["NEW", "CREATED"]:
        if is_late:
            return {"statusLabel": "Overdue / Missing", "statusType": "overdue", "statusBadge": "🔴 Overdue"}
        return {"statusLabel": "Assigned (Pending)", "statusType": "pending", "statusBadge": "🔵 Assigned"}

    return {"statusLabel": "Assigned (Pending)", "statusType": "pending", "statusBadge": "🔵 Assigned"}


def get_upcoming_deadlines_logic(max_results: int = 10) -> Dict[str, Any]:
    """
    Upcoming Google Classroom assignment deadlines fetch karke urgency (today/tomorrow/upcoming) wise order karta hai.
    """
    try:
        res = get_upcoming_assignments.invoke({"max_results": max_results})
        assignments = res.get("assignments", []) if isinstance(res, dict) else []

        processed = []
        for a in assignments:
            due_str = str(a.get("due", ""))
            due_lower = due_str.lower()
            if "today" in due_lower:
                urgency = "today"
                icon = "🔴"
            elif "tomorrow" in due_lower:
                urgency = "tomorrow"
                icon = "🟡"
            else:
                urgency = "upcoming"
                icon = "🟢"

            sub_state = a.get("submissionState", "NEW")
            assigned_grade = a.get("assignedGrade")
            max_points = a.get("maxPoints")
            is_late = a.get("late", False)

            status_meta = compute_submission_status(
                submission_state=sub_state,
                assigned_grade=assigned_grade,
                max_points=max_points,
                is_late=is_late
            )

            processed.append({
                "id": a.get("id"),
                "courseId": a.get("courseId"),
                "courseName": a.get("courseName") or "Course",
                "title": a.get("title") or "Assignment",
                "due": due_str,
                "urgency": urgency,
                "icon": icon,
                "submissionState": sub_state,
                "assignedGrade": assigned_grade,
                "maxPoints": max_points,
                "late": is_late,
                "statusLabel": status_meta["statusLabel"],
                "statusType": status_meta["statusType"],
                "statusBadge": status_meta["statusBadge"],
                "alternateLink": a.get("alternateLink", "")
            })

        return {
            "status": "success",
            "count": len(processed),
            "deadlines": processed
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "count": 0,
            "deadlines": []
        }


@dashboard_router.get("/classroom/upcoming-deadlines")
async def get_classroom_upcoming_deadlines(max_results: int = Query(10, ge=1, le=50)):
    """
    API endpoint to fetch structured upcoming Google Classroom assignment deadlines ordered by due date.
    """
    return get_upcoming_deadlines_logic(max_results=max_results)


@dashboard_router.get("/timetable/next-class")
async def get_next_class():
    """
    Computes current ongoing lecture slot, upcoming next class countdown (with course code, venue, and time remaining),
    or day completion status against current server time in IST timezone.
    """
    return get_next_class_logic()


@dashboard_router.get("/dashboard/briefings", response_model=DashBoardResponse)
async def get_dashboard_briefings(user_name: str = Query("Student")):
    """
    Returns pre-calculated briefings (populated from automated job results)
    and live next-class info for all 3 hero briefing cards in a single fast backend response.
    """
    now = _get_kolkata_now()
    greeting = _calculate_greeting(now)
    next_class_info = get_next_class_logic(now)

    email_thread_id = f"default_email_{user_name}"
    classroom_thread_id = f"default_classroom_{user_name}"
    timetable_thread_id = f"default_tt_{user_name}"

    async def _get_last_agent_text(thread_id: str) -> str:
        try:
            msgs = await get_thread_messages(thread_id)
            if not msgs:
                return ""
            for m in reversed(msgs):
                if m.get("sender") in ["agent", "assistant"] and m.get("content"):
                    return m["content"]
        except Exception:
            pass
        return ""

    email_text = await _get_last_agent_text(email_thread_id)
    classroom_text = await _get_last_agent_text(classroom_thread_id)
    timetable_text = await _get_last_agent_text(timetable_thread_id)

    # Active-User Lazy Auto-Sync: if cache is empty for active user, perform instant zero-LLM sync
    if not email_text:
        try:
            await create_email_jobs(user=user_name)
            email_text = await _get_last_agent_text(email_thread_id)
        except Exception:
            pass

    if not classroom_text:
        try:
            await create_classroom_jobs(user=user_name)
            classroom_text = await _get_last_agent_text(classroom_thread_id)
        except Exception:
            pass

    time_str = now.strftime("%H:%M:%S")
    target_dt = now + timedelta(days=1) if time_str >= "17:00:00" else now
    expected_weekday = target_dt.strftime("%A")

    if not timetable_text or expected_weekday.lower() not in timetable_text.lower():
        try:
            await create_timetable_jobs(user=user_name)
            timetable_text = await _get_last_agent_text(timetable_thread_id)
        except Exception:
            pass

    email_badge = parse_badge_text_from_markdown(email_text, "email")
    classroom_badge = parse_badge_text_from_markdown(classroom_text, "classroom")
    timetable_badge = parse_badge_text_from_markdown(
        timetable_text, "timetable", active_hours=next_class_info.get("active_hours", 0.0)
    )

    EMAIL_BREIF = BreifingClass(
        id="email",
        icon="✉️",
        title="Email Digest",
        badge=email_badge,
        badgeColor="#10A37F",
        schedule="Daily 1:00 AM",
        rawMarkdown=email_text,
        lastSynced="Last Automated Result" if email_text else "Not synced yet",
    )
    CLASSROOM_BREIF = BreifingClass(
        id="classroom",
        icon="📚",
        title="Classroom Pending",
        badge=classroom_badge,
        badgeColor="#8B5CF6",
        schedule="Daily 2:00 AM",
        rawMarkdown=classroom_text,
        lastSynced="Last Automated Result" if classroom_text else "Not synced yet",
    )
    timetable_title = "Tomorrows Schedule" if time_str >= "17:00:00" else "Todays Schedule"
    TIMETABLE_BREIF = BreifingClass(
        id="timetable",
        icon="📅",
        title=timetable_title,
        badge=timetable_badge,
        badgeColor="#38BDF8",
        schedule="Daily 3:00 AM & 5:00 PM",
        rawMarkdown=timetable_text,
        lastSynced="Last Automated Result" if timetable_text else "Not synced yet",
    )

    return DashBoardResponse(
        greeting=greeting,
        next_class=next_class_info,
        briefings={
            "email": EMAIL_BREIF,
            "classroom": CLASSROOM_BREIF,
            "timetable": TIMETABLE_BREIF,
        }
    )
