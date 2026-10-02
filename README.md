# 🎓 Student OS v5 Pro

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

**Student OS** is an intelligent, multi-agent AI assistant and automated background workflow system designed for university students. Powered by **FastAPI**, **LangGraph Orchestrator**, **APScheduler Background Synchronization**, and an **Obsidian Space Slate React Native frontend**, Student OS enables students to manage class schedules, query Google Classroom assignments, search emails, grade pre-submission coursework, and receive zero-token background updates.

---

## ✨ Key Features & Capabilities

- 🎨 **Obsidian Space Slate Dark UI/UX**:
  - Cosmic slate aesthetic with obsidian dark palette (`#0B0F19`), glowing accents, and glassmorphic card elements.
  - Interactive **Burger Menu Drawer** (`☰`) featuring Kolkata IST real-time clock, server connection health indicator, user avatar, and session management.
  - **Animated Token Streaming Cursor (`▋`)** and pulsing thinking state indicators.
  - Floating prompt bar with **📷 Vision OCR launcher modal** for coursework and exam question parsing.

- ⚙️ **Zero-LLM Background Automation Scheduler** (`automation.md`):
  - Async background worker powered by **APScheduler** & **SQLAlchemyJobStore** (`db/automation.db`).
  - Periodically fetches upcoming assignment deadlines, unread priority emails, and daily timetables directly without consuming LLM API tokens.
  - Automatically saves formatted Markdown digest threads in local SQLite database (`db/StudentOS.db`).

- ⚡ **Zero-LLM Dynamic Dashboard REST Widgets**:
  - **`GET /timetable/next-class`**: Calculates active class duration in hours and provides real-time countdown to next class.
  - **`GET /classroom/next-deadline`**: Dynamically evaluates the closest pending assignment due date with urgency badges (🔴 Due Today, 🟡 Due Tomorrow, 🟢 Upcoming).
  - **`GET /email/priority-latest`**: Delivers a 1-line unread email summary banner on the hero dashboard.

- 📝 **Grader & Pre-Submission Feedback Agent**:
  - Analyzes coursework drafts against assignment rubrics, checking code logic, essay arguments, and structural formatting before final submission.

- 🔒 **Persistent Session & OAuth PKCE Fix**:
  - Supabase & Google OAuth 2.0 PKCE state verifier integration preventing redirect mismatches.
  - Powered by `@react-native-async-storage/async-storage` across Android, iOS, and Web.

---

## 🏗️ Architecture & Core Concepts

```text
┌────────────────────────────────────────────────────────┐
│  React Native / Expo Frontend (Android, iOS & Web)     │
│  - SSE Parser (chatStream.js) & Thread Session Engine  │
│  - Zero-LLM Dashboard REST Widgets & OcrModal          │
└───────────────────────────┬────────────────────────────┘
                            │  HTTP / SSE Stream (/chat/stream)
                            ▼
┌────────────────────────────────────────────────────────┐
│  Python FastAPI Server (FastAPI/main.py)               │
│  - Real-time StreamingResponse & Pydantic Validation   │
│  - APScheduler Lifespan Manager & Zero-LLM Endpoints   │
└─────────────┬──────────────────────────────┬───────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ LangGraph Agent Orchestrator│  │ Zero-LLM Background Worker  │
│ - Email Agent               │  │ - Classroom Job             │
│ - Classroom Agent           │  │ - Email Job                 │
│ - Timetable Agent           │  │ - Timetable Job             │
│ - Grader Agent              │  │ Store: db/automation.db     │
└─────────────────────────────┘  └─────────────────────────────┘
```

### Specialized Documentation Links
- 📘 **[Automation & Scheduler Guide](file:///home/sumirann/Documents/StudentOS/automation.md)**: Deep dive into APScheduler, zero-LLM connector jobs, and SQLite background persistence.
- 📙 **[Backend Architecture Guide](file:///home/sumirann/Documents/StudentOS/backend.md)**: Details on LangGraph orchestration, tool binding, timezone conversion, and FastAPI endpoints.
- 📗 **[Frontend Engineering Guide](file:///home/sumirann/Documents/StudentOS/frontend.md)**: React Native setup, Obsidian Space Slate styling, SSE streaming, and Markdown table rendering.
- 📕 **[Future Roadmap & Checklist](file:///home/sumirann/Documents/StudentOS/future.md)**: Completed milestones and future feature roadmap.
- 📔 **[Session Notes](file:///home/sumirann/Documents/StudentOS/SESSION_NOTES.md)**: Architecture notes and trajectory history.

---

## 📁 Repository Structure

```text
StudentOS/
├── FastAPI/                    # FastAPI Backend Server & Endpoints
│   ├── main.py                 # Application entry point & APScheduler lifespan
│   └── router/                 # API router modules
│       ├── chats/              # Chat SSE stream & Grader API routes
│       ├── dashboard/          # Zero-LLM dashboard REST endpoints
│       ├── setup/              # Setup & backend health status routes
│       └── auth/               # OAuth PKCE & session authentication
├── backend/                    # LangGraph Multi-Agent Engine & Tools
│   ├── state.py                # AgentState definition & system prompts
│   ├── config.py               # LLM model configuration
│   ├── automation/             # Zero-LLM background cron connectors
│   │   ├── classroom.py        # Google Classroom assignment background job
│   │   ├── email.py            # Gmail unread priority digest job
│   │   └── timetable.py        # Daily timetable & holiday background job
│   └── agents/                 # Specialized LangGraph Sub-Agents
│       ├── orchastetor/        # Router graph & state manager
│       ├── classroom/          # Classroom tools & graph
│       ├── email/              # Gmail tools & graph
│       ├── timetable/          # Timetable & schedule graph
│       └── grader/             # Pre-submission rubric grading tool
├── db/                         # Database & Persistence Layer
│   ├── database.py             # SQLite thread & message history engine
│   ├── automation_db.py        # SQLAlchemyJobStore config for APScheduler
│   ├── StudentOS.db            # Persistent SQLite application database
│   └── automation.db           # Persistent SQLite cron jobstore database
├── data/                       # Credentials, Tokens & Datasets
│   ├── timetable.json          # Academic schedule & holiday dataset
│   └── *_oauth_credentials.json# Google OAuth secrets & tokens
├── frontend/                   # React Native / Expo Mobile & Web App
│   ├── App.js                  # Main application entry point
│   └── src/
│       ├── components/         # Header, LandingHero, MessageItem, OcrModal, etc.
│       ├── services/           # chatStream, storage, authApi, schedulerApi
│       └── theme/              # Obsidian Space Slate dark color tokens
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

## 📄 License

This project is licensed under the **MIT License**.
*: Cache lecture schedules and pending assignments so students can check deadlines without campus Wi-Fi.
3. **RAG (Retrieval-Augmented Generation)**: Vector database (**ChromaDB** / **Qdrant**) to index uploaded lecture slides and syllabus PDFs.
4. **Background Sync Worker**: Scheduled background worker (**Celery** / **APScheduler**) to periodically sync emails and assignments.

### 🚀 Future Feature Expansion Roadmap
- **Phase 1: Smart Push Notifications (`expo-notifications`)**: Lecture alerts 15m prior; deadline warnings 24h & 3h prior.
- **Phase 2: Multi-LMS Integration**: Connectors for **Canvas LMS**, **Moodle**, **Blackboard**, and **Piazza**.
- **Phase 3: Multimodal Vision Homework Assistant**: Solve textbook equations & lab diagrams from photos.
- **Phase 4: AI Flashcard & Quiz Generator**: Spaced-repetition study flashcards automatically generated from coursework.
- **Phase 5: Grade Predictor & GPA Analytics**: Course grade tracking and target final exam score estimation.

---

## 📄 License

This project is licensed under the **MIT License**.
