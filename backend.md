# ⚙️ StudentOS Backend Engineering Architecture

Here is a comprehensive breakdown of all **technologies, multi-agent frameworks, background job schedulers, and API endpoints** used in the **StudentOS Backend**:

---

## 1. Core Framework & SSE Streaming API
- **FastAPI**: Modern, high-performance web framework for Python.
- **Server-Sent Events (SSE) / Real-time Streaming (`FastAPI/router/chats/chat.py`)**:
  - `StreamingResponse` wrapping LangGraph `astream_events(version="v2")`.
  - Delivers **token-by-token text streaming** and real-time **tool execution status pills** (`⚡ search_emails`, `⚡ get_upcoming_assignments`).
- **CORS Middleware (`CORSMiddleware`)**: Enables cross-origin requests for Expo mobile apps (Android/iOS) and Web.
- **Pydantic Validation (`FastAPI/router/chats/schemas.py`)**: Strict request/response payload typing.

---

## 2. Multi-Agent LangGraph Architecture & Sub-Agents

```text
                       ┌────────────────────────────┐
                       │   Router / Orchestrator    │
                       └─────────────┬──────────────┘
                                     │
         ┌───────────────────┬───────┴───────────┬──────────────────┐
         ▼                   ▼                   ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Classroom Agent │ │   Email Agent   │ │ Timetable Agent │ │  Grader Agent   │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

- **LangGraph Orchestrator (`backend/state.py` & `backend/agents/orchastetor/`)**:
  - Central **Router Agent** analyzes intent, system prompt, and context to dynamically route to specialized agents:
    1. **Classroom Agent**: Google Classroom courses, coursework, submission grades, announcements.
    2. **Email Agent**: Gmail unread messages, thread search, relative time queries, sending drafts.
    3. **Timetable Agent**: Academic schedule lookup, room locations, day-of-week overrides, institute holidays.
    4. **Grader Agent** (`backend/agents/grader/tool.py`): Pre-submission essay and code rubric evaluation.
    5. **General Agent**: General assistance fallback.
- **Persistent State Checkpointing**: `MemorySaver` preserves multi-turn conversation memory per thread (`thread_id`).

---

## 3. Zero-LLM Asynchronous Background Scheduler Engine (`automation.md`)

- **APScheduler (`AsyncIOScheduler`) & `SQLAlchemyJobStore`**:
  - Lifespan context manager in `FastAPI/main.py` starts the background job scheduler.
  - Job definitions persisted in `db/automation.db` (`db/automation_db.py`).
- **Zero-LLM Direct Connectors (`backend/automation/`)**:
  - **`classroom.py`**: Queries upcoming assignments directly from Google APIs every 15-30 minutes.
  - **`email.py`**: Fetches priority unread email digests directly from Gmail APIs.
  - **`timetable.py`**: Resolves daily schedule, overrides, and holidays.
- **SQLite Storage**: Automatically saves formatted Markdown summaries into thread IDs (`default_classroom_{user}`, `default_email_{user}`, `default_tt_{user}`) in `db/StudentOS.db` **without consuming LLM API tokens**.

---

## 4. Zero-Token Dynamic Dashboard REST Endpoints

Located in `FastAPI/router/dashboard/dashboard.py`:

- **`GET /timetable/next-class`**: Returns current lecture slot and live countdown to next class.
- **`GET /classroom/next-deadline`**: Returns nearest Google Classroom assignment due date with urgency badge.
- **`GET /email/priority-latest`**: Returns latest unread professor/department email summary banner.

---

## 5. Google API Suite & OAuth PKCE Authentication

- **Google OAuth 2.0 (`scripts/authenticate_oauth.py`)**:
  - OAuth flows for Gmail and Classroom v1 APIs with token auto-refresh.
  - Supports non-interactive headless server execution via environment variables (`CLASSROOM_OAUTH_TOKEN_JSON`, `EMAIL_OAUTH_TOKEN_JSON`).
- **Supabase PKCE OAuth State Handler (`FastAPI/router/auth/auth.py`)**:
  - Solved PKCE `400 Bad Request` state mismatch by encoding `code_verifier` into OAuth redirect URL state parameters.

---

## 6. Timezone & Relative Date Engine

- **Asia/Kolkata IST Standard**: Converts raw UTC header timestamps into local IST strings (`YYYY-MM-DD hh:mm AM/PM`).
- **Natural Relative Date Parsing**: Converts `"5 hours ago"`, `"yesterday"`, or `"last 3 days"` into Unix epochs for Gmail search filters.

---

## 7. SQLite Data Persistence Layer (`db/database.py`)

- **`StudentOS.db`**: Async SQLite store managing chat thread metadata, message histories, pinned threads, and background sync digests.