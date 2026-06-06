# AI Skill Bridge

> A peer-to-peer learning platform that teaches non-technical employees to use AI tools responsibly and effectively. Employees complete practical tasks, evaluate each other's work against a configurable rubric, and earn XP as they progress.

Built at **GreenHack 06/2026** — 42 Prague.

---

## Quick start

```bash
cd backend
make env          # copy .env.example → .env
make stack        # Postgres + API + Loki/Grafana/Promtail (detached)
make run          # API with hot reload → http://localhost:8000/docs
make seed         # admin, power user, demo tasks
```

**Full stack with logs dashboard:**

```bash
cd backend
make seed
```

Open **http://localhost:8000/docs** — the interactive API is live.

**Logs (local):** API logs go to the uvicorn terminal. Each line includes a `[request_id]` you can trace across messages.

**Grafana dashboard (Loki):** **http://localhost:3010/d/ai-skill-bridge-api** — provisioned on startup (request throughput, errors, auth/learning log streams with human `description` text on user-journey events). Requires `make stack` or `make up-obs` with the API running in Docker so Promtail can ship container logs. After logging code changes, rebuild the API container only — not Loki.

> `make help` lists all targets. Root repo: `make backend TARGET=stack`.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker + Compose | any recent | https://docs.docker.com/get-docker |
| uv | ≥ 0.4 | `pip install uv` |
| Python | 3.12 (managed by uv) | automatic |

---

## Configuration

Copy `.env.example` to `.env` and adjust before any non-local deployment.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+psycopg2://bridge:bridge@localhost:5432/bridge` | Postgres connection string |
| `SECRET_KEY` | `dev-secret-…` | JWT signing key — **must be changed in production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Short-lived bearer token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh cookie lifetime |
| `COOKIE_SECURE` | `false` | Set `true` in production (HTTPS only) |
| `CORS_ORIGINS` | `["http://localhost:5173","http://localhost:3000"]` | Allowed frontend origins (JSON array) |
| `LOG_LEVEL` | `DEBUG` | Log verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `LOG_JSON` | `false` | JSON lines to stdout (set `true` for Loki) |
| `LOG_ACCESS` | `false` | Also emit uvicorn access logs |
| `UPLOAD_DIR` | `uploads` | Local directory for submitted files |
| `SEED_ADMIN_EMAIL` | `admin@bridge.local` | Admin account created by the seed |
| `SEED_ADMIN_PASSWORD` | `Admin1234!` | — |
| `SEED_POWER_EMAIL` | `poweruser@bridge.local` | Power user created by the seed |
| `SEED_POWER_PASSWORD` | `Power1234!` | — |

---

## Logging

Centralized logging lives in `app/core/logging.py`. Configure via env; use `get_logger(__name__)` for low-level events and `log_user_journey()` for user-facing actions.

**User-journey logs** carry a human-readable **`description`** (what you'd tell someone reading a timeline) plus structured fields for filtering:

```python
from app.core.logging import display_user, get_logger, log_user_journey

logger = get_logger(__name__)
label = display_user(user)
log_user_journey(
    logger,
    "user_logged_in",
    f"User {label} just signed in for the first time.",
    user_id=user.id,
    email=user.email,
)
```

Example line (plain text):

```
event=user_logged_in user_id=3 email=alice@co.com ... description="User Alice just signed in for the first time."
```

With `LOG_JSON=true`, the same record includes top-level `"event"` and `"description"` keys for LogQL.

| Event | When |
|-------|------|
| `user_registered` | Account created |
| `user_logged_in` | Successful login |
| `user_department_selected` | Onboarding or profile department |
| `user_preferences_updated` | Settings / onboarding completion |
| `user_profile_updated` | Name, avatar, etc. |
| `user_opened_exercise` | Opened a task/project |
| `user_started_exercise` / `user_resumed_exercise` | Start or resume |
| `user_saved_notes` | Notes saved |
| `user_submitted_exercise` | Work submitted |
| `user_requested_peer_review` | Entered matching pool |
| `evaluation_slot_ready` | Submission needs evaluators |
| `user_browsed_peer_review_queue` | Viewed `/evaluations/available` |
| `users_matched` | Evaluator claimed a slot |

| Where | What you see |
|-------|----------------|
| Local `uvicorn` terminal | Human-readable lines with `[request_id]` and `description="..."` |
| Docker API container stdout | Same; Promtail ships to Loki when observability profile is on |
| **Grafana dashboard** | **http://localhost:3010/d/ai-skill-bridge-api** — auth, learning flow, errors panels |
| **Grafana Explore** | Ad-hoc LogQL, e.g. `{container="backend-api-1"} \|~ "user_logged_in"` or `\| json \| description != ""` |

Start the observability stack (Loki + Grafana + Promtail):

```bash
make up-obs    # or: make stack (includes API)
make grafana   # print dashboard URL
```

**After changing logging code:** rebuild/restart the **API** only (`make stack` or `docker compose --profile observability up --build -d api`). Loki/Promtail/Grafana do not need a rebuild — they ingest whatever the API prints.

When the API runs in Docker with log shipping, set **`LOG_JSON=true`** on the `api` service so Grafana can parse `event` and `description` as JSON fields.

---

## Seeding

The seed script is **idempotent** — safe to re-run at any time.

```bash
uv run python seed.py
```

Creates:
- One **admin** user (can promote others, access all endpoints)
- One **power user** (creates/edits/hides tasks and rubric items)
- **8 general learning tasks** (positions 0–7) with full rubrics

**Risk Management curriculum** (separate, idempotent):

```bash
uv run python seed_risk_curriculum.py
```

Adds 10 workshop tasks at positions 100+ with `category` as task type (`prompt_lab`, `vibecode_spa`, …) and `tools` including `track:risk-management` and `day:N`.

To promote an existing user to power user via API (requires admin token):

```bash
curl -X PATCH http://localhost:8000/users/{user_id}/role \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "power_user"}'
```

---

## Running tests

```bash
uv run pytest app/tests/ -v
```

Tests use an isolated SQLite database and cover the three matching invariants:
- A submission cannot accumulate more than `required_evaluations` evaluators
- Eligibility policy blocks unqualified evaluators (403)
- Submission reaches `completed` status exactly when the required count is met

---

## API reference

Interactive docs: **http://localhost:8000/docs** (Swagger UI with "Authorize" button)

### Core endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | — | Register a new user |
| `POST` | `/auth/login` | — | Login (form); returns access token + sets refresh cookie |
| `POST` | `/auth/refresh` | cookie | Issue new access token |
| `POST` | `/auth/logout` | — | Clear refresh cookie |
| `GET` | `/auth/me` | bearer | Current user (includes computed `level`) |
| `GET` | `/users/dashboard` | bearer | XP, level, and all earned badges |
| `GET` | `/tasks` | bearer | Task list with inline progress; `?include_hidden=true` for power users |
| `POST` | `/tasks` | power user | Create a task |
| `PATCH` | `/tasks/{id}` | power user | Edit / hide a task |
| `GET` | `/tasks/{id}/rubric` | bearer | Rubric form items for a task |
| `POST` | `/tasks/{id}/rubric` | power user | Add a rubric item (bool / scale / text) |
| `PATCH` | `/tasks/{id}/rubric/{item_id}` | power user | Edit rubric item |
| `DELETE` | `/tasks/{id}/rubric/{item_id}` | power user | Remove rubric item |
| `POST` | `/submissions` | bearer | Create a draft (multipart: `task_id`, `content`, optional `file`) |
| `PATCH` | `/submissions/{id}` | bearer | Edit draft content / replace file |
| `POST` | `/submissions/{id}/ready` | bearer | Lock draft and enter matching pool |
| `GET` | `/submissions/mine` | bearer | My submission history (`?task_id=` to filter) |
| `GET` | `/evaluations/available` | bearer | Submissions eligible to claim |
| `POST` | `/evaluations/claim` | bearer | Claim an evaluation slot |
| `GET` | `/evaluations/my` | bearer | Evaluations assigned to me |
| `POST` | `/evaluations/{id}/submit` | bearer | Submit rubric form + verdict + feedback |
| `GET` | `/evaluations/to-confirm` | bearer | Received feedback awaiting my confirmation |
| `POST` | `/evaluations/{id}/confirm` | bearer | Confirm whether feedback was helpful |

---

## Demo script (pitch checklist)

The judging demo requires showing five flows. Here is the exact sequence:

### 1 — Power user updates a task live
```
PATCH /tasks/1   {"title": "Summarise a meeting with AI (updated)"}
GET  /tasks      → confirm new title appears immediately
```

### 2 — Task submission flow
```
POST /auth/register   {"email": "alice@co.com", "password": "alice1234"}
POST /auth/login      → save access token
POST /submissions     task_id=1, content="My summary...", file=transcript.txt
GET  /submissions/mine?task_id=1  → status: draft
POST /submissions/{id}/ready      → status: ready (in pool)
```

### 3 — Automatic peer matching (pool → claim)
```
POST /auth/register   {"email": "bob@co.com", "password": "bob12345"}
POST /auth/login
GET  /evaluations/available  → Alice's submission appears
POST /evaluations/claim      {"submission_id": <alice_sub_id>}
GET  /submissions/{id}       → status: matched (Alice sees this on her dashboard)
```

The platform surfaces available submissions automatically based on the task's eligibility policy — this is the matching mechanism.

### 4 — Evaluation cycle and mutual feedback
```
POST /evaluations/{eval_id}/submit
  {
    "responses": [
      {"rubric_item_id": 1, "value_bool": true},
      {"rubric_item_id": 2, "value_scale": 4},
      {"rubric_item_id": 3, "value_bool": true},
      {"rubric_item_id": 4, "value_text": "Great reflection on AI limits."}
    ],
    "overall_pass": true,
    "feedback": "Clear summary with solid fact-checking."
  }
GET /submissions/{id}  → status: completed  (required_evaluations met)

# Alice's side:
GET /evaluations/to-confirm  → Bob's evaluation appears
POST /evaluations/{eval_id}/confirm  {"helpful": true}
```

### 5 — Personal progress with XP and levels
```
GET /auth/me         → {"xp": 150, "level": 0, ...}   (Alice got task.xp_reward)
GET /users/dashboard → {"xp": 150, "level": 0, "badges": [{"code": "FIRST_SUBMISSION"}, {"code": "TASK_COMPLETE"}]}

GET /auth/me (Bob)   → {"xp": 50, "level": 0, ...}    (+50 for submitting eval)
GET /users/dashboard (Bob) → badges: ["FIRST_EVAL"]
```

---

## Gamification

| Event | XP | Who |
|-------|----|-----|
| Submit an evaluation | +50 | Evaluator |
| Submission reaches `completed` | +`task.xp_reward` (default 100) | Evaluatee |

**Level** = `xp // 500` (computed, never stored separately).

**Badges** — event-based and milestone-based:

| Code | Trigger |
|------|---------|
| `FIRST_SUBMISSION` | First submission marked ready |
| `FIRST_EVAL` | First evaluation submitted |
| `EVAL_5` | 5 evaluations submitted |
| `EVAL_10` | 10 evaluations submitted |
| `TASK_COMPLETE` | First task completed |
| `TASK_5` | 5 tasks completed |
| `LEVEL_1` | Reach level 1 (500 XP) |
| `LEVEL_5` | Reach level 5 (2 500 XP) |
| `LEVEL_10` | Reach level 10 (5 000 XP) |

---

## Architecture

```
app/
  core/        config, DB session, JWT + bcrypt helpers, logging
  models/      SQLAlchemy 2.0 ORM  (User, Task, Submission,
               RubricItem, Evaluation, EvaluationResponse, UserBadge)
  schemas/     Pydantic request/response contracts
  api/         FastAPI routers  (auth, tasks, submissions, evaluations, users)
  services/    Business logic   (matching, evaluation, gamification)
  tests/       pytest
```

**Key design choices:**

- **Sync endpoints + Postgres** — simplest correct choice at 50–80 concurrent users.
- **Pull-based evaluation pool** — eligible evaluators browse `/evaluations/available` and claim a slot. The claim uses `SELECT … FOR UPDATE SKIP LOCKED` on Postgres so concurrent requests can never exceed `required_evaluations`.
- **Tasks are data** — the entire rubric form, evaluator guide, eligibility policy, and required evaluation count are power-user editable at runtime with no redeploy.
- **XP + badges in one transaction** — `grant_xp` is called before the final `db.commit()` in the evaluation service, so XP change, badge rows, and status transitions are atomic.
- **No leaderboards** — dashboard shows personal progress only.
