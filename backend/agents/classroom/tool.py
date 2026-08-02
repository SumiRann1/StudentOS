import os
import sys
from langchain_core.tools import tool
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

current_dir = os.path.dirname(os.path.abspath(__file__))
SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/classroom.announcements.readonly"
]
TOKEN_FILE = os.path.join(current_dir, "token.json")
CREDENTIALS_FILE = os.path.join(current_dir, "credentials.json")

def get_classroom_service():
    """Get or refresh the Classroom API client credentials."""
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return build("classroom", "v1", credentials=creds)

def resolve_course_id(course_id_or_name: str) -> str:
    """
    Resolves a course name or ID to the actual numeric course ID.
    If it is already numeric, returns it. Otherwise, searches active courses.
    """
    course_id_or_name = str(course_id_or_name).strip()
    if course_id_or_name.isdigit():
        return course_id_or_name
        
    try:
        s = get_classroom_service()
        res = s.courses().list(studentId="me", courseStates="ACTIVE").execute()
        courses = res.get("courses", [])
        for c in courses:
            if course_id_or_name.lower() in c.get("name", "").lower():
                return c.get("id")
    except Exception:
        pass
        
    return course_id_or_name

def resolve_coursework_id(course_id: str, coursework_id_or_title: str) -> str:
    """
    Resolves a coursework title or ID to the actual coursework ID.
    If it is already numeric, returns it. Otherwise, searches coursework in the course.
    """
    coursework_id_or_title = str(coursework_id_or_title).strip()
    if coursework_id_or_title.isdigit():
        return coursework_id_or_title
        
    try:
        resolved_course_id = resolve_course_id(course_id)
        s = get_classroom_service()
        res = s.courses().courseWork().list(courseId=resolved_course_id, courseWorkStates="PUBLISHED").execute()
        coursework = res.get("courseWork", [])    
        for cw in coursework:
            if coursework_id_or_title.lower() in cw.get("title", "").lower():
                return cw.get("id")
    except Exception:
        pass
        
    return coursework_id_or_title

@tool
def list_classroom_courses(student_id: str = "me", course_states: str = "ACTIVE") -> str:
    """
    List Google Classroom courses that the user is enrolled in or teaches.
    Use this tool when the user asks to see their classes, courses, or what subjects they have in Classroom.

    Args:
        student_id: The ID of the student. Defaults to 'me'.
        course_states: The state of the courses (e.g. 'ACTIVE', 'ARCHIVED'). Defaults to 'ACTIVE'.
    """
    import json
    s = get_classroom_service()
    res = s.courses().list(studentId=student_id, courseStates=course_states).execute()
    courses = res.get("courses", [])
    out = []
    for c in courses:
        out.append({
            "id": c.get("id"),
            "name": c.get("name"),
            "section": c.get("section", ""),
            "descriptionHeading": c.get("descriptionHeading", ""),
            "room": c.get("room", ""),
            "alternateLink": c.get("alternateLink", "")
        })
    return json.dumps(out, default=str)

@tool
def list_classroom_coursework(course_id: str, coursework_states: str = "PUBLISHED") -> str:
    """
    List coursework, assignments, or questions in a specific Google Classroom course.
    Use this tool when the user wants to check assignments, homework, tasks, or coursework for a particular course.

    Args:
        course_id: The unique ID or name/title of the course.
        coursework_states: The states of coursework to list (e.g., 'PUBLISHED', 'DRAFT'). Defaults to 'PUBLISHED'.
    """
    import json
    resolved_course_id = resolve_course_id(course_id)
    s = get_classroom_service()
    res = s.courses().courseWork().list(courseId=resolved_course_id, courseWorkStates=coursework_states).execute()
    coursework = res.get("courseWork", [])
    out = []
    for cw in coursework:
        due_date = cw.get("dueDate", {})
        due_time = cw.get("dueTime", {})
        due_str = ""
        if due_date:
            due_str = f"{due_date.get('year')}-{due_date.get('month'):02d}-{due_date.get('day'):02d}"
            if due_time:
                due_str += f" {due_time.get('hours', 0):02d}:{due_time.get('minutes', 0):02d}"
        out.append({
            "id": cw.get("id"),
            "title": cw.get("title"),
            "description": cw.get("description", ""),
            "dueDate": due_str,
            "maxPoints": cw.get("maxPoints"),
            "alternateLink": cw.get("alternateLink", ""),
            "workType": cw.get("workType", "")
        })
    return json.dumps(out, default=str)

@tool
def list_classroom_announcements(course_id: str) -> str:
    """
    List announcements in a specific Google Classroom course.
    Use this tool when the user wants to check updates, announcements, or notifications in a course.

    Args:
        course_id: The unique ID or name/title of the course.
    """
    import json
    resolved_course_id = resolve_course_id(course_id)
    s = get_classroom_service()
    res = s.courses().announcements().list(courseId=resolved_course_id).execute()
    announcements = res.get("announcements", [])
    out = []
    for ann in announcements:
        out.append({
            "id": ann.get("id"),
            "text": ann.get("text", ""),
            "creationTime": ann.get("creationTime", ""),
            "updateTime": ann.get("updateTime", ""),
            "alternateLink": ann.get("alternateLink", "")
        })
    return json.dumps(out, default=str)

@tool
def list_classroom_submissions(course_id: str, coursework_id: str) -> str:
    """
    List student submissions for a specific coursework (assignment) in a Google Classroom course.
    Use this tool when the user wants to see their submission status, grades, or if homework is handed in.

    Args:
        course_id: The unique ID or name/title of the course.
        coursework_id: The unique ID or title/name of the coursework (assignment).
    """
    import json
    resolved_course_id = resolve_course_id(course_id)
    resolved_coursework_id = resolve_coursework_id(resolved_course_id, coursework_id)
    s = get_classroom_service()
    res = s.courses().courseWork().studentSubmissions().list(courseId=resolved_course_id, courseWorkId=resolved_coursework_id).execute()
    submissions = res.get("studentSubmissions", [])
    out = []
    for sub in submissions:
        out.append({
            "id": sub.get("id"),
            "state": sub.get("state"),
            "assignedGrade": sub.get("assignedGrade"),
            "draftGrade": sub.get("draftGrade"),
            "late": sub.get("late", False),
            "updateTime": sub.get("updateTime")
        })
    return json.dumps(out, default=str)

tools_list_classroom = [
    list_classroom_courses,
    list_classroom_coursework,
    list_classroom_announcements,
    list_classroom_submissions
]
