from pydantic import BaseModel

class ServiceStatus(BaseModel):
    credentials_exists: bool = True
    token_exists: bool

class SetupStatusResponse(BaseModel):
    classroom: ServiceStatus
    email: ServiceStatus
