LyfEZ — Project scaffold

Overview

- Purpose: Collaborative groups where an admin adds activities for users. Users complete activities and submit proofs. Other group members review and approve, turning activity status green when approved (peer-review flow).

Structure

- `backend/` — Node/Express + Prisma schema, API routes and models
- `frontend/` — Vite + React placeholder for UI components
- `docs/` — design notes and API contract

Next steps

1. Install backend dependencies and set up Prisma + SQLite (if you want a lightweight DB) or Postgres.
2. Implement authentication and role-based access (admin vs member).
3. Implement activity creation and submission, and peer-review endpoints.
4. Build frontend pages for groups, dashboard, activity submission, and review.

See `backend/README.md` and `frontend/README.md` for per-section instructions.
