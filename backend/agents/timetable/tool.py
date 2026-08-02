import os
import json
from langchain_core.tools import tool

current_dir = os.path.dirname(os.path.abspath(__file__))
timetable_path = os.path.join(current_dir, "../../../data/timetable.json")

data = json.load(open(timetable_path))

@tool
def get_day_schedule(day: str):
    """
    Returns the complete timetable for a given weekday.

    Use this tool whenever the user asks:
    - What classes do I have today?
    - Monday timetable
    - Tomorrow's schedule
    - Do I have any labs on Friday?
    - What is my schedule for Wednesday?

    Returns:
        All lectures, tutorials and labs with:
        - course
        - faculty
        - venue
        - timing
    """
    day = day.strip().capitalize()

    if day in data.get("timetable", {}):
        return { "success": True, "message": "Schedule found.", "data": [{"day": day, "timetable": data["timetable"][day]}] }
    return {
    "success": False,
    "message": f"No classes found for {day}.",
    "data": []
}

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
        return {"courses": matched_courses}
    return {"error": f"No course found matching '{query}'."}

tools_list_time = [get_day_schedule, get_course_details]