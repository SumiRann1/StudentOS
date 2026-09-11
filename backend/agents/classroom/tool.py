import os
import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

def fmt_due(due_date, due_time=None):
    """Simple helper to format Classroom due dates to IST."""
    if not due_date:
        return ""
    y = due_date.get("year")
    m = due_date.get("month", 1)
    d = due_date.get("day", 1)
    hh = due_time.get("hours", 0) if due_time else 0
    mm = due_time.get("minutes", 0) if due_time else 0
    try:
        dt = datetime(y, m, d, hh, mm, tzinfo=timezone.utc).astimezone(IST)
        return dt.strftime("%Y-%m-%d %I:%M %p")
    except Exception:
        return f"{y}-{m:02d}-{d:02d}"

os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from langchain_core.tools import tool

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

import json

SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/classroom.announcements.readonly",
    "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
]

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../.."))

TOKEN_PATH = os.path.join(BASE_DIR, "data", "classroom_oauth_token.json")
CREDENTIALS_PATH = os.path.join(BASE_DIR, "data", "classroom_oauth_credentials.json")


def get_classroom_service():
    """
    Authenticates and builds the Google Classroom API service object.
    Uses token.json if available, CLASSROOM_OAUTH_TOKEN_JSON env var, or safe error handling on headless servers.
    """
    creds = None
    env_token = os.getenv("CLASSROOM_OAUTH_TOKEN_JSON")
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
                    "Google Classroom OAuth token is missing or invalid on the server. "
                    "Please upload your classroom_oauth_token.json via the app Setup menu or set CLASSROOM_OAUTH_TOKEN_JSON on Render."
                )

            if not os.path.exists(CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"Google Classroom OAuth credentials file not found at '{CREDENTIALS_PATH}'. "
                    "Please upload classroom_oauth_token.json via the app Setup menu."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")

            os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)
            with open(TOKEN_PATH, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())

    return build("classroom", "v1", credentials=creds)


def _resolve_course_ids(service, course_id_or_name: str = "", course_state: str = "ACTIVE") -> List[Dict[str, Any]]:
    """
    Helper function to resolve course_id_or_name to a list of matching course dictionaries.
    If empty or 'ALL'/'ME', returns all active courses.
    Supports matching by exact ID or case-insensitive substring of name, section, or descriptionHeading.
    """
    identifier = (course_id_or_name or "").strip()
    kwargs = {"studentId": "me"}
    if course_state.upper() != "ALL":
        kwargs["courseStates"] = [course_state.upper()]

    try:
        response = service.courses().list(**kwargs).execute()
        courses = response.get("courses", [])
    except Exception:
        courses = []

    if not identifier or identifier.upper() in ["ALL", "ME"]:
        return courses

    # 1. Exact ID match
    exact_matches = [c for c in courses if c.get("id") == identifier]
    if exact_matches:
        return exact_matches

    # 2. Case-insensitive substring match on name, section, descriptionHeading
    query_lower = identifier.lower()
    matches = []
    for c in courses:
        name = c.get("name", "").lower()
        section = c.get("section", "").lower()
        heading = c.get("descriptionHeading", "").lower()
        if query_lower in name or query_lower in section or query_lower in heading:
            matches.append(c)

    if matches:
        return matches

    # 3. Fallback: return dummy dict with the identifier as ID so direct API calls can attempt it
    return [{"id": identifier, "name": identifier}]


@tool
def list_courses(course_state: str = "ACTIVE", query: str = "") -> dict:
    """
    List enrolled Google Classroom courses for the current user, with optional keyword filtering.

    Args:
        course_state: Filter state of courses ('ACTIVE', 'ARCHIVED', 'PROVISIONED', or 'ALL'). Default 'ACTIVE'.
        query: Optional keyword or course name to filter results (e.g., 'Math', 'CS101', 'Physics').

    Returns:
        Dict with 'success', 'count', and list of course summaries (id, name, section, descriptionHeading, room, alternateLink).
    """
    try:
        service = get_classroom_service()
        courses = _resolve_course_ids(service, course_id_or_name=query, course_state=course_state)

        course_list = []
        for c in courses:
            course_list.append({
                "id": c.get("id"),
                "name": c.get("name"),
                "section": c.get("section", ""),
                "descriptionHeading": c.get("descriptionHeading", ""),
                "room": c.get("room", ""),
                "alternateLink": c.get("alternateLink", ""),
                "courseState": c.get("courseState", "")
            })

        return {"success": True, "count": len(course_list), "courses": course_list}
    except Exception as e:
        return {"success": False, "message": f"Failed to list courses: {str(e)}", "courses": []}


@tool
def list_coursework(course_id_or_name: str = "", query: str = "", max_results: int = 10) -> dict:
    """
    List assignments and coursework for a specific course (by ID, name, or keyword) or across all active courses.

    Args:
        course_id_or_name: Google Classroom course ID or course name/keyword (e.g., '12345', 'Physics', 'CS101'). If empty, searches across all active courses.
        query: Optional keyword to filter assignment titles or descriptions (e.g., 'quiz', 'lab', 'homework').
        max_results: Maximum number of coursework items to return (default 10).

    Returns:
        Dict with 'success', 'count', and list of coursework items (id, courseId, title, description, dueDate, dueTime, maxPoints, state, alternateLink).
    """
    try:
        service = get_classroom_service()
        resolved_courses = _resolve_course_ids(service, course_id_or_name)
        course_ids = [c["id"] for c in resolved_courses]

        all_coursework = []
        query_lower = query.strip().lower()

        for cid in course_ids:
            try:
                cw_res = service.courses().courseWork().list(courseId=cid, pageSize=max_results).execute()
                items = cw_res.get("courseWork", [])
                for item in items:
                    title = item.get("title", "")
                    desc = item.get("description", "") or ""

                    if query_lower and (query_lower not in title.lower() and query_lower not in desc.lower()):
                        continue

                    due_date = item.get("dueDate", {})
                    due_time = item.get("dueTime", {})

                    all_coursework.append({
                        "id": item.get("id"),
                        "courseId": cid,
                        "title": title,
                        "description": desc[:300],
                        "due": fmt_due(due_date, due_time),
                        "maxPoints": item.get("maxPoints"),
                        "state": item.get("state"),
                        "workType": item.get("workType"),
                        "alternateLink": item.get("alternateLink", "")
                    })
            except Exception:
                continue

        all_coursework = all_coursework[:max_results]
        return {"success": True, "count": len(all_coursework), "coursework": all_coursework}
    except Exception as e:
        return {"success": False, "message": f"Failed to list coursework: {str(e)}", "coursework": []}


@tool
def get_upcoming_assignments(course_id_or_name: str = "", max_results: int = 10) -> dict:
    """
    Get upcoming pending assignments across enrolled active courses (optionally filtered by course ID/name), ordered by due date.

    Args:
        course_id_or_name: Optional course ID or course name/keyword to filter by (e.g., 'Math', 'Physics'). If empty, fetches for all active courses.
        max_results: Maximum number of upcoming assignments to return (default 10).

    Returns:
        Dict with 'success', 'count', and list of pending assignments with due dates and submission status.
    """
    try:
        service = get_classroom_service()
        courses = _resolve_course_ids(service, course_id_or_name)

        now = datetime.now(ZoneInfo("Asia/Kolkata"))
        today_date_int = int(now.strftime("%Y%m%d"))

        upcoming = []
        for course in courses:
            cid = course["id"]
            cname = course.get("name", "")
            try:
                cw_res = service.courses().courseWork().list(courseId=cid).execute()
                for cw in cw_res.get("courseWork", []):
                    due = cw.get("dueDate")
                    if not due:
                        continue

                    due_int = due.get("year", 0) * 10000 + due.get("month", 0) * 100 + due.get("day", 0)
                    if due_int >= today_date_int:
                        # Check student submission status
                        subs_res = service.courses().courseWork().studentSubmissions().list(
                            courseId=cid, courseWorkId=cw["id"], userId="me"
                        ).execute()
                        subs = subs_res.get("studentSubmissions", [])
                        sub_state = subs[0].get("state") if subs else "NEW"

                        upcoming.append({
                            "id": cw["id"],
                            "courseId": cid,
                            "courseName": cname,
                            "title": cw.get("title", ""),
                            "due": fmt_due(due, cw.get("dueTime", {})),
                            "dueInt": due_int,
                            "submissionState": sub_state,
                            "alternateLink": cw.get("alternateLink", "")
                        })
            except Exception:
                continue

        upcoming.sort(key=lambda x: x["dueInt"])
        upcoming = upcoming[:max_results]
        return {"success": True, "count": len(upcoming), "assignments": upcoming}
    except Exception as e:
        return {"success": False, "message": f"Failed to fetch upcoming assignments: {str(e)}", "assignments": []}


@tool
def list_announcements(course_id_or_name: str = "", query: str = "", max_results: int = 10) -> dict:
    """
    List announcements for a specific course (by ID, name, or keyword) or across all active courses.

    Args:
        course_id_or_name: Google Classroom course ID or course name/keyword (e.g., '12345', 'Physics'). If empty, searches across all active courses.
        query: Optional keyword to filter announcement text (e.g., 'exam', 'quiz', 'cancellation').
        max_results: Maximum number of announcements to return (default 10).

    Returns:
        Dict with 'success', 'count', and list of announcements (id, courseId, text, creationTime, updateTime, alternateLink).
    """
    try:
        service = get_classroom_service()
        resolved_courses = _resolve_course_ids(service, course_id_or_name)
        course_ids = [c["id"] for c in resolved_courses]

        all_announcements = []
        query_lower = query.strip().lower()

        for cid in course_ids:
            try:
                ann_res = service.courses().announcements().list(courseId=cid, pageSize=max_results).execute()
                for ann in ann_res.get("announcements", []):
                    text = ann.get("text", "") or ""
                    if query_lower and query_lower not in text.lower():
                        continue

                    all_announcements.append({
                        "id": ann.get("id"),
                        "courseId": cid,
                        "text": text[:500],
                        "creationTime": ann.get("creationTime", ""),
                        "updateTime": ann.get("updateTime", ""),
                        "alternateLink": ann.get("alternateLink", "")
                    })
            except Exception:
                continue

        all_announcements = all_announcements[:max_results]
        return {"success": True, "count": len(all_announcements), "announcements": all_announcements}
    except Exception as e:
        return {"success": False, "message": f"Failed to list announcements: {str(e)}", "announcements": []}


@tool
def get_assignment_details(course_id_or_name: str, coursework_id_or_title: str) -> dict:
    """
    Fetch full details, description, materials, and student submission status for a specific assignment by course name/ID and coursework title/ID.

    Args:
        course_id_or_name: Google Classroom course ID or course name/keyword (e.g., 'Physics', '12345').
        coursework_id_or_title: Assignment (courseWork) ID or assignment title/keyword (e.g., 'Assignment 1', 'Lab 3', '67890').

    Returns:
        Dict with assignment details, description, due date/time, points, and student submission status.
    """
    try:
        service = get_classroom_service()
        courses = _resolve_course_ids(service, course_id_or_name)
        if not courses:
            return {"success": False, "message": f"No course found matching '{course_id_or_name}'."}

        cw_target = coursework_id_or_title.strip()
        matched_cw = None
        target_cid = None

        for course in courses:
            cid = course["id"]
            # 1. Try direct GET if exact coursework_id passed
            try:
                cw = service.courses().courseWork().get(courseId=cid, id=cw_target).execute()
                if cw and "id" in cw:
                    matched_cw = cw
                    target_cid = cid
                    break
            except Exception:
                pass

            # 2. If direct GET fails, search coursework by title/keyword
            try:
                cw_list_res = service.courses().courseWork().list(courseId=cid).execute()
                items = cw_list_res.get("courseWork", [])
                cw_target_lower = cw_target.lower()
                for item in items:
                    title = item.get("title", "").lower()
                    if cw_target_lower in title:
                        matched_cw = item
                        target_cid = cid
                        break
                if matched_cw:
                    break
            except Exception:
                continue

        if not matched_cw:
            return {"success": False, "message": f"Assignment matching '{coursework_id_or_title}' not found."}

        # Fetch student submission for matched coursework
        submission_info = None
        try:
            subs_res = service.courses().courseWork().studentSubmissions().list(
                courseId=target_cid, courseWorkId=matched_cw["id"], userId="me"
            ).execute()
            subs = subs_res.get("studentSubmissions", [])
            if subs:
                s = subs[0]
                submission_info = {
                    "id": s.get("id"),
                    "state": s.get("state"),
                    "assignedGrade": s.get("assignedGrade"),
                    "draftGrade": s.get("draftGrade"),
                    "late": s.get("late", False)
                }
        except Exception:
            pass

        return {
            "success": True,
            "id": matched_cw.get("id"),
            "courseId": target_cid,
            "title": matched_cw.get("title", ""),
            "description": matched_cw.get("description", ""),
            "due": fmt_due(matched_cw.get("dueDate", {}), matched_cw.get("dueTime", {})),
            "maxPoints": matched_cw.get("maxPoints"),
            "alternateLink": matched_cw.get("alternateLink", ""),
            "submission": submission_info
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to fetch assignment details: {str(e)}"}


@tool
def list_student_submissions(course_id_or_name: str = "", coursework_id_or_title: str = "") -> dict:
    """
    Get student submission status, turn-in state, assigned grades, and draft grades for assignments by course name/ID and coursework title/ID.

    Args:
        course_id_or_name: Google Classroom course ID or course name/keyword (e.g., '12345', 'Physics'). If empty, retrieves across all active courses.
        coursework_id_or_title: Optional assignment (courseWork) ID or title/keyword. If empty, retrieves all submissions for the course(s).

    Returns:
        Dict with list of submission statuses, assignment titles, assigned grades, and submission states.
    """
    try:
        service = get_classroom_service()
        courses = _resolve_course_ids(service, course_id_or_name)
        course_ids = [c["id"] for c in courses]

        target_cw_search = coursework_id_or_title.strip()

        all_submissions = []
        for cid in course_ids:
            try:
                cw_map = {}
                resolved_cw_ids = []

                if target_cw_search:
                    try:
                        cw_res = service.courses().courseWork().list(courseId=cid).execute()
                        items = cw_res.get("courseWork", [])
                        for item in items:
                            title = item.get("title", "")
                            cw_map[item["id"]] = title
                            if item["id"] == target_cw_search or target_cw_search.lower() in title.lower():
                                resolved_cw_ids.append(item["id"])
                    except Exception:
                        pass
                    if not resolved_cw_ids:
                        resolved_cw_ids = [target_cw_search]
                else:
                    resolved_cw_ids = ["-"]
                    try:
                        cw_res = service.courses().courseWork().list(courseId=cid).execute()
                        for item in cw_res.get("courseWork", []):
                            cw_map[item["id"]] = item.get("title", "")
                    except Exception:
                        pass

                for cw_id in resolved_cw_ids:
                    try:
                        subs_res = service.courses().courseWork().studentSubmissions().list(
                            courseId=cid, courseWorkId=cw_id, userId="me"
                        ).execute()
                        subs = subs_res.get("studentSubmissions", [])

                        for s in subs:
                            c_work_id = s.get("courseWorkId", cw_id)
                            all_submissions.append({
                                "id": s.get("id"),
                                "courseId": cid,
                                "courseWorkId": c_work_id,
                                "assignmentTitle": cw_map.get(c_work_id, ""),
                                "state": s.get("state"),
                                "assignedGrade": s.get("assignedGrade"),
                                "draftGrade": s.get("draftGrade"),
                                "late": s.get("late", False),
                                "updateTime": s.get("updateTime", "")
                            })
                    except Exception:
                        continue
            except Exception:
                continue

        return {"success": True, "count": len(all_submissions), "submissions": all_submissions}
    except Exception as e:
        return {"success": False, "message": f"Failed to list submissions: {str(e)}", "submissions": []}


classroom_tools = [
    list_courses,
    list_coursework,
    get_upcoming_assignments,
    list_announcements,
    get_assignment_details,
    list_student_submissions,
]

