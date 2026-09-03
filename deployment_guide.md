# Student OS v3 End-to-End Deployment Guide

Understanding the architecture:
- **Frontend (React Native / Mobile App)**: Installed on mobile phones as an `.apk` or run in browsers. It provides the user interface.
- **Backend (Python FastAPI + LangGraph Agents)**: Executes the LLM orchestrator, Google Classroom API, Gmail API, and Timetable logic.

---

## How Complete Mobile Deployment Works (2 Steps)

To make your mobile `.apk` work from **anywhere in the world** without needing your computer turned on:

```
┌──────────────────────────────────────────┐                   ┌──────────────────────────────────────────┐
│  Mobile Phone (Android APK)              │   Public HTTPS    │  FastAPI Cloud Server (Render / Railway) │
│  • Installed via .apk                    │ ────────────────► │  • Python FastAPI + Agents               │
│  • Connects via Live Server URL          │ ◄──────────────── │  • Classroom, Email, & Timetable Data    │
└──────────────────────────────────────────┘                   └──────────────────────────────────────────┘
```

---

### Step 1: Deploy Python Backend to Free Cloud Server (Render / Railway)

1. Push your repository to GitHub.
2. Sign in to [Render.com](https://render.com) (free).
3. Create **New Web Service** → Select your repository.
4. Set details:
   - **Root Directory**: `.`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python3 -m uvicorn FastAPI.main:app --host 0.0.0.0 --port $PORT`
5. Render will give you a public URL, for example: `https://student-os-backend.onrender.com`.

---

### Step 2: Build the Android `.apk` pointing to your Live Cloud Backend

1. In `frontend/.env` or `app.json`, set your live backend URL:
   ```env
   EXPO_PUBLIC_API_URL=https://student-os-backend.onrender.com
   ```
2. Build the standalone `.apk`:
   ```bash
   cd frontend
   eas build -p android --profile preview
   ```
3. Expo builds the APK in the cloud and provides a QR code / download link.
4. Download the `.apk` onto your phone. Now your mobile app is 100% connected to your live cloud backend!
