from dotenv import load_dotenv 
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

load_dotenv()

os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")

from pydantic import BaseModel, Field
from typing import List, Literal
from agents.timetable.tool import tools_list_time
from agents.classroom.tool import classroom_tools
from agents.email.tool import email_tools
from langchain_groq import ChatGroq

class RouterOutput(BaseModel):
    type : List[Literal["email", "timetable", "classroom", "general", "end"]] = Field(description="List of target sub-agent types required to handle the query, or ['end'] when the query is already answered.")

llm = ChatGroq(model="openai/gpt-oss-120b")

router_llm = llm.with_structured_output(RouterOutput)
timetable_llm = llm.bind_tools(tools_list_time)

email_llm = ChatGroq(model="openai/gpt-oss-120b")
email_llm_with_tools = email_llm.bind_tools(email_tools)

classroom_llm = ChatGroq(model="openai/gpt-oss-120b")
classroom_llm_with_tools = classroom_llm.bind_tools(classroom_tools)


from datetime import datetime
from zoneinfo import ZoneInfo

def get_current_day():
    return datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%A")

def get_current_date():
    return datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%d-%m-%Y")

def get_current_time():
    return datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%H:%M")

ROUTER_PROMPT = """You are the Router/Orchestrator for Student OS. Currently assisting student {user_name}. Today is {current_day}, {current_date}. The current time is {current_time} IST.
Analyze the user query and any existing responses in the conversation history to determine the required action:
- 'email': Searching, reading, drafting, sending, or filtering emails (Gmail).
- 'timetable': Class schedules, lectures, labs, course details, syllabus, faculty info, classroom venues, institute holidays, day overrides, mid-sem/end-sem exam schedules, academic calendar events, registration, and vacations.
- 'classroom': Google Classroom assignments, announcements, grades, and course materials.
- 'general': Greetings, chit-chat, general queries, or topics not requiring specific sub-agent tools.
- 'end': Select ONLY 'end' if the user's query has already been fully answered or fulfilled in the conversation history and no further sub-agent actions are needed.

Select all relevant sub-agent types, or select ['end'] if the response is sufficient."""


def get_router_prompt(current_day: str, current_date: str, current_time: str, user_name: str = "Student") -> str:
    return ROUTER_PROMPT.format(current_day=current_day, current_date=current_date, current_time=current_time, user_name=user_name or "Student")

