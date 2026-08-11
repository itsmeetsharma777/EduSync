# EduSync

A polished learning-management workspace for intentional study. The starter includes a responsive React experience and a secure Express/MongoDB API foundation.

## Included

- Premium student dashboard with subjects, planner, analytics, library, dark mode, keyboard-friendly UI, Pomodoro timer, and AI study companion.
- Recharts analytics and production code splitting for the chart, animation, and icon libraries.
- Express API with Helmet, CORS, rate limiting, JWT authentication, bcrypt password hashing, Zod validation, MongoDB/Mongoose models, and owner-scoped subject/lecture routes.

## Run locally

```bash
npm install
npm run dev
```

The frontend runs on Vite. For the API, create a `.env` from `.env.example`, set a MongoDB connection string and a strong JWT secret, then run:

```bash
npm run server:dev
```

## Checks

```bash
npm run build
npm run server:build
```

## API surface

| Method         | Route                               | Description                                     |
| -------------- | ----------------------------------- | ----------------------------------------------- |
| `GET`          | `/health`                           | API health probe                                |
| `POST`         | `/api/auth/sign-up`                 | Create a student account                        |
| `POST`         | `/api/auth/sign-in`                 | Receive a JWT                                   |
| `GET` / `POST` | `/api/subjects`                     | List or create the signed-in user’s subjects    |
| `POST`         | `/api/subjects/:subjectId/lectures` | Add a YouTube lecture with a thumbnail fallback |
| `GET`          | `/api/dashboard`                    | Return user learning metrics                    |
