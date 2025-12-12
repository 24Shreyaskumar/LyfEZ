API Contract (initial)

Auth

- POST /auth/register {email, password, name}
- POST /auth/login {email, password} -> {token}

Groups

- POST /api/groups {name} -> create group (creator becomes admin)
- POST /api/groups/:id/members {userId} -> add member
- GET /api/groups/:id -> group details, members, activities

Activities

- POST /api/groups/:groupId/activities {title, description}
- GET /api/groups/:groupId/activities

Submissions

- POST /api/activities/:activityId/submissions {proofUrl, notes}
- GET /api/activities/:activityId/submissions

Reviews

- POST /api/submissions/:submissionId/reviews {approved, comment}
- GET /api/submissions/:submissionId/reviews

Workflow notes

- Submission `status` moves from `PENDING` -> `UNDER_REVIEW` when first review is added.
- When required approvals threshold is met (configurable, e.g., majority or k-of-n), status -> `APPROVED`.
- Only group members except the submitter can review.
