# okrapp

A simple OKR app for doing OKRs, and nothing else. Doesn't track progress, but that's coming soon

<img width="948" height="976" alt="Screenshot 2026-03-10 at 10 30 31 AM" src="https://github.com/user-attachments/assets/4bb29884-d750-4b6f-aeb8-786ddc9597f4" />


## Stack

- **Backend**: FastAPI + SQLAlchemy + Alembic + Postgres
- **Frontend**: React + Vite + TypeScript + Tailwind + shadcn/ui
- **Auth**: Auth0 (RS256 JWT)
- **Task queue**: Celery + Redis
- **Deployment**: Docker + docker-compose

---

## Prerequisites

- Docker + Docker Compose
- Node 22+ (for local frontend dev)
- Python 3.12+ with `uv` (for local backend dev)

---

## Environment variables

Copy the examples and fill in your Auth0 credentials:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### `backend/.env`

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `AUTH0_DOMAIN` | Auth0 tenant domain (e.g. `rmi.auth0.com`) |
| `AUTH0_API_AUDIENCE` | Auth0 API identifier (e.g. `https://rokr-api`) |
| `ADMIN_EMAILS` | JSON array of admin email addresses |
| `CORS_ORIGINS` | JSON array of allowed frontend origins |
| `CELERY_BROKER_URL` | Redis URL for Celery broker |
| `CELERY_RESULT_BACKEND` | Redis URL for Celery results |
| `POSTGRES_PASSWORD` | Postgres password (used by docker-compose) |

### `frontend/.env`

| Variable | Description |
|----------|-------------|
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA client ID |
| `VITE_AUTH0_AUDIENCE` | Auth0 API audience (must match backend) |
| `VITE_API_BASE_URL` | Backend API base URL |

### Auth0 setup (one-time)

1. Create a **Single Page Application** in Auth0 → get `VITE_AUTH0_CLIENT_ID` and `VITE_AUTH0_DOMAIN`
2. Set Allowed Callback URLs: `http://localhost:5173/callback`
3. Set Allowed Logout URLs: `http://localhost:5173`
4. Set Allowed Web Origins: `http://localhost:5173`
5. Create an **API** → set identifier (e.g. `https://rokr-api`) → use RS256 signing
6. Use the API identifier as `AUTH0_API_AUDIENCE` / `VITE_AUTH0_AUDIENCE`

---

## Run with Docker Compose

```bash
docker compose up
```

This starts:
- `db` — Postgres 17
- `redis` — Redis 7
- `backend` — FastAPI (runs `alembic upgrade head` then starts uvicorn on :8000)
- `celery` — Celery worker
- `frontend` — Vite dev server on :5173

Open http://localhost:5173

---

## Connect to the database

**Via Docker (while `docker compose up` is running):**

```bash
docker compose exec db psql -U rokr -d rokr
```

**Via psql on your host (Postgres must be exposed on port 5432):**

```bash
psql postgresql://rokr:secret@localhost:5432/rokr
```

Useful psql commands once connected:

```sql
\dt                       -- list tables
\d users                  -- describe a table
SELECT * FROM users;      -- query data
SELECT * FROM alembic_version; -- check which migration has run
\q                        -- quit
```

If `\dt` shows no tables, the migration hasn't run. Run it manually:

```bash
docker compose exec backend alembic upgrade head
```

---

## Run tests

```bash
# Start Postgres first (or point TEST_DATABASE_URL at an existing instance)
docker compose up db -d

# Create the test database
docker compose exec db psql -U rokr -c "CREATE DATABASE rokr_test;"

# Install dev deps and run tests
cd backend
uv venv .venv --python 3.12
uv pip install --python .venv/bin/python -e ".[dev]"
TEST_DATABASE_URL=postgresql://rokr:secret@localhost:5432/rokr_test .venv/bin/pytest -v
```

---

## Local development (without Docker)

### Backend

```bash
cd backend
uv venv .venv --python 3.12
uv pip install --python .venv/bin/python -e ".[dev]"
# Set DATABASE_URL to a local Postgres instance in backend/.env
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
