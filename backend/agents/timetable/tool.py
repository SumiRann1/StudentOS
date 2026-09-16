import os
import json
from typing import Optional, List, Dict, Any
from langchain_core.tools import tool

current_dir = os.path.dirname(os.path.abspath(__file__))
timetable_path = os.path.join(current_dir, "../../../data/timetable.json")
day_override_path = os.path.join(current_dir, "../../../data/timetable_schedule.json")
acad_schedule_path = os.path.join(current_dir, "../../../data/academic_calendar_2026_27_monsoon.json")

with open(timetable_path, 'r', encoding='utf-8') as tt:
    data = json.load(tt)
    with open(day_override_path, 'r', encoding='utf-8') as do:
        day_override_data = json.load(do)
    with open(acad_schedule_path, 'r', encoding='utf-8') as ac:
        acad_schedule_data = json.load(ac)

def normalize_date(date_str: str) -> str:
    """Helper to convert DD-MM-YYYY or YYYY-MM-DD to standard YYYY-MM-DD format."""
    if not date_str:
        return ""
    date_str = date_str.strip()
    parts = date_str.split("-")
    if len(parts) == 3:
        if len(parts[0]) == 4:  # YYYY-MM-DD
            return f"{parts[0]}-{int(parts[1]):02d}-{int(parts[2]):02d}"
        elif len(parts[2]) == 4:  # DD-MM-YYYY
            return f"{parts[2]}-{int(parts[1]):02d}-{int(parts[0]):02d}"
    return date_str


@tool
def get_day_schedule(day: str):
    """
    Returns the complete timetable for a given weekday (e.g. 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday').
    Use this tool to fetch the schedule for a specific weekday.

    Args:
        day: Day of the week (e.g. 'Monday', 'Tuesday', 'Friday').

    Returns:
        All lectures, tutorials and labs for that day with course, faculty, venue, and timing.
    """
    day = day.strip().capitalize()

    if day in data.get("timetable", {}):
        return { "success": True, "message": "Schedule found.", "data": [{"day": day, "timetable": data["timetable"][day]}] }
    return {"success": False, "message": f"No classes found for {day}.", "data": []}

@tool
def get_course_details(query: str) -> dict:
    """Retrieve detailed information about one or more courses.
    Use this tool whenever the user asks:
    - Tell me about CSL201.
    - What are the credits of MAL403?
    - Who teaches CSP203?
    - Show the syllabus of Discrete Mathematics.
    - Where is the lab for CSP203?

    Returns:
        Course information including credits, faculty, syllabus and schedule.

    Args:
        query: The course code (e.g., 'CSL201', 'MAL403') or course name (e.g., 'Discrete Mathematics').
    """
    query = query.strip().lower()
    matched_courses = []
    for code, info in data.get("courses", {}).items():
        if (query in code.lower() or query in info.get("courseCode", "").lower() or query in info.get("nickname", "").lower() or query in info.get("courseName", "").lower()):
            matched_courses.append(info)
            
    if matched_courses:
        for course in matched_courses:
            schedule = []
            nickname = course.get("nickname", "").lower()
            full_code = course.get("courseCode", "").lower()
            
            for day, slots in data.get("timetable", {}).items():
                for slot in slots:
                    slot_key = (slot.get("courseKey") or "").lower()
                    slot_code = (slot.get("courseCode") or "").lower()
                    
                    is_match = False
                    if nickname and (nickname in slot_key or nickname in slot_code):
                        is_match = True
                    elif full_code and (full_code in slot_code or slot_code in full_code):
                        is_match = True
                        
                    if is_match:
                        schedule.append({
                            "day": day,
                            "time": slot.get("time"),
                            "type": slot.get("type"),
                            "venue": slot.get("venue"),
                        })
            course["schedule"] = schedule
        return {"success": True, "message": "Courses found.", "data": matched_courses}
    return {"success": False, "message": f"No course found matching '{query}'.", "data": []}


@tool 
def get_day_override_info(query: str = "") -> dict:
    """Retrieve information about timetable day overrides (dates where a weekday follows another day's schedule).
    Use this tool whenever the user asks:
    - What are the day overrides?
    - Are there any day overrides?
    - Is there a day override on 2026-09-15?
    - What schedule does Tuesday Sept 15 follow?

    Args:
        query: Optional keyword, date (YYYY-MM-DD or DD-MM-YYYY), or day name. If empty or general, returns all day overrides.
    """
    raw_query = query.strip().lower()
    norm_query = normalize_date(raw_query)
    overrides = day_override_data.get("dayOverrides", [])
    
    if not raw_query or raw_query in ["all", "any", "list", "show", "overrides", "day overrides", "upcoming"]:
        return {"success": True, "count": len(overrides), "data": overrides}
        
    matches = []
    for item in overrides:
        date_str = str(item.get("date", "")).lower()
        day_str = str(item.get("day", "")).lower()
        follows_str = str(item.get("followsTimetableOf", "")).lower()
        if (raw_query and (raw_query in date_str or raw_query in day_str or raw_query in follows_str)) or (norm_query and norm_query == date_str):
            matches.append(item)
            
    if matches:
        return {"success": True, "count": len(matches), "data": matches}
    return {"success": False, "message": f"No day override matching '{query}' found.", "data": []}


@tool
def get_all_holidays(query: str = "") -> dict:
    """Retrieve information about official institute holidays.
    Use this tool whenever the user asks:
    - What are the holidays?
    - Are there any upcoming holidays?
    - When is Holi / Diwali / Independence Day / Christmas?
    - Is Gandhi Jayanti a holiday?

    Args:
        query: Optional holiday name (e.g., 'Diwali', 'Holi'), date (YYYY-MM-DD or DD-MM-YYYY), or day name. If empty or general, returns all holidays.
    """
    raw_query = query.strip().lower()
    norm_query = normalize_date(raw_query)
    holidays = day_override_data.get("holidays", [])
    
    if not raw_query or raw_query in ["all", "any", "list", "show", "holidays", "next", "upcoming"]:
        return {"success": True, "count": len(holidays), "data": holidays}
        
    matches = []
    for h in holidays:
        name_str = str(h.get("name", "")).lower()
        date_str = str(h.get("date", "")).lower()
        day_str = str(h.get("day", "")).lower()
        if (raw_query and (raw_query in name_str or raw_query in date_str or raw_query in day_str)) or (norm_query and norm_query == date_str):
            matches.append(h)
            
    if matches:
        return {"success": True, "count": len(matches), "data": matches}
    return {"success": False, "message": f"No holiday matching '{query}' found.", "data": []}


@tool
def get_academic_calendar_events(query: str = "") -> dict:
    """Retrieve academic calendar dates, events, and key deadlines for the semester (2026-27 Monsoon).
    Use this tool whenever the user asks:
    - When are mid-semester exams?
    - When are end-semester exams?
    - When is the mid-semester break / vacation?
    - When is course add and drop?
    - What are the registration dates or grade submission deadline?

    Args:
        query: Keyword or event name (e.g., 'mid-sem', 'end-sem', 'break', 'vacation', 'registration', 'add and drop', 'grades'). If empty or general, returns all events.
    """
    query = (query or "").strip().lower()
    semester = acad_schedule_data.get("semester", "2026-27 Monsoon")
    events = acad_schedule_data.get("events", [])
    
    if not query or query in ["all", "any", "list", "show", "calendar", "events", "academic calendar"]:
        return {"success": True, "semester": semester, "count": len(events), "data": events}
        
    matches = []
    for ev in events:
        event_name = str(ev.get("event", "")).lower()
        date_str = str(ev.get("date", "")).lower()
        note_str = str(ev.get("note", "")).lower()
        if query in event_name or query in date_str or query in note_str:
            matches.append(ev)
            
    if matches:
        return {"success": True, "semester": semester, "count": len(matches), "data": matches}
    return {"success": False, "message": f"No academic calendar event found matching '{query}'.", "semester": semester, "data": events}


tools_list_time = [
    get_day_schedule,
    get_course_details,
    get_day_override_info,
    get_all_holidays,
    get_academic_calendar_events,
]
