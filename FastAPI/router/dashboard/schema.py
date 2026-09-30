from pydantic import BaseModel
from typing import Literal, Optional, Dict


class BreifingClass(BaseModel):
    id: Literal["classroom", "email", "timetable"]
    icon: Literal["📚", "✉️", "📅"]
    title: Literal["Classroom Pending", "Email Digest", "Todays Schedule"]
    badge: str
    badgeColor: Literal["#8B5CF6", "#10A37F", "#38BDF8"]
    schedule: Literal["Daily 2:00 AM", "Daily 1:00 AM", "Daily 3:00 AM"]
    rawMarkdown: str
    lastSynced: str

class DashBoardResponse(BaseModel):
    greeting: Literal["Good morning", "Good afternoon", "Good evening", "Good night"]
    next_class: Optional[Dict] = None
    briefings: Dict[str, BreifingClass]
    