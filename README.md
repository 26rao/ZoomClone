# Premium Zoom Clone

A high-fidelity Zoom clone featuring a FastAPI (Python) backend and a Next.js (TypeScript/Tailwind CSS) frontend. The application implements full real-time video conferencing utilizing the Stream Video SDK.

---

## 🚀 Key Systems

### 📹 1. Real-Time Video Conferencing
Powered by `@stream-io/video-react-sdk` and standard browser media APIs to support actual real-world meeting workflows:
- **Audio & Video Feeds:** Handles speaker levels, webcam rendering, and mute/unmute states.
- **Screen Sharing:** Captures actual windows/displays using browser media streams and presents screen-share tracks natively.
- **Active Speaker Detection:** Highlights the current speaker dynamically inside the grid.
- **Host Controls:** Hosts have permission to mute all participants and kick/remove users from the meeting.
- **Roster & Participants:** Displays a real-time list of all users joined in the call.
- **Interactive Chat:** Allows instant messaging inside the call via custom event broadcasting.

### 🔐 2. Database-Backed Authentication
- Includes a clean Zoom-branded **Sign In** and **Sign Up** portal.
- Integrates database validation in SQLite:
  - **Sign Up:** Registers new display names and email addresses.
  - **Sign In:** Restores existing profile cards from DB emails.
  - **Guest Access:** Quick sign-in bypass for quick evaluation.
- Signs authentication states with JWTs via `jose` in FastAPI, persisting sessions in `localStorage`.
- Includes a **Sign Out** button in the dashboard navbar to clear active sessions.

### 🗄️ 3. Database Schema & Startup Seeding
- **SQLite Database** (`zoom.db`) holds three primary tables mapping real-world Zoom entities:
  - `users`: Track unique string IDs, email addresses, names, and roles.
  - `meetings`: Map meeting IDs, descriptions, scheduled times, duration, hosts, and passcode locks.
  - `participants`: Records users currently in individual call rooms.
- **Seeding:** The application startup automatically checks if the database is unpopulated and seeds mock accounts, active meetings, and historical completed cards.

---

## 🛠️ Technology Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide Icons, Date-fns, React Hot Toast, `@stream-io/video-react-sdk`.
- **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLAlchemy (SQLite), python-dotenv, python-jose[cryptography].

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend API Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy pydantic python-jose[cryptography] passlib[bcrypt] python-multipart python-dotenv
   ```
4. Define environment variables in `backend/.env`:
   ```env
   STREAM_API_KEY=your_stream_api_key
   STREAM_API_SECRET=your_stream_api_secret
   ```
5. Seed the database manually (Optional):
   ```bash
   # Windows (ensure virtualenv is active):
   python seed.py
   ```
6. Run the Uvicorn server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### 2. Frontend Next.js Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` to interact with the application.
