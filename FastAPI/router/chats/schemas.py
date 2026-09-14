from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class QueryRequest(BaseModel):
    query: Optional[str] = None 
    user_name: Optional[str] = "Student"
    thread_id: Optional[str] = None

class TitleResponse(BaseModel):
    thread_id: str
    title: str

class ThreadsDBResponse(BaseModel):
    user_name: str
    response: List[Dict[str, Any]]