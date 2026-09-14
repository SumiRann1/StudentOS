import os
import sys

# Ensure backend and root project directories are in sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
backend_dir = os.path.join(root_dir, "backend")
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
from FastAPI.router.chats.chat import chat_router
from FastAPI.router.setup.setup import setup_router
from FastAPI.router.auth.auth import auth_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Student OS Agent API",
    description="An LLM-powered agent system for managing student tasks.",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(setup_router)
app.include_router(auth_router)

from db.database import init_db

@app.on_event("startup")
async def startup_event():
    await init_db()
    logger.info("SQLite database initialized successfully!")

@app.get("/")
async def root():
    return {"message": "Student OS Agent API is running."}


