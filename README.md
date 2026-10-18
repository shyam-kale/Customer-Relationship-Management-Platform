# NexusCRM — Customer Relationship Management Platform

A full-stack CRM built with **React + Vite + Tailwind CSS** (frontend) and **Node.js + Express + SQLite** (backend).

🌐 **Live Demo:** [GitHub Pages](https://shyam-kale.github.io/Customer-Relationship-Management-Platform/)

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | KPI cards, pipeline charts, revenue tracker, activity log |
| **Customers** | Full CRUD, health grading, 360° profile, bulk actions |
| **Leads** | Workflow transitions, 1-click lead→deal conversion |
| **Follow-Ups** | Scheduling, overdue alerts, quick-complete |
| **Pipeline** | Kanban board with deal stage transitions |

## Tech Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, Recharts, React Router 6, Lucide React
- **Backend:** Node.js, Express 4, better-sqlite3 (SQLite)
- **Tests:** Vitest + Supertest (30 passing tests)
- **Deploy:** GitHub Pages (Actions CI/CD)

## Local Development

```bash
# Backend
cd backend && npm install && npm start
# → http://localhost:3001

# Frontend (in a new terminal)
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

## Run Tests

```bash
cd backend && npm test
# 30 tests: customers, leads, follow-ups, deals, regression
```

## Deploy to GitHub Pages

Push to `main` — the GitHub Actions workflow builds and deploys automatically.

> **Note:** The GitHub Pages demo uses a localStorage mock API (no backend required). All data persists in your browser session.
