# 🎓 Student OS

> **An LLM-Powered Autonomous Agent System for Managing Academic Timetables, Google Classroom, Student Emails, and Automated Background Workflows.**

<p align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-000000?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" alt="LangGraph" />
  <img src="https://img.shields.io/badge/APScheduler-FF6F00?style=for-the-badge&logo=clock&logoColor=white" alt="APScheduler" />
  <img src="https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Google Cloud" />
  <img src="https://img.shields.io/badge/Gmail_API-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail API" />
  <img src="https://img.shields.io/badge/Google_Classroom-0F9D58?style=for-the-badge&logo=googleclassroom&logoColor=white" alt="Google Classroom" />
</p>

---

## 🌟 Overview

**Student OS** is an intelligent, multi-agent AI assistant and automated background workflow system designed for university students. Powered by **FastAPI**, **LangGraph Orchestrator**, **APScheduler Background Synchronization**, and a **Linear & Vercel Ultra-Sleek Glassmorphism React Native frontend**, Student OS enables students to manage class schedules, query Google Classroom assignments, search emails, grade pre-submission coursework, and view zero-token background updates.

---

## ✨ Key Features & Capabilities

- 🎨 **Linear & Vercel Ultra-Sleek Glassmorphism UI/UX**:
  - 6 curated HSL dark themes (`Linear Glass & Azure Glow`, `Linear Midnight`, `Raycast Cyberpunk`, `Supabase Forest`, `Vercel Crimson`, `Solarized Amber`).
  - **Command Center Dashboard**: Hero Spotlight Cards (`Pending Deadlines`, `Priority Mails`, `Class Hours Today`), category filter toolbar tabs (`🌟 All Feeds`, `📚 Assignments`, `📅 Timetable`, `✉️ Mails`), live class spotlight banner, and clickable feed cards opening direct web URLs (`Open Classroom ↗`, `Open Email ↗`).

- ⚙️ **Background Automation Scheduler** :
  - Async background worker powered by **APScheduler** & **SQLAlchemyJobStore** (`db/automation.db`).
  - Periodically fetches upcoming assignment deadlines, unread priority emails, and daily timetables directly without consuming LLM API tokens. It uses the tools made while implementing the sub-agents.
  - Automatically saves formatted Markdown digest threads in local SQLite database (`db/StudentOS.db`).

- ⚡ **Dynamic Dashboard REST Widgets**:
  - **`GET /timetable/next-class`**: Calculates active class duration in hours and provides real-time countdown to next class.
  - **`GET /classroom/next-deadline`**: Dynamically evaluates the closest pending assignment due date with urgency badges (🔴 Due Today, 🟡 Due Tomorrow, 🟢 Upcoming).
  - **`GET /email/priority-latest`**: Delivers a 1-line unread email summary banner on the hero dashboard.

- 📝 **Grader Feedback Agent**:
  - Analyzes coursework drafts against assignment rubrics, checking code logic, essay arguments, and structural formatting before final submission.

- 🔒 **Persistent Session & OAuth Redirect Sync**:
  - Supabase & Google OAuth 2.0 PKCE integration with automatic token extraction and URL bar state cleanup.
---

## 🏗️ Architecture & Core Concepts

```text
┌────────────────────────────────────────────────────────┐
│  React Native / Expo Frontend (Android, iOS & Web)     │
│  - SSE Parser (chatStream.js) & Thread Session Engine  │
│  - Dashboard REST Widgets & OcrModal                   │
└───────────────────────────┬────────────────────────────┘
                            │  HTTP / SSE Stream (/chat/stream)
                            ▼
┌────────────────────────────────────────────────────────┐
│  Python FastAPI Server (FastAPI/main.py)               │
│  - Real-time StreamingResponse & Pydantic Validation   │
│  - APScheduler Lifespan Manager & Endpoints            │
└─────────────┬──────────────────────────────┬───────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ LangGraph Agent Orchestrator│  │ Background Workers          │
│ - Email Agent               │  │ - Classroom Job             │
│ - Classroom Agent           │  │ - Email Job                 │
│ - Timetable Agent           │  │ - Timetable Job             │
│ - Grader Agent              │  │ Store: db/automation.db     │
└─────────────────────────────┘  └─────────────────────────────┘
```

### Specialized Documentation Links
- 📘 **[Automation & Scheduler Guide](file:///home/sumirann/Documents/StudentOS/automation.md)**: APScheduler, zero-LLM connector jobs, and SQLite background persistence.
- 📙 **[Backend Architecture Guide](file:///home/sumirann/Documents/StudentOS/backend.md)**: LangGraph orchestration, tool binding, timezone conversion, and FastAPI endpoints.
- 📗 **[Frontend Engineering Guide](file:///home/sumirann/Documents/StudentOS/frontend.md)**: React Native setup, glassmorphism design system, SSE streaming, and component specs.

---

## 📁 Repository Structure

```text
StudentOS/
├── FastAPI/                    # FastAPI Backend Server & Endpoints
│   ├── main.py                 # Application entry point & APScheduler lifespan
│   └── router/                 # API router modules
│       ├── chats/              # Chat SSE stream & Grader API routes
│       ├── dashboard/          # Dashboard REST endpoints
│       ├── setup/              # Setup & backend health status routes
│       └── auth/               # OAuth Supabase Setup
├── backend/                    # LangGraph Multi-Agent Engine & Tools
│   ├── state.py                # AgentState definition & system prompts
│   ├── config.py               # LLM model configuration
│   ├── automation/             # Background cron connectors
│   │   ├── classroom.py        # Classroom assignment job
│   │   ├── email.py            # Gmail job
│   │   └── timetable.py        # Daily timetable & holiday background job
│   └── agents/                 # Specialized LangGraph Sub-Agents
│       ├── orchastetor/        # Router graph & state manager
│       ├── classroom/          # Classroom tools & graph
│       ├── email/              # Gmail tools & graph
│       ├── timetable/          # Timetable & schedule graph
│       └── grader/             # Grading tool
├── db/                         # Database & Persistence Layer
│   ├── database.py             # SQLite thread & message history engine
│   ├── automation_db.py        # SQLAlchemyJobStore config for APScheduler
│   ├── StudentOS.db            # Persistent SQLite application database
│   └── automation.db           # Persistent SQLite cron jobstore database
├── data/                       # Credentials, Tokens & Datasets
│   ├── timetable.json          # Academic schedule & holiday dataset
│   └── *_oauth_credentials.json# Google OAuth secrets & tokens(Specific for user)
├── frontend/                   # React Native / Expo Mobile & Web App
│   ├── App.js                  # Main application entry point
│   └── src/
│       ├── components/         # Header, LandingHero, MessageItem, OcrModal, etc.
│       ├── services/           # chatStream, storage, authApi, schedulerApi
│       └── theme/              # HSL 6-theme dark design system
├── DESIGN.md                   # Design System Specifications
├── automation.md               # Automation Architecture Guide
├── backend.md                  # Backend Engineering Guide
├── frontend.md                 # Frontend Engineering Guide
├── future.md                   # Feature Checklist & Roadmap
└── SESSION_NOTES.md            # Architecture Notes
```

---

## 🚀 Quick Start & Local Setup

### Step 1: Set Up Backend

1. Clone repository and install dependencies:
   ```bash
   git clone https://github.com/SumiRann1/StudentOS.git
   cd StudentOS
   pip install -r requirements.txt
   ```

2. Configure Environment Variables (`.env` in root):
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

---

### Step 2: Authenticate Google OAuth Services

Place `email_oauth_credentials.json` and `classroom_oauth_credentials.json` in `data/`, then run:

```bash
# Authenticate Google Classroom
python scripts/authenticate_oauth.py --service classroom

# Authenticate Gmail Service
python scripts/authenticate_oauth.py --service email

# Verify token status
python scripts/authenticate_oauth.py --check
```

---

### Step 3: Launch FastAPI Backend Server

```bash
uvicorn FastAPI.main:app --reload --host 0.0.0.0 --port 8000
```
Verify interactive docs at `http://localhost:8000/docs`.

---

### Step 4: Launch React Native Frontend

```bash
cd frontend
npm install

# Start Expo dev server (Scan QR code in Expo Go app)
npx expo start

# Or run in web browser
npx expo start --web
```

---

