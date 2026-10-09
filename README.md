# Taskflow — MERN Task Manager

Taskflow is a full-stack task manager built with Next.js and React, backed by a Node.js/Express REST API and MongoDB. Create an account, organize tasks by status and priority, set due dates, search your list, and track what you have completed.

## Features

- User registration and login with JWT authentication and bcrypt-hashed passwords
- Create, view, edit, complete, reopen, and delete tasks
- Task status: To do, In progress, and Completed
- Low, medium, and high priority labels
- Project grouping, searchable labels, and user-defined task categories
- Subtasks with individual completion tracking
- Detailed task briefs with descriptions and measurable goals / acceptance criteria
- Task notes, named resource links, and estimated completion time
- List and Kanban board layouts, with tasks grouped by status
- Priority filtering alongside task search
- Optional due dates with overdue indicators
- Search across task titles and descriptions
- Today, Upcoming, Completed, and All tasks views with live counts
- Per-user task isolation on every API query
- Responsive Next.js interface with keyboard-visible focus states
- Jest/Supertest API tests using an in-memory MongoDB

## Technology

- **Frontend:** Next.js 16, React 19
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JSON Web Tokens, bcryptjs
- **Testing:** Jest, Supertest, mongodb-memory-server

## Project layout

```text
client/
  app/                 Next.js App Router pages, layout, and styles
  src/services/api.js  Authenticated API client
server/
  config/              MongoDB connection
  controllers/         Authentication and task handlers
  middleware/          Authentication and shared error handling
  models/              Mongoose User and Task models
  routes/              Express API routes
  tests/               API integration tests
```

## Requirements

Node.js 20.9 or later (required by Next.js 16). Use a local MongoDB instance or MongoDB Atlas for persistent data.

## Install

From the repository root:

```powershell
Copy-Item .env.example server/.env
Copy-Item client/.env.example client/.env.local
```

Edit `server/.env` and set a private `JWT_SECRET` and your MongoDB `MONGO_URI`. Set `TASK_API_URL` in `client/.env.local` to the backend origin if it differs from `http://localhost:5000`. The Next.js server proxies `/api/*` requests to this Express API, so browser requests stay on the same origin. Restart Next.js after changing its environment file. Then install each app:

```powershell
cd server
npm install
cd ..\client
npm install
```

## Run locally

Start the API in one terminal:

```powershell
cd server
npm run dev
```

Start Next.js in another terminal:

```powershell
cd client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API runs at [http://localhost:5000](http://localhost:5000). The frontend uses the Next.js rewrite proxy to connect to Express; for direct cross-origin API clients, set `CLIENT_URL` in `server/.env` accordingly.

For quick development without a configured `MONGO_URI`, the API starts with a temporary in-memory MongoDB; its data is discarded when the server stops. Set `MONGO_URI` to retain data.

## API

All task endpoints require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in and get a token |
| GET | `/api/auth/me` | Get the signed-in user |
| GET | `/api/tasks?q=` | List tasks and optionally search title/description |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/tasks/stats` | Get task counts by status |
| GET | `/api/health` | API health check |

Task fields: `title` (required), `description`, `goals`, `notes`, `links` (up to 10 http/https resources with an optional title), `estimateMinutes` (whole minutes from 1 to 10080), `project`, `labels` (up to 10), `subtasks` (up to 30), `status` (`todo`, `in-progress`, `completed`), `priority` (`low`, `medium`, `high`), and `dueDate`. Subtasks have a `title` and `completed` flag.

## Test and build

```powershell
cd server
npm test
cd ..\client
npm run build
```
