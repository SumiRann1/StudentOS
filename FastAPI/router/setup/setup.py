import os
from fastapi import APIRouter
from .schema import SetupStatusResponse, ServiceStatus

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(BASE_DIR, "data")

SERVICE_FILE_MAP = {
    "classroom": {
        "token": os.path.join(DATA_DIR, "classroom_oauth_token.json"),
    },
    "email": {
        "token": os.path.join(DATA_DIR, "email_oauth_token.json"),
    }
}

setup_router = APIRouter(prefix="/setup", tags=["Setup"])

@setup_router.get("/status", response_model=SetupStatusResponse)
async def get_setup_status():
    """ Classroom aur Email services ke active OAuth tokens ka status check karne ke liye. """
    classroom_token = os.path.exists(SERVICE_FILE_MAP["classroom"]["token"])
    email_token = os.path.exists(SERVICE_FILE_MAP["email"]["token"])

    return SetupStatusResponse(
        classroom=ServiceStatus(
            credentials_exists=classroom_token,
            token_exists=classroom_token
        ),
        email=ServiceStatus(
            credentials_exists=email_token,
            token_exists=email_token
        )
    )
