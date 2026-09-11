import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
from FastAPI.router.chat import chat_router
from FastAPI.router.setup import setup_route
from FastAPI.router.auth.auth import auth_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Student OS Agent API",
    description="An LLM-powered agent system for managing student tasks.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(setup_route)
app.include_router(auth_router)

@app.get("/")
async def root():
    return {"message": "Student OS Agent API is running."}


