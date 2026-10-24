# EduSync

EduSync is an open, account-free student learning workspace with browser-local subjects and YouTube learning libraries, notes, planner/tasks, analytics, focus mode, and optional AI lecture summaries. Developed by Meet Sharma — meetsharma0702@gmail.com.

## What is implemented

- No sign-up or login screen: every visitor can begin using EduSync immediately. Each visitor's workspace is isolated in their own browser storage; export/import is available for portability.
- Supported HTTPS YouTube URL validation (`watch`, `youtu.be`, `embed`, and `shorts`), canonicalization, duplicate prevention in a subject, responsive embedded playback, explicit manual completion, and saved resume/progress state where the player supplies it.
- Responsive dark/light interface with subject progress, dashboard metrics computed from persisted workspace records, study analytics, local export/import, and accessible empty/error states.

### YouTube and AI limitations

Video title, channel, and duration remain user-provided unless a YouTube Data API integration is configured; EduSync does not fabricate metadata. Some videos cannot be embedded because of their YouTube publisher settings. Progress is saved only when the YouTube player exposes playback events. AI summaries require a pasted transcript and an `OPENAI_API_KEY`; no video transcript is fetched or inferred by the application.

## Project structure

The repository keeps the application code cleanly separated into two top-level application folders:

- `frontend/` — React + TypeScript + Vite application.
- `backend/` — Express + TypeScript + MongoDB/Mongoose API.

Root-level files are limited to repository/project configuration such as the package manager, README, formatting, GitHub Actions, and Git metadata. Application source and application-specific configuration live inside `frontend/` or `backend/`.

## Development

Install dependencies from the repository root:

```bash
npm install
```

Run the frontend:

```bash
npm run frontend:dev
```

Run the backend:

```bash
npm run backend:dev
```

Build both applications:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

For production, run the backend after compiling it:

```bash
NODE_ENV=production node dist/backend/server.js
```

### Environment files

Backend environment variables belong in `backend/.env` (copy from `backend/.env.example`).

Frontend environment variables belong in `frontend/.env` (copy from `frontend/.env.example`).

Do not commit real secrets.

The public frontend does not require a database. Browser data can be cleared by the visitor, so encourage users to export regular backups. The optional backend integrations still require their documented environment configuration.

## Backend API

- `/health`
- `/api/auth/*` — sign up, sign in, sessions, verification, Google OAuth.
- `/api/subjects/*` — authenticated subject and lecture operations.
- `/api/workspace` — authenticated persistent tasks, notes, goals, activity, language, and study-time state.
- `/api/dashboard` — authenticated dashboard metrics.
- `/api/admin/*` — protected administrator account management and platform statistics.
- `/api/ai/lectures/summary` — authenticated AI lecture summarization.

## Architecture rule

The frontend is responsible for the user interface and client-side state. The backend is responsible for authentication, validation, persistence, and protected API operations. MongoDB is the persistent source of truth for authenticated workspace data.
