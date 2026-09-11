# 🎓 Student OS v4

> **An LLM-Powered Autonomous Agent System for Managing Academic Timetables, Google Classroom, and Student Emails.**

<p align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-000000?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" alt="LangChain" />
  <img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Google Cloud" />
  <img src="https://img.shields.io/badge/Gmail_API-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail API" />
  <img src="https://img.shields.io/badge/Google_Classroom-0F9D58?style=for-the-badge&logo=googleclassroom&logoColor=white" alt="Google Classroom" />
</p>

---

## 🌟 Overview

**Student OS** is an intelligent, multi-agent AI assistant designed to streamline academic workflows for university students. Powered by **FastAPI**, **LangChain / LangGraph**, and a **ChatGPT-inspired React Native frontend**, Student OS enables students to check class schedules, query Google Classroom assignments, search emails, and manage coursework using natural conversational language.

---

## ✨ Features & Capabilities

- 🎨 **ChatGPT-Inspired Dark UI/UX**:
  - Glassmorphic header with Student OS model selector pill (`✨ Student OS 4`) and custom branding logo.
  - Interactive **Burger Menu Drawer** (`☰`) for fast navigation, session management, and live server health status.
  - **Animated Token Streaming Cursor (`▋`)** and pulsing thinking indicator.
  - Floating pill input bar (`border-radius: 26px`) with circular send button (`↑`), prompt suggestions, and disclaimer footer.
  - Platform-aware keyboard handling (`softwareKeyboardLayoutMode: "resize"`).

- 📚 **Google Classroom Agent**:
  - Query enrolled courses, syllabus, and course codes.
  - Fetch upcoming assignments, pending homework, due date alerts, and assignment descriptions.
  - View submission status, draft grades, and instructor announcements.

- ✉️ **Gmail Assistant**:
  - Search unread or relative time-range student emails.
  - Read full email threads, body content, and send/draft emails directly.

- 📅 **Timetable & Academic Schedule**:
  - Query daily schedules for any weekday.
  - Course venue lookup (classroom numbers, lecture halls, labs).
  - Explicit **Lunch Break (13:30 – 14:30 / 1:30 PM – 2:30 PM)** tracking across all weekdays.
  - Faculty instructor and syllabus queries.

- 🔑 **Google OAuth 2.0 Management**:
  - Interactive CLI authentication helper (`scripts/authenticate_oauth.py`).
  - Persistent refresh tokens (`prompt='consent'`, `access_type='offline'`).
  - API setup endpoints (`POST /setup/auth/{service}`, `GET /setup/status`).

---

## 🏗️ Architecture

```text
┌──────────────────────────────────────────┐
│  React Native / Expo Frontend            │
│  (Mobile APK & Web App)                  │
└────────────────────┬─────────────────────┘
                     │  HTTP / SSE Stream (/chat/stream)
                     ▼
┌──────────────────────────────────────────┐
│  Python FastAPI Server                   │
│  (Chat Stream & Setup Routers)           │
└────────────────────┬─────────────────────┘
                     │  LangGraph StateGraph & Checkpointer
                     ▼
┌──────────────────────────────────────────┐
│  LangGraph Orchestrator                  │
│  ├─► Classroom Agent (Google Classroom API)│
│  ├─► Email Agent (Gmail API)             │
│  ├─► Timetable Agent (JSON Schedule Data)│
│  └─► General Assistant                   │
└──────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```text
StudentOS/
├── FastAPI/                    # FastAPI Backend Application
│   ├── main.py                 # Application entry point & CORS
│   └── router/                 # API routers
│       ├── chat.py             # Server-Sent Events (SSE) streaming endpoint
│       ├── setup.py            # OAuth verification & setup status routes
│       └── schema.py           # Pydantic data models
├── backend/                    # LangGraph Agent Orchestrator & Tools
│   ├── state.py                # AgentState & System Prompts
│   ├── config.py               # LLM configuration (Groq / Llama 3.3)
│   └── agents/
│       ├── orchastetor/        # Graph routing logic
│       ├── classroom/          # Classroom tools & graph
│       ├── email/              # Gmail tools & graph
│       └── timetable/          # Timetable tools & graph
├── data/                       # Credentials, Tokens & Datasets
│   ├── timetable.json          # Weekly academic schedule dataset
│   ├── email_oauth_credentials.json
│   ├── email_oauth_token.json
│   ├── classroom_oauth_credentials.json
│   └── classroom_oauth_token.json
├── frontend/                   # React Native / Expo Frontend
│   ├── App.js                  # Main chat app entry point
│   ├── app.json                # Expo configuration
│   ├── assets/                 # App logo, icons & favicons
│   └── src/
│       ├── components/         # Header, MessageItem, ChatInput, SidebarDrawer, SetupModal
│       ├── services/           # Chat SSE stream & Setup API handlers
│       └── theme/              # ChatGPT dark theme colors
├── scripts/                    # Management Scripts
│   └── authenticate_oauth.py   # CLI OAuth sign-in & token generator
└── requirements.txt            # Python dependencies
```

---

## 🚀 Quick Start Guide && Local Setup

### Prerequisites

- **Python 3.10+** (or Conda environment)
- **Node.js 18+** & `npm` / `npx`
- **Google Cloud Console OAuth 2.0 Credentials** (`Desktop App`)

---

### Step 1: Set Up Backend

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/your-username/StudentOS.git
   cd StudentOS
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure Environment Variables (`.env` in root):
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

---

### Step 2: Authenticate Google OAuth Services

Place your `email_oauth_credentials.json` and `classroom_oauth_credentials.json` inside the `data/` directory, then run the authentication tool:

```bash
# Authenticate Google Classroom
python scripts/authenticate_oauth.py --service classroom

# Authenticate Gmail Service
python scripts/authenticate_oauth.py --service email

# Verify all token statuses
python scripts/authenticate_oauth.py --check
```

---

### Step 3: Launch FastAPI Server

Start the backend API listening on `0.0.0.0:8000`:

```bash
uvicorn FastAPI.main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend health at `http://localhost:8000/docs`.

---

### Step 4: Launch React Native Frontend

1. Navigate to the `frontend/` directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Expo development server:
   ```bash
   # Start Expo dev server (Scan QR code in Expo Go app)
   npx expo start

   # Or launch directly in Web Browser
   npx expo start --web
   ```

---

## 🛠️ Technology Stack

| Category | Technology & Shields |
| :--- | :--- |
| **Frontend UI** | ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Expo](https://img.shields.io/badge/Expo-000000?style=for-the-badge&logo=expo&logoColor=white) |
| **Backend & API** | ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white) |
| **AI & Orchestration** | ![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white) ![Groq](https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white) |
| **Integrations** | ![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white) ![Gmail API](https://img.shields.io/badge/Gmail_API-EA4335?style=for-the-badge&logo=gmail&logoColor=white) ![Google Classroom](https://img.shields.io/badge/Google_Classroom-0F9D58?style=for-the-badge&logo=googleclassroom&logoColor=white) |

---

## 📄 License

This project is licensed under the **MIT License**.


