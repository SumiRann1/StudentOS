# 📱 StudentOS Frontend Engineering Architecture

Here is a comprehensive breakdown of all **technologies, UI/UX design concepts, services, and component structures** in the **StudentOS Frontend**:

---

## 1. Core Framework & Cross-Platform Engine
- **React Native & Expo (`Expo SDK 57`, React 19, React Native 0.86)**:
  - Unified cross-platform codebase compiling to **Android**, **iOS**, and **Web (`react-native-web`)**.
- **Google Font & Ambient Mesh Engine**:
  - Injects `Plus Jakarta Sans` Google font and fixed HSL ambient mesh lights (`radial-gradient`) in web `#root`.

---

## 2. Real-Time Streaming & Zero-LLM Service Layer

### ⚡ SSE Stream Parser (`src/services/chatStream.js`)
- Connects directly to FastAPI `/chat/stream` endpoint.
- Parses `text/event-stream` chunks line-by-line:
  - **`onChunk`**: Delivers live token-by-token text streaming to the message bubble.
  - **`onToolStart`**: Emits real-time execution pills (e.g., `⚡ search_emails`, `⚡ get_upcoming_assignments`).

### 📊 Zero-LLM Smart Widget Services (`src/services/schedulerApi.js`)
- Fetches real-time dashboard data from FastAPI REST routes without triggering LLM calls:
  - `fetchNextClass()`: Calls `GET /timetable/next-class` for ongoing/next lecture countdowns.
  - `fetchNextDeadline()`: Calls `GET /classroom/next-deadline` for pending assignment due dates.
  - `fetchPriorityEmail()`: Calls `GET /email/priority-latest` for urgent email digest banners.

### 🔒 Persistent Auth & Session Sync (`src/services/storage.js` & `authApi.js`)
- **`@react-native-async-storage/async-storage`**: Persists authentication tokens, user profile, and active thread state across app restarts on mobile and web (`localStorage`).
- **OAuth PKCE & Web Redirect**: Handles Supabase & Google OAuth redirect callbacks (`http://localhost:8081/?access_token=...`), automatically extracting tokens and cleaning up the browser URL bar state.

---

## 3. Comprehensive Component Architecture

### 🔝 `Header.js` (Uniform Control Bar)
- Standardized `36px` height alignment across all buttons, `10px` border radius, and `15px` icon typography.
- Burger drawer button (`☰`), App logo ring, Active topic status pill (`● Online`), `+ New Chat`, `📷 OCR`, `⚙️ Setup`, and `🎨 Theme` cycle switcher.
- Responsive mobile collapsing into symmetrical `36x36px` icon squares on screens `< 640px` to eliminate element overlapping.

### 🌟 `LandingHero.js` (Option B Command Center Dashboard)
- Top KPI Hero Spotlight Cards (`Pending Deadlines`, `Priority Mails`, `Class Hours Today`).
- Category filter toolbar tabs (`🌟 All Feeds`, `📚 Assignments`, `📅 Timetable`, `✉️ Mails`).
- Live lecture spotlight banner with countdown tickers (`Starts in X mins`).
- Clickable feed cards that open direct web URLs (`Open Classroom ↗`, `Open Email ↗`).

### 🔐 `LoginScreen.js` (Centered Glass Card)
- Centered `maxWidth: 480px` frosted glass card (`backdropFilter: blur(24px)`).
- Cosmic radial ambient glow graphics and glowing Google Sign-In primary CTA button.

### 💬 `MessageItem.js` (Streamlined AI Response Stream)
- Borderless inline stream for assistant responses (matching ChatGPT & Linear standards).
- Frosted glass user message bubbles (`borderRadius: 18px`).
- Tool execution badges (`⚡ tool_name`) and horizontal scrollable markdown tables.

### 💬 `ChatInput.js` (Floating Dock Input Bar)
- Translucent input dock (`backdropFilter: blur(24px)`) centered at the bottom of the screen.
- Active HSL focus glow ring (`boxShadow: 0 0 16px colors.primaryGlow`).
- Dedicated camera icon button (`📷`) to launch OCR transcript analysis.

### 📑 `SidebarDrawer.js` (Structured Navigation Drawer)
- Date-categorized chat threads (📌 **Pinned**, 📅 **Today**, 🕒 **Previous 7 Days**, 🗄️ **Older**).
- Header with `v1.0` tag, live search input with clear button `✕`, micro automations list, theme swatches accordion, and sticky user profile footer.

### ⚙️ `SetupModal.js` & 📷 `OcrModal.js` (Translucent Glass Dialogs)
- **SetupModal**: Active service health status pills for Google Classroom and Gmail.
- **OcrModal**: Real GPA transcript extractor, interactive 10-point grade spectrum bar chart, and parsed markdown tabs.