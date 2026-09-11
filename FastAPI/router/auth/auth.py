import os
import sys
import json
import logging
from typing import Optional
from urllib.parse import quote
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import APIRouter, HTTPException, Query, Depends, status, Request
from fastapi.responses import RedirectResponse
from .deps import get_current_user
from .schemas import UserResponse, OAuthUrlResponse, OAuthSignInRequest, AuthResponse
from .client import supabase

auth_router = APIRouter(prefix="/auth", tags=["Supabase Auth"])

GOOGLE_SCOPES = (
    "https://www.googleapis.com/auth/gmail.modify "
    "https://www.googleapis.com/auth/classroom.courses.readonly "
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly "
    "https://www.googleapis.com/auth/classroom.announcements.readonly "
    "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly"
)

def build_user_response(user_data) -> UserResponse:
    if not user_data:
        return UserResponse(id="", email=None, created_at=None)
    user_meta = getattr(user_data, "user_metadata", {}) or {}
    if not isinstance(user_meta, dict):
        user_meta = {}
    full_name = user_meta.get("full_name") or user_meta.get("name") or user_meta.get("given_name")
    return UserResponse(
        id=str(getattr(user_data, "id", "")),
        email=getattr(user_data, "email", None),
        created_at=str(user_data.created_at) if getattr(user_data, "created_at", None) else None,
        full_name=full_name,
        name=full_name,
    )

def save_user_to_db(user, session=None):
    if not user:
        return
    try:
        user_record = {
            "id": str(user.id),
            "email": getattr(user, "email", None),
        }
        if session:
            if getattr(session, "access_token", None):
                user_record["access_token"] = session.access_token
            if getattr(session, "refresh_token", None):
                user_record["refresh_token"] = session.refresh_token

            provider_token = getattr(session, "provider_token", None)
            provider_refresh_token = getattr(session, "provider_refresh_token", None)

            if provider_token:
                expires_in = getattr(session, "expires_in", 3600) or 3600
                expiry_dt = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                expiry_str = expiry_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

                token_payload = {
                    "token": provider_token,
                    "refresh_token": provider_refresh_token,
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "client_id": (os.getenv("GOOGLE_CLIENT_ID") or "").strip(),
                    "client_secret": (os.getenv("GOOGLE_CLIENT_SECRET") or "").strip(),
                    "expiry": expiry_str,
                    "scopes": [
                        "https://www.googleapis.com/auth/gmail.modify",
                        "https://www.googleapis.com/auth/classroom.courses.readonly",
                        "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
                        "https://www.googleapis.com/auth/classroom.announcements.readonly",
                        "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
                    ]
                }
                
                data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
                os.makedirs(data_dir, exist_ok=True)
                
                classroom_token_path = os.path.join(data_dir, "classroom_oauth_token.json")
                email_token_path = os.path.join(data_dir, "email_oauth_token.json")

                with open(classroom_token_path, "w", encoding="utf-8") as f:
                    json.dump(token_payload, f, indent=2)

                with open(email_token_path, "w", encoding="utf-8") as f:
                    json.dump(token_payload, f, indent=2)

                logger.info("Automatically generated Classroom and Gmail token JSON files from Google Sign-In!")

        supabase.table("users_info").upsert(user_record).execute()
        logger.info(f"Successfully saved user {user.id} to users_info table.")
    except Exception as e:
        logger.warning(f"Failed to upsert user info to users_info table: {e}")

def get_default_callback_url(request: Request) -> str:
    base_url = os.getenv("SERVER_URL") or os.getenv("RENDER_EXTERNAL_URL")
    if base_url:
        return f"{base_url.rstrip('/')}/auth/callback"
    return f"{str(request.base_url).rstrip('/')}/auth/callback"

def build_supabase_redirect_url(request: Request, client_redirect_to: Optional[str]) -> str:
    fastapi_callback = get_default_callback_url(request)
    if client_redirect_to:
        sep = "&" if "?" in fastapi_callback else "?"
        return f"{fastapi_callback}{sep}redirect_to={quote(client_redirect_to, safe='')}"
    return fastapi_callback

@auth_router.get("/me", response_model=UserResponse, summary="Get current user profile (Protecting Endpoints)")
def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user

@auth_router.post("/oauth/url", response_model=OAuthUrlResponse, summary="Generate OAuth authorization URL for sign-up/login")
def get_oauth_url(request: Request, body: OAuthSignInRequest):
    try:
        options = {
            "redirect_to": build_supabase_redirect_url(request, body.redirect_to),
            "scopes": GOOGLE_SCOPES,
            "query_params": {
                "access_type": "offline",
                "prompt": "consent"
            }
        }

        res = supabase.auth.sign_in_with_oauth({
            "provider": body.provider,
            "options": options,
        })
        return OAuthUrlResponse(url=res.url, provider=res.provider)
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))


@auth_router.get("/oauth/authorize", summary="Browser redirect to OAuth Provider authorization URL")
def authorize_oauth(
    request: Request,
    provider: str = Query(..., description="OAuth provider, e.g. 'google', 'github', 'discord'"),
    redirect_to: Optional[str] = Query(None, description="Optional custom redirect URL after OAuth authentication")
):
    try:
        options = {
            "redirect_to": build_supabase_redirect_url(request, redirect_to),
            "scopes": GOOGLE_SCOPES,
            "query_params": {
                "access_type": "offline",
                "prompt": "consent"
            }
        }

        res = supabase.auth.sign_in_with_oauth({
            "provider": provider,
            "options": options,
        })
        return RedirectResponse(url=res.url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))


@auth_router.get("/callback", summary="Handle OAuth authorization code callback from Supabase")
def oauth_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    redirect_to: Optional[str] = Query(None)
):
    if error or error_description:
        raise HTTPException(status_code=400, detail=error_description or error)

    if not code:
        raise HTTPException(status_code=400, detail="Missing required 'code' parameter")

    try:
        exchange_params = {"auth_code": code}
        if redirect_to:
            exchange_params["redirect_to"] = redirect_to

        res = supabase.auth.exchange_code_for_session(exchange_params)

        if getattr(res, "user", None):
            save_user_to_db(res.user, getattr(res, "session", None))

        # If custom redirect_to URL is specified (e.g. mobile app scheme)
        if redirect_to:
            sep = "&" if "?" in redirect_to else "?"
            redirect_url = (
                f"{redirect_to}{sep}"
                f"access_token={res.session.access_token}"
                f"&refresh_token={res.session.refresh_token}"
            )
            return RedirectResponse(url=redirect_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

        # Default for web fetch calls (returns JSON AuthResponse)
        return AuthResponse(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            token_type=res.session.token_type or "bearer",
            user=build_user_response(res.user),
        )
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))
