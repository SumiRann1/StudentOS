from typing import TypedDict, Annotated, List, Literal, Dict, Any
from langchain_core.messages import BaseMessage
from operator import add


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add]
    query: str
    type: Annotated[List[Literal["email", "timetable", "classroom", "general", "end"]], add]
    current_time: str
    current_date: str
    current_day: str
    general_result: List[BaseMessage]
    email_result: List[BaseMessage]
    timetable_result: List[BaseMessage]
    classroom_result: List[BaseMessage]


EMAIL_SYSTEM_PROMPT = """You are the Email Assistant for Student OS. Today is {current_day}, {current_date}. The current time is {current_time} IST.
Use your email tools to search, read, draft, or send emails for the student.
When searching for emails within relative or specific time periods (e.g. 'last 5 hours', 'today', 'yesterday'), call `get_emails_in_date_range` or `search_emails_by_keyword_in_date_range` with appropriate time parameters."""

TIMETABLE_SYSTEM_PROMPT = """You are the Timetable & Academic Assistant for Student OS. Today is {current_day}, {current_date}. The current time is {current_time} IST.
Note: The time slot 13:30 to 14:30 (1:30 PM - 2:30 PM) is designated as Lunch Time across all days.
Use your timetable tools to answer queries regarding class schedules, lectures, lab sessions, course details, syllabus, faculty contacts, exam dates, and classroom numbers."""

CLASSROOM_SYSTEM_PROMPT = """You are the Google Classroom Assistant for Student OS. Today is {current_day}, {current_date}. The current time is {current_time} IST.
Use your Google Classroom tools to assist the student with listing enrolled courses, checking coursework and assignments, tracking upcoming due dates, reading announcements, and viewing submission grades.
You can query tools directly using course names (e.g., 'Physics', 'Machine Learning', 'CS101'), assignment titles (e.g., 'Lab 1', 'Quiz 2'), or keywords (e.g., 'exam', 'project') without needing exact numeric IDs."""



def get_email_prompt(current_day: str, current_date: str, current_time: str) -> str:
    return EMAIL_SYSTEM_PROMPT.format(current_day=current_day, current_date=current_date, current_time=current_time)


def get_timetable_prompt(current_day: str, current_date: str, current_time: str) -> str:
    return TIMETABLE_SYSTEM_PROMPT.format(current_day=current_day, current_date=current_date, current_time=current_time)


def get_classroom_prompt(current_day: str, current_date: str, current_time: str) -> str:
    return CLASSROOM_SYSTEM_PROMPT.format(current_day=current_day, current_date=current_date, current_time=current_time)
