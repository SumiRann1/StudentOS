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
from FastAPI.router.chats.chat import chat_router
from FastAPI.router.chats.grader_api import grader_router
from FastAPI.router.setup.setup import setup_router
from FastAPI.router.auth.auth import auth_router
from backend.automation.classroom import create_classroom_jobs
from backend.automation.timetable import create_timetable_jobs
from backend.automation.email import create_email_jobs
from db.automation_db import jobstores
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from db.database import init_db
import logging
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Single shared scheduler for all automation jobs
scheduler = AsyncIOScheduler(jobstores=jobstores, timezone="Asia/Kolkata")

def event_handler(event):
    if event.exception:
        logger.error(f"❌ Job '{event.job_id}' failed: {event.exception}")
    else:
        logger.info(f"✅ Job '{event.job_id}' executed successfully")

scheduler.add_listener(event_handler, EVENT_JOB_ERROR | EVENT_JOB_EXECUTED)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("SQLite database initialized successfully!")

    scheduler.add_job(create_email_jobs, 'cron', hour=1, id="email_daily",
                      misfire_grace_time=60, coalesce=True, replace_existing=True)
    scheduler.add_job(create_classroom_jobs, 'cron', hour=2, id="classroom_daily",
                      misfire_grace_time=60, coalesce=True, replace_existing=True)
    scheduler.add_job(create_timetable_jobs, 'cron', hour=3, id="timetable_daily",
                      misfire_grace_time=60, coalesce=True, replace_existing=True)

    scheduler.start()
    logger.info("APScheduler started with 3 daily automation jobs")
    try:
        yield
    finally:
        scheduler.shutdown()
        logger.info("APScheduler shut down")

app = FastAPI(
    title="Student OS Agent API",
    description="An LLM-powered agent system for managing student tasks.",
    version="5.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(grader_router)
app.include_router(setup_router)
app.include_router(auth_router)

@app.get("/")
async def root():
    return {"message": "Student OS Agent API is running."}

@app.get("/scheduler")
async def show_all_jobs():
    jobs = scheduler.get_jobs()
    return {
        "job_count": len(jobs),
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run": str(job.next_run_time),
                "trigger": str(job.trigger),
            }
            for job in jobs
        ]
    }

@app.get("/scheduler/test/{job_name}")
async def test_job(job_name: str):
    jobs_map = {
        "email": create_email_jobs,
        "classroom": create_classroom_jobs,
        "timetable": create_timetable_jobs,
    }
    if job_name not in jobs_map:
        return {"error": f"Unknown job: {job_name}. Use: email, classroom, timetable"}
    
    result = await jobs_map[job_name]()

    response_text = ""
    for msg in reversed(result.get("messages", [])):
        if hasattr(msg, "content") and msg.content and not getattr(msg, "tool_calls", None):
            response_text = msg.content
            break

    return {"status": "done", "job": job_name, "response": response_text}
