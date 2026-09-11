from pydantic import BaseModel, Field
from typing import Optional, Union, Any
from datetime import datetime

class OAuthSignInRequest(BaseModel):
    provider: str = Field(..., description="OAuth provider, here Google")
    redirect_to: Optional[str] = Field(None, description="Optional redirect URL after authenticating with provider")

class OAuthUrlResponse(BaseModel):
    url: str = Field(..., description="Authorization URL to redirect user's browser to")
    provider: str = Field(..., description="OAuth provider name")

class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    created_at: Optional[Union[str, datetime, Any]] = None
    name: Optional[str] = None
    fullname: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse