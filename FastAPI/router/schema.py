from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Literal

class QueryRequest(BaseModel):
    query: str
    thread_id: str = "default_thread"

class ServiceStatus(BaseModel):
    credentials_exists: bool
    token_exists: bool

class SetupStatusResponse(BaseModel):
    classroom: ServiceStatus
    email: ServiceStatus

class ServiceCredentialsTokenPayload(BaseModel):
    credentials: Optional[Dict[str, Any]] = None
    token: Optional[Dict[str, Any]] = None

class SetupSaveRequest(BaseModel):
    service: Literal["classroom", "email"]
    credentials: Optional[Dict[str, Any]] = None
    token: Optional[Dict[str, Any]] = None

class SetupSaveResponse(BaseModel):
    success: bool
    message: str
    saved_files: List[str]

class AuthTriggerResponse(BaseModel):
    success: bool
    message: str
    token_exists: bool

    

