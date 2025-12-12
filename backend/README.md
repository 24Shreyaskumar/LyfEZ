Backend (Node + Express + Prisma)

Quick start (suggested):

1. `cd backend`
2. `npm install`
3. Create `.env` with `DATABASE_URL="file:./dev.db"` for SQLite or your Postgres connection string.
4. `npx prisma migrate dev --name init` (or `prisma db push` for quick schema push)
5. `npm run dev`

Suggested packages

- express, prisma, @prisma/client, bcrypt (or argon2), jsonwebtoken
- nodemon or ts-node-dev for dev

Data model (see `prisma/schema.prisma`) includes: User, Group, Membership, Activity, Proof, Review.

API ideas

- `POST /auth/register` / `POST /auth/login`
- `POST /groups` (admin creates group)
- `POST /groups/:id/members` (add user to group)
- `POST /groups/:id/activities` (admin adds activity)
- `POST /activities/:id/submissions` (user submits proof)
- `POST /activities/:id/submissions/:sid/reviews` (group members review)

Role notes

- A `Membership` record tracks if a user is `admin` for a group.
- Reviews must include reviewer id. Activity status becomes `approved` only after required number of approvals or majority (policy to be defined).
