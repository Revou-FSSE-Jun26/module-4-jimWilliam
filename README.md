# RevoTask

RevoTask is a Trello-like task manager built through a disciplined, AI-assisted workflow. Teams create boards, organise work into columns, move cards by drag and drop (or with a "Move to" control on touch screens), discuss work in card comments, and track the cards assigned to them. Board admins manage who can access a board and follow progress through analytics and notifications.

It has two parts, both deployed on Vercel: a Flask REST API backed by a Supabase PostgreSQL database, and a Next.js app with a "sea glass" glassmorphism interface.

| | URL |
|---|---|
| Next.js app (Vercel) | _add after deploying_ |
| Flask API (Vercel) | _add after deploying_ |

![Board in the dark theme](docs/screenshots/board-1280-dark.png)

## Contents

- [AI workflow summary](#ai-workflow-summary)
- [Features](#features)
- [Technologies](#technologies)
- [Project structure](#project-structure)
- [Run it locally](#run-it-locally)
- [Run the tests](#run-the-tests)
- [Deploy](#deploy)
- [Screenshots](#screenshots)

## AI workflow summary

1. **Brief.** The project brief (`specs/brief.md`) sets the overview, user roles (board member, board admin), core features, tech stack and non-functional requirements.
2. **Specs with Kiro.** Kiro turned the brief into `requirements.md` (EARS acceptance criteria), `design.md` and `tasks.md`. The first output is kept in `specs-history/v1/`.
3. **Critical review and refinement.** Each AI-generated document was checked line by line against the brief and the grading rubric. Every gap was fixed with a targeted refinement prompt and recorded with a before and after in `specs/CHANGELOG.md` (20 entries across rounds v2, v2.1 and v3). Examples: the login token lived only in memory, so a reload logged the user out; the folder paths did not match the rubric; the two user roles were missing; search returned other users' cards.
4. **Steering guidelines first.** `guidelines/backend.md`, `database.md` and `frontend.md` hold 33 rules, each with a Rule, a Rationale and a RevoTask Example. They were committed before any code; `scripts/check-guidelines-first.ps1` verifies the order in the git history.
5. **Generate, then review against the guidelines.** Code was generated task by task from `tasks.md` with the guidelines in context, and current library APIs were checked against live documentation (Context7 and the Next.js docs bundled in `node_modules`). `guidelines/ai-comparison.md` compares the same prompt with and without guidelines: 8 violations dropped to 0.
6. **Violations documented and fixed.** `guidelines/violation-report.md` lists 6 violations found in generated code (for example, a removed focus ring, raw colour values instead of tokens, and missing error-status tests), each with the guideline it breaks and the fix.
7. **Tests and docs.** pytest (with Hypothesis property tests), Jest with React Testing Library (with fast-check properties), and Playwright cover the API, the components and the live user journeys. Every correctness property in `design.md` has a test. The tests also caught real bugs: a native drag that could not start from a button, an accessibility name mismatch, design tokens that failed their own contrast targets, an empty API error message, and a property that FLOAT ordering cannot satisfy at the limits of precision.

## Features

- **Authentication:** register, log in with a JWT that expires, stay signed in across page reloads (HttpOnly session cookie), log out from the profile menu; protected routes redirect to /login.
- **Boards and roles:** a dashboard of every board you belong to; admins rename and delete boards and add or remove members; a board always keeps at least one admin.
- **Columns:** add, rename, delete and reorder columns, using the FLOAT order strategy.
- **Cards:** create, edit, assign and soft-delete cards; move them by native HTML5 drag and drop or with the "Move to" control; moves are optimistic, revert on error, and update one database row.
- **Comments:** add, edit and delete your own comments in the card detail modal.
- **My tasks and search:** cards assigned to you, grouped by board, plus a 300 ms debounced search across your boards.
- **Notifications:** a bell with an unread count, polled every 30 seconds; notifications for being added to a board, being assigned a card, and new comments on your cards.
- **Analytics (admins):** cards per column, cards completed this week, and activity per member, computed with SQLAlchemy joins.
- **Profile:** update your name and email with a live preview and an unsaved-changes indicator.
- **Interface:** a curved glass sidebar with nested navigation (icon rail on tablets, swipeable drawer on phones), dark and light themes, optional animated background, a reduce-transparency setting, and layouts tested from 320 px to 3840 px.
- **Tests:** 111 pytest tests (including 25 Hypothesis property tests at 100 examples each), 88 Jest tests (including 13 fast-check properties), and a Playwright suite (4 auth scenarios, an 8-step Kanban journey, and visual and accessibility checks).

## Technologies

| Layer | Tools |
|---|---|
| Backend | Python, Flask, SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Flask-Cors, Marshmallow, PostgreSQL (psycopg 3), python-dotenv; Gunicorn for production-style local runs |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, react-hot-toast |
| Testing | pytest, Hypothesis, Jest, React Testing Library, fast-check, Playwright, axe-core |
| Deployment | Vercel (Next.js app, and the Flask API as a Python function), Supabase (PostgreSQL) |
| AI tools | Kiro and Kiro CLI (specs, steering, generation, tests and docs), with Claude Code used for review and implementation |

## Project structure

```
specs/            brief, requirements, design, tasks, CHANGELOG (copied from .kiro/specs/revotask)
guidelines/       backend.md, database.md, frontend.md, ai-comparison.md, violation-report.md
backend/
  app/blueprints/ auth, boards, columns, cards, comments, notifications, analytics, users
                  (each with routes.py, service.py, schema.py)
  app/models/     SQLAlchemy models        migrations/   Flask-Migrate
  tests/          pytest suite             scripts/      seed_demo.py, latency_check.py
frontend/
  app/            pages, layouts, Server Actions     proxy.ts   route guard
  components/shared/  BaseButton, BaseBadge, BaseModal
  hooks/          useDragAndDrop, useNotifications, useErrorHandler, …
  lib/            apiClient.ts, errors.ts, toast.ts, tokens.ts, …
  __tests__/      Jest + React Testing Library      e2e/   Playwright
docs/             screenshots, Postman collection
```

## Run it locally

You need Python 3.12 or newer, Node.js 20 or newer, and PostgreSQL (SQLite also works for a quick start).

### 1. Clone

```bash
git clone <your-repo-url> revotask
cd revotask
```

### 2. Flask API

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # then set DATABASE_URL, JWT_SECRET_KEY and FRONTEND_ORIGIN
flask --app wsgi db upgrade # applies every migration
python scripts/seed_demo.py # optional: demo account and board (credentials are in the script)
flask --app wsgi run --port 5000
```

On Windows, port 5000 can be reserved by the system. If `flask run` reports "access permissions", use another port, such as `--port 5050`, and use the same port in the frontend `.env.local`.

### 3. Next.js app

```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_BASE_URL and API_BASE_URL to the API URL
npm run dev                 # http://localhost:3000
```

## Run the tests

### Backend: pytest

```bash
cd backend
pytest -v                                   # 100 examples per property test
HYPOTHESIS_PROFILE=quick pytest -v          # faster local run (15 examples)
# Against PostgreSQL instead of in-memory SQLite:
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/revotask_test pytest -v
```

### Frontend: Jest and React Testing Library

```bash
cd frontend
npm test
```

### End to end: Playwright

```bash
cd frontend
npx playwright install                 # downloads the browsers (once)
PLAYWRIGHT_BASE_URL=https://<your-app>.vercel.app \
PLAYWRIGHT_API_URL=https://<your-api>.vercel.app \
npx playwright test                    # auth, Kanban journey, visual and accessibility
npx playwright show-report             # opens the HTML report
npm run check:no-wait-for-timeout      # fails if any test uses waitForTimeout
```

Each run registers new users with unique emails, so it can run repeatedly against production. `PW_CHANNEL=chrome` runs the suite on your installed Google Chrome instead of Playwright's own browser build.

## Deploy

RevoTask runs on two Vercel projects (the Next.js app and the Flask API) and one Supabase project (PostgreSQL).

### 1. Database on Supabase

1. Create a Supabase project and note the database password.
2. In **Project Settings > Database > Connection string**, copy two URLs and add `?sslmode=require` to both:
   - the **transaction pooler** (port **6543**), which the deployed API uses;
   - the **session pooler** or direct connection (port **5432**), which migrations use.
3. Apply the migrations from your machine over port 5432:

   ```bash
   cd backend
   DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require" \
   JWT_SECRET_KEY=unused-for-migrations flask --app wsgi db upgrade
   ```

   Run this again before deploying any version that adds a migration.

### 2. Flask API on Vercel

1. Create a Vercel project from this repository with the **root directory set to `backend`**. Vercel runs the Flask `app` exported by `wsgi.py`; `backend/vercel.json` keeps tests, migrations and scripts out of the function bundle, and `.python-version` pins Python 3.13.
2. Set the environment variables: `DATABASE_URL` (the **transaction pooler** URL, port 6543), `JWT_SECRET_KEY` (a long random string), `JWT_ACCESS_TOKEN_EXPIRES_HOURS=24`, and `FRONTEND_ORIGIN` (the frontend Vercel URL, added after step 3). On port 6543 the app turns off prepared statements and client-side pooling automatically, as Supabase's transaction pooler requires.
3. Deploy, then check that `https://<your-api>.vercel.app/api/health` returns `{"data": {"status": "ok"}}`.
4. Verify with Postman: import `docs/postman/RevoTask.postman_collection.json` and the environment, set `baseUrl` to the API URL, and run the collection (health, register, login, then one request per Blueprint).

### 3. Next.js on Vercel

1. Create a second Vercel project from this repository with the **root directory set to `frontend`**.
2. Set `NEXT_PUBLIC_API_BASE_URL` and `API_BASE_URL` to the API URL from step 2.
3. Deploy, then set `FRONTEND_ORIGIN` on the API project to this URL and redeploy the API.
4. Run the Playwright suite against the frontend URL and commit `frontend/playwright-report/`.
5. Optional: `python backend/scripts/latency_check.py https://<your-api>.vercel.app` checks that p95 latency stays under 500 ms (R30.1). The first request after an idle period can be slower because of a serverless cold start.

## Screenshots

These were captured by `e2e/visual.spec.ts` against a local production build. They will be retaken against the live URLs after deployment.

| Page | Desktop | Mobile |
|---|---|---|
| Login | ![Login](docs/screenshots/login-1280-dark.png) | ![Login mobile](docs/screenshots/login-375-dark.png) |
| Register | ![Register](docs/screenshots/register-1280-light.png) | ![Register mobile](docs/screenshots/register-375-light.png) |
| Dashboard | ![Dashboard](docs/screenshots/dashboard-1280-light.png) | ![Dashboard mobile](docs/screenshots/dashboard-375-dark.png) |
| Board detail | ![Board](docs/screenshots/board-1280-dark.png) | ![Board mobile](docs/screenshots/board-375-light.png) |
| Card detail with comments | ![Card detail](docs/screenshots/card-detail-1280-dark.png) | |
| My tasks | ![My tasks](docs/screenshots/my-tasks-1280-dark.png) | ![My tasks mobile](docs/screenshots/my-tasks-375-dark.png) |
| Profile | ![Profile](docs/screenshots/profile-1280-dark.png) | ![Profile mobile](docs/screenshots/profile-375-light.png) |
| Card being dragged | ![Drag](docs/screenshots/drag-in-progress-1280-dark.png) | |
| Notification bell with unread count | ![Notifications](docs/screenshots/notifications-1280-dark.png) | |

Still to add after deployment: the Postman run against the deployed API URL showing all 8 Blueprints, and the Playwright HTML report against the Vercel URL.
