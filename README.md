# EduSync

EduSync is a student learning workspace with authentication, subjects and lectures, planner/tasks, notes, analytics, library, focus mode, admin controls, and AI lecture summaries.

## Project structure

- `frontend/` — React + TypeScript + Vite application.
- `backend/` — Express + TypeScript + MongoDB/Mongoose API.

## Development

Install dependencies:

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

Create a root `.env` from `.env.example` for MongoDB, JWT, CORS, optional Google OAuth, email verification, and AI configuration. Set `VITE_API_URL` in the frontend environment to the backend base URL.

## Backend API

`/health`

`/api/auth/*` — sign up, sign in, sessions, verification, Google OAuth.

`/api/subjects/*` — authenticated subject and lecture operations.

`/api/workspace` — authenticated persistent tasks, notes, goals, activity, language, and study-time state.

`/api/dashboard` — authenticated dashboard metrics.

`/api/admin/*` — protected administrator account management and platform statistics.

`/api/ai/lectures/summary` — authenticated AI lecture summarization.

## Important

The production application should use the backend as the source of truth. The frontend keeps its existing local cache for responsiveness, while authenticated workspace changes are synchronized to MongoDB through `/api/workspace`.
