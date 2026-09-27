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

class PinRequest(BaseModel):
    thread_id: str

class DeleteRequest(BaseModel):
    thread_id: str

class GraderOutput(BaseModel):
    filename: str
    content_type: str
    answered_text: str

class Base64OCRRequest(BaseModel):
    image_base64: str
    user_name: Optional[str] = "Student"
    content_type: Optional[str] = "image/jpeg"
    filename: Optional[str] = "uploaded_image.jpg"