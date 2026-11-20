<div align="center">

<img src="docs/assets/logo.svg" width="96" height="96" alt="RevoTask logo: a sea-glass card moving into the Done column" />

# RevoTask

**Move work forward, one card at a time.**

A Trello-like task manager with a "sea glass" interface, built through a disciplined, spec-driven AI workflow.

<br />

[![Live demo](https://img.shields.io/badge/Live_demo-coming_soon-9FD8CB?style=for-the-badge&logo=vercel&logoColor=0E2A33&labelColor=0E2A33)](#live-demo-and-demo-account)
[![API](https://img.shields.io/badge/API-Flask_on_Vercel-9FD8CB?style=for-the-badge&logo=flask&logoColor=white&labelColor=0E2A33)](#deploy)
[![Docs](https://img.shields.io/badge/Docs-specs_%26_guidelines-9FD8CB?style=for-the-badge&logo=bookstack&logoColor=white&labelColor=0E2A33)](#project-documents)

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Flask](https://img.shields.io/badge/Flask-3-0E2A33?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

[![pytest](https://img.shields.io/badge/pytest-112_passed-2E7D74?style=flat-square&logo=pytest&logoColor=white)](#run-the-tests)
[![Jest](https://img.shields.io/badge/Jest-97_passed-2E7D74?style=flat-square&logo=jest&logoColor=white)](#run-the-tests)
[![Playwright](https://img.shields.io/badge/Playwright-12_passed-2E7D74?style=flat-square&logo=playwright&logoColor=white)](#run-the-tests)
[![Properties](https://img.shields.io/badge/correctness_properties-40%2F40_tested-2E7D74?style=flat-square)](specs/design.md)
[![Accessibility](https://img.shields.io/badge/axe-0_serious_issues-2E7D74?style=flat-square&logo=accessibleicon&logoColor=white)](frontend/e2e/visual.spec.ts)
[![Specs](https://img.shields.io/badge/specs-Kiro-F2B33D?style=flat-square)](specs/)

<br />

<picture>
  <source media="(prefers-color-scheme: light)" srcset="docs/screenshots/board-1280-light.png" />
  <img src="docs/screenshots/board-1280-dark.png" width="900" alt="The RevoTask board: a curved glass sidebar on the left and frosted To do, Doing and Done columns with assigned cards" />
</picture>

<sub>The board in the dark "Deep water" theme (the light "Shallows" theme shows if your GitHub uses light mode).</sub>

</div>

<br />

## Contents

- [Overview](#overview)
- [Live demo and demo account](#live-demo-and-demo-account)
- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [AI workflow summary](#ai-workflow-summary)
- [Run it locally](#run-it-locally)
- [Run the tests](#run-the-tests)
- [Deploy](#deploy)
- [Project structure](#project-structure)
- [Project documents](#project-documents)

## Overview

RevoTask lets a team plan work on boards. Members create columns and cards, move cards by drag and drop (or with a "Move to" control on touch screens), discuss work in card comments, and follow the cards assigned to them. Board admins also manage who can access a board and watch progress through analytics and notifications.

It has two parts, both on Vercel: a **Flask REST API** backed by **Supabase PostgreSQL**, and a **Next.js** app with a glassmorphism interface.

| Role | What they can do |
|---|---|
| **Board member** | View the board, create, edit, move and delete columns and cards, assign cards, comment, follow assigned cards, receive notifications |
| **Board admin** | Everything a member can do, plus rename and delete the board, add and remove members, and see analytics |

## Live demo and demo account

| | URL |
|---|---|
| 🌐 App | _add the frontend Vercel URL after deploying_ |
| 🔌 API | _add the API Vercel URL after deploying_ (health check: `/api/health`) |

Sign in with the shared demo account to explore a board that already has columns and cards:

<table>
  <tr>
    <td><b>Email</b></td>
    <td><code>ana.demo@revotask.test</code></td>
  </tr>
  <tr>
    <td><b>Password</b></td>
    <td><code>password123</code></td>
  </tr>
  <tr>
    <td><b>Role</b></td>
    <td>Admin of "Demo board" (To do, Doing, Done), so every feature is available</td>
  </tr>
</table>

> [!NOTE]
> The demo account is created by `backend/scripts/seed_demo.py`, so it exists wherever that script has run. Run it once against your local database, and once against Supabase after deploying (see [Deploy](#deploy)). It is a public test account: please don't change its email or password, and never reuse these credentials anywhere else. You can also register your own account in a few seconds.

## Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h4>🔐 Accounts and sessions</h4>
      Register and log in with an expiring JWT. The session survives page reloads (HttpOnly cookie), protected pages redirect to the login page, and you log out from the profile menu.
    </td>
    <td width="50%" valign="top">
      <h4>🗂️ Boards, roles and members</h4>
      A dashboard of every board you belong to. Admins rename and delete boards and add or remove members, and a board always keeps at least one admin.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>🧲 Columns and cards</h4>
      Add, rename, reorder and delete columns. Create, edit, assign and soft-delete cards. Moves use a FLOAT order, so each move updates one database row.
    </td>
    <td valign="top">
      <h4>🖐️ Drag and drop, on any device</h4>
      Native HTML5 drag and drop with an optimistic update that reverts if the server refuses, plus a keyboard and touch "Move to" control that runs the same move.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>💬 Comments</h4>
      Add, edit and delete your own comments in the card detail view. Edit and delete appear only on comments you wrote.
    </td>
    <td valign="top">
      <h4>🔎 My tasks and search</h4>
      The cards assigned to you, grouped by board, and a 300 ms debounced search across every board you can open (and none you can't).
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>🔔 Notifications</h4>
      A bell with an unread count, checked every 30 seconds. You're notified when you're added to a board, assigned a card, or someone comments on your card.
    </td>
    <td valign="top">
      <h4>📊 Analytics for admins</h4>
      Cards per column, cards completed this week, and each member's comments and assigned cards, computed with SQLAlchemy joins.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>🪟 Sea-glass interface</h4>
      A curved glass sidebar with nested navigation (an icon rail on tablets and a swipeable drawer on phones), dark and light themes, and layouts tested from 320 px to 3840 px.
    </td>
    <td valign="top">
      <h4>♿ Accessible by design</h4>
      Keyboard-reachable menus and dialogs, visible focus rings, contrast-checked design tokens, and support for reduced-motion, reduced-transparency, high-contrast and forced-colors settings.
    </td>
  </tr>
</table>

## Screenshots

<sub>Captured automatically by <code>frontend/e2e/visual.spec.ts</code> against a production build.</sub>

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/login-1280-dark.png" alt="Login page with the sea-glass board illustration" /><br /><sub><b>Login</b>: the one animated moment, a card gliding to Done</sub></td>
    <td width="50%"><img src="docs/screenshots/dashboard-1280-light.png" alt="Dashboard in the light theme with a New board tile and a board tile" /><br /><sub><b>Dashboard</b> in the light "Shallows" theme</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/drag-in-progress-1280-dark.png" alt="A card being dragged over the Done column, which shows a highlighted rim and a drop placeholder" /><br /><sub><b>Drag and drop</b>: lifted card, highlighted column and drop placeholder</sub></td>
    <td><img src="docs/screenshots/card-detail-1280-dark.png" alt="Card detail dialog with title, description, assignee and a comment" /><br /><sub><b>Card detail</b> with comments</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/notifications-1280-dark.png" alt="Notification bell with an unread badge and an open panel" /><br /><sub><b>Notifications</b> with an unread count</sub></td>
    <td><img src="docs/screenshots/my-tasks-1280-dark.png" alt="My tasks page listing assigned cards grouped by board, with a search field" /><br /><sub><b>My tasks</b>, grouped by board, with search</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/profile-1280-dark.png" alt="Profile page with a large avatar, activity chips and an account form" /><br /><sub><b>Profile</b> with a live preview</sub></td>
    <td><img src="docs/screenshots/register-1280-light.png" alt="Register page in the light theme" /><br /><sub><b>Register</b> in the light theme</sub></td>
  </tr>
</table>

<details>
<summary><b>📱 Mobile screenshots (375 px)</b></summary>
<br />
<table>
  <tr>
    <td><img src="docs/screenshots/login-375-dark.png" width="180" alt="Login on mobile" /><br /><sub>Login</sub></td>
    <td><img src="docs/screenshots/dashboard-375-dark.png" width="180" alt="Dashboard on mobile" /><br /><sub>Dashboard</sub></td>
    <td><img src="docs/screenshots/board-375-light.png" width="180" alt="Board on mobile with snapping columns" /><br /><sub>Board</sub></td>
    <td><img src="docs/screenshots/my-tasks-375-dark.png" width="180" alt="My tasks on mobile" /><br /><sub>My tasks</sub></td>
    <td><img src="docs/screenshots/profile-375-light.png" width="180" alt="Profile on mobile" /><br /><sub>Profile</sub></td>
  </tr>
</table>
</details>

## Architecture

```mermaid
flowchart LR
    U([Browser]) -->|HTTPS + HttpOnly session cookie| FE["Next.js 16 app<br/>Vercel"]
    FE -->|Server Components: Bearer JWT from cookie| API["Flask API<br/>Vercel Python function"]
    U -->|Client Components: Bearer JWT| API
    API -->|transaction pooler :6543| DB[("Supabase<br/>PostgreSQL")]
    DEV([Your machine]) -.->|flask db upgrade :5432| DB
```

- **Eight Flask Blueprints** (`auth`, `boards`, `columns`, `cards`, `comments`, `notifications`, `analytics`, `users`), each with `routes.py`, `service.py` and `schema.py`.
- Every response uses the same envelope: `{ "data": ... }` on success and `{ "error": "..." }` on failure.
- `proxy.ts` (the Next.js 16 name for middleware) redirects signed-out visitors before a protected page renders.

## Technologies

| Layer | Tools |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, react-hot-toast |
| **Backend** | Python 3.13, Flask, SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Flask-Cors, Marshmallow, psycopg 3, python-dotenv; Gunicorn for production-style local runs |
| **Database** | PostgreSQL on Supabase (local PostgreSQL or SQLite for development) |
| **Testing** | pytest + Hypothesis, Jest + React Testing Library + fast-check, Playwright + axe-core |
| **Deployment** | Vercel (Next.js app, and the Flask API as a Python function), Supabase |
| **AI tools** | Kiro and Kiro CLI (specs, steering, generation, tests, docs); Claude Code for review and implementation |

## AI workflow summary

```mermaid
flowchart LR
    A[Brief] --> B[Specs with Kiro] --> C[Critical review<br/>20 refinements] --> D[Steering guidelines<br/>committed first] --> E[Generate and review<br/>against guidelines] --> F[Violations fixed<br/>and documented] --> G[Tests and deployment]
```

1. **Brief.** `specs/brief.md` sets the overview, the two user roles, the core features, the tech stack and the non-functional requirements.
2. **Specs with Kiro.** Kiro turned the brief into `requirements.md` (EARS acceptance criteria), `design.md` and `tasks.md`. The first version is kept in `specs-history/v1/`.
3. **Critical review and refinement.** Every AI-generated document was checked against the brief and the grading rubric, and each gap was fixed with a targeted refinement prompt. `specs/CHANGELOG.md` records all 20 refinements with a before and an after. Examples: the login token lived only in memory, so a reload logged the user out; the folder paths did not match the rubric; the two user roles were missing; search returned other users' cards.
4. **Steering guidelines first.** `guidelines/` holds 33 rules (backend, database, frontend), each with a Rule, a Rationale and a RevoTask Example. They were committed before any code, and `scripts/check-guidelines-first.ps1` verifies that order in the git history.
5. **Generate, then review.** Code was generated task by task with the guidelines in context, and library APIs were checked against current documentation (Context7 and the Next.js docs bundled with the package). `guidelines/ai-comparison.md` compares the same prompt with and without guidelines: 8 violations dropped to 0.
6. **Violations documented.** `guidelines/violation-report.md` lists 6 violations found in generated code, each with the guideline it breaks and the fix.
7. **Tests.** Every one of the 40 correctness properties in `design.md` has a test. The tests also caught real bugs: a drag that could not start from a button, an accessibility name mismatch, colours that failed their own contrast targets, and an empty error message.

## Run it locally

> [!TIP]
> You need **Python 3.12+**, **Node.js 20+** and **PostgreSQL** (SQLite also works for a quick start).

```bash
git clone <your-repo-url> revotask
cd revotask
```

<details open>
<summary><b>1. Flask API</b></summary>

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # set DATABASE_URL, JWT_SECRET_KEY and FRONTEND_ORIGIN
flask --app wsgi db upgrade   # apply every migration
python scripts/seed_demo.py   # create the demo account and "Demo board"
flask --app wsgi run --port 5000
```

On Windows, port 5000 may be reserved by the system. If `flask run` reports "access permissions", use another port such as `--port 5050` and the same port in the frontend's `.env.local`.

</details>

<details open>
<summary><b>2. Next.js app</b></summary>

```bash
cd frontend
npm install
cp .env.example .env.local    # point NEXT_PUBLIC_API_BASE_URL and API_BASE_URL at the API
npm run dev                   # http://localhost:3000
```

Then sign in with the [demo account](#live-demo-and-demo-account).

</details>

## Run the tests

| Suite | Command | What it covers | Result |
|---|---|---|---|
| **Backend** | `cd backend && pytest -v` | Every route and error status, plus 25 Hypothesis properties at 100 examples each | ✅ 112 passed |
| **Frontend** | `cd frontend && npm test` | Components, pages and hooks, plus 13 fast-check properties | ✅ 97 passed |
| **End to end** | `cd frontend && npx playwright test` | 4 auth scenarios, the 8-step Kanban journey, layouts at 7 widths, axe scans | ✅ 12 passed |

<details>
<summary><b>More test commands</b></summary>

```bash
# Backend
HYPOTHESIS_PROFILE=quick pytest -v          # faster local run (15 examples per property)
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/revotask_test pytest -v   # against PostgreSQL

# End to end, against the live site
cd frontend
npx playwright install                       # download the browsers once
PLAYWRIGHT_BASE_URL=https://<your-app>.vercel.app \
PLAYWRIGHT_API_URL=https://<your-api>.vercel.app \
npx playwright test
npx playwright show-report                   # open the HTML report
npm run check:no-wait-for-timeout            # fails if any test uses waitForTimeout
```

Each Playwright run registers new users with unique emails, so it can run repeatedly against production. `PW_CHANNEL=chrome` runs the suite on your installed Google Chrome.

</details>

## Deploy

RevoTask uses **two Vercel projects** (the Next.js app and the Flask API) and **one Supabase project** (PostgreSQL).

<details open>
<summary><b>1. Database on Supabase</b></summary>

1. Create a Supabase project and note the database password.
2. In **Project Settings > Database > Connection string**, copy two URLs and add `?sslmode=require` to both:
   - the **transaction pooler** (port **6543**), which the deployed API uses;
   - the **session pooler** or direct connection (port **5432**), which migrations use.
3. Apply the migrations and create the demo account from your machine, over port 5432:

   ```bash
   cd backend
   export DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
   export JWT_SECRET_KEY=unused-for-migrations
   flask --app wsgi db upgrade
   python scripts/seed_demo.py
   ```

   Run `flask --app wsgi db upgrade` again before deploying any version that adds a migration.

</details>

<details open>
<summary><b>2. Flask API on Vercel</b></summary>

1. Create a Vercel project from this repository with the **root directory set to `backend`**. Vercel runs the Flask `app` exported by `wsgi.py`; `backend/vercel.json` keeps tests, migrations and scripts out of the bundle, and `.python-version` pins Python 3.13.
2. Set the environment variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the **transaction pooler** URL (port 6543) |
   | `JWT_SECRET_KEY` | a long random string |
   | `JWT_ACCESS_TOKEN_EXPIRES_HOURS` | `24` |
   | `FRONTEND_ORIGIN` | the frontend Vercel URL (add it after step 3) |

   On port 6543 the app automatically turns off prepared statements and client-side pooling, as Supabase's transaction pooler requires.
3. Deploy, and check that `https://<your-api>.vercel.app/api/health` returns `{"data": {"status": "ok"}}`.
4. Verify with Postman: import `docs/postman/RevoTask.postman_collection.json` and its environment, set `baseUrl` to the API URL, and run the collection (health, register, login, then one request per Blueprint).

</details>

<details open>
<summary><b>3. Next.js app on Vercel</b></summary>

1. Create a second Vercel project from this repository with the **root directory set to `frontend`**.
2. Set `NEXT_PUBLIC_API_BASE_URL` and `API_BASE_URL` to the API URL.
3. Deploy, then set `FRONTEND_ORIGIN` on the API project to this URL and redeploy the API.
4. Run the Playwright suite against the live URL and commit `frontend/playwright-report/`.
5. Optional: `python backend/scripts/latency_check.py https://<your-api>.vercel.app` checks that p95 latency stays under 500 ms. The first request after an idle period can be slower because of a serverless cold start.

</details>

## Project structure

```text
revotask/
├── specs/                  brief, requirements, design, tasks, CHANGELOG
├── guidelines/             backend, database and frontend rules, AI comparison, violation report
├── backend/
│   ├── app/blueprints/     auth · boards · columns · cards · comments · notifications · analytics · users
│   │                       (each with routes.py, service.py, schema.py)
│   ├── app/models/         SQLAlchemy models
│   ├── migrations/         Flask-Migrate
│   ├── scripts/            seed_demo.py, latency_check.py
│   └── tests/              pytest + Hypothesis
├── frontend/
│   ├── app/                pages, layouts, Server Actions      proxy.ts: route guard
│   ├── components/shared/  BaseButton, BaseBadge, BaseModal
│   ├── hooks/              useDragAndDrop, useNotifications, useErrorHandler, …
│   ├── lib/                apiClient, errors, toast, tokens, …
│   ├── __tests__/          Jest + React Testing Library + fast-check
│   └── e2e/                Playwright
└── docs/                   screenshots, Postman collection, logo
```

## Project documents

| Document | What it holds |
|---|---|
| [`specs/brief.md`](specs/brief.md) | Overview, roles, features, tech stack, non-functional requirements, design direction |
| [`specs/requirements.md`](specs/requirements.md) | 39 requirements with EARS acceptance criteria |
| [`specs/design.md`](specs/design.md) | Architecture, routes, UI/UX design system, 40 correctness properties, traceability |
| [`specs/tasks.md`](specs/tasks.md) | The implementation plan, with progress |
| [`specs/CHANGELOG.md`](specs/CHANGELOG.md) | 20 refinement rounds, each with a before and an after |
| [`guidelines/`](guidelines/) | Steering guidelines, the AI output comparison and the violation report |
| [`docs/postman/`](docs/postman/) | Postman collection and environment for the deployed API |

<br />

<div align="center">
<sub>Built for the RevoU Full Stack Software Engineering program, Module 4: AI Development.</sub>
</div>
