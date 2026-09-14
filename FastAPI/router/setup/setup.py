import os
import sys
import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from fastapi.responses import HTMLResponse, FileResponse

from .schema import SetupStatusResponse, ServiceStatus, SetupSaveRequest, SetupSaveResponse, AuthTriggerResponse

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(BASE_DIR, "data")

SERVICE_FILE_MAP = {
    "classroom": {
        "credentials": os.path.join(DATA_DIR, "classroom_oauth_credentials.json"),
        "token": os.path.join(DATA_DIR, "classroom_oauth_token.json"),
    },
    "email": {
        "credentials": os.path.join(DATA_DIR, "email_oauth_credentials.json"),
        "token": os.path.join(DATA_DIR, "email_oauth_token.json"),
    }
}

def save_json_file(file_path: str, data: Dict[str, Any]):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

setup_router = APIRouter(prefix="/setup", tags=["Setup"])

@setup_router.get("/status", response_model=SetupStatusResponse)
async def get_setup_status():
    """ Check status of credentials and token files for Classroom and Email services. """
    classroom_token = os.path.exists(SERVICE_FILE_MAP["classroom"]["token"])
    classroom_creds = os.path.exists(SERVICE_FILE_MAP["classroom"]["credentials"]) or classroom_token

    email_token = os.path.exists(SERVICE_FILE_MAP["email"]["token"])
    email_creds = os.path.exists(SERVICE_FILE_MAP["email"]["credentials"]) or email_token

    return SetupStatusResponse(
        classroom=ServiceStatus(
            credentials_exists=classroom_creds,
            token_exists=classroom_token
        ),
        email=ServiceStatus(
            credentials_exists=email_creds,
            token_exists=email_token
        )
    )

@setup_router.post("/auth/{service}", response_model=AuthTriggerResponse)
async def trigger_auth(service: str):
    """ Trigger or verify OAuth authentication for Classroom or Email service. """
    if service not in SERVICE_FILE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid service '{service}'. Must be 'classroom' or 'email'.")
    
    creds_path = SERVICE_FILE_MAP[service]["credentials"]
    token_path = SERVICE_FILE_MAP[service]["token"]
    
    if not os.path.exists(creds_path):
        raise HTTPException(
            status_code=400,
            detail=f"Credentials file missing for '{service}'. Please upload or save {os.path.basename(creds_path)} first."
        )
        
    try:
        if service == "classroom":
            from backend.agents.classroom.tool import get_classroom_service
            get_classroom_service()
        else:
            from backend.agents.email.tool import get_gmail_service
            get_gmail_service()
            
        token_exists = os.path.exists(token_path)
        return AuthTriggerResponse(
            success=True,
            message=f"Successfully authenticated '{service}' service! Token is active.",
            token_exists=token_exists
        )
    except Exception as e:
        token_exists = os.path.exists(token_path)
        return AuthTriggerResponse(
            success=False,
            message=f"Authentication required for '{service}': {str(e)}. You can also run 'python scripts/authenticate_oauth.py --service {service}' in terminal.",
            token_exists=token_exists
        )

@setup_router.post("/save", response_model=SetupSaveResponse)
async def save_setup_data(req: SetupSaveRequest):
    """ Save JSON object credentials and/or tokens for Classroom or Email service. """
    if req.service not in SERVICE_FILE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid service '{req.service}'. Must be 'classroom' or 'email'.")
    
    if not req.credentials and not req.token:
        raise HTTPException(status_code=400, detail="Must provide at least 'credentials' or 'token' JSON object.")
    
    saved = []
    if req.credentials:
        file_path = SERVICE_FILE_MAP[req.service]["credentials"]
        save_json_file(file_path, req.credentials)
        saved.append(os.path.basename(file_path))
        
    if req.token:
        file_path = SERVICE_FILE_MAP[req.service]["token"]
        save_json_file(file_path, req.token)
        saved.append(os.path.basename(file_path))
        
    return SetupSaveResponse(
        success=True,
        message=f"Successfully saved setup files for {req.service}: {', '.join(saved)}",
        saved_files=saved
    )

@setup_router.post("/upload/{service}", response_model=SetupSaveResponse)
async def upload_setup_file(service: str, file_type: str = Form(...), file: UploadFile = File(...)):
    """ Upload credentials.json or token.json file directly for a service. """
    if service not in SERVICE_FILE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid service '{service}'. Must be 'classroom' or 'email'.")
    
    if file_type not in ["credentials", "token"]:
        raise HTTPException(status_code=400, detail="file_type must be either 'credentials' or 'token'.")
    
    try:
        content = await file.read()
        json_data = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file uploaded: {str(e)}")
    
    target_path = SERVICE_FILE_MAP[service][file_type]
    save_json_file(target_path, json_data)
    filename = os.path.basename(target_path)
    
    return SetupSaveResponse(
        success=True,
        message=f"Successfully uploaded and saved {file_type} file '{filename}' for service '{service}'.",
        saved_files=[filename]
    )





