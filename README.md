# EduSync

EduSync is a student learning workspace with authentication, subjects and lectures, planner/tasks, notes, analytics, library, focus mode, admin controls, and AI lecture summaries.

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

### Environment files

Backend environment variables belong in `backend/.env` (copy from `backend/.env.example`).

Frontend environment variables belong in `frontend/.env` (copy from `frontend/.env.example`).

Do not commit real secrets.

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
