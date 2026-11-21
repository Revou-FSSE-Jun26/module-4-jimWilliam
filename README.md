<div align="center">

<img src="docs/assets/logo.svg" width="96" height="96" alt="RevoTask logo: a sea-glass card moving into the Done column" />

# RevoTask

**Move work forward, one card at a time.**

A Trello-like task manager with a "sea glass" interface, built through a disciplined, spec-driven AI workflow.

<br />

[![Live demo](https://img.shields.io/badge/Live_demo-jwrevotask.vercel.app-9FD8CB?style=for-the-badge&logo=vercel&logoColor=0E2A33&labelColor=0E2A33)](https://jwrevotask.vercel.app)
[![API](https://img.shields.io/badge/API-Flask_on_Render-9FD8CB?style=for-the-badge&logo=flask&logoColor=white&labelColor=0E2A33)](https://revou-checkpoint-04.onrender.com/api/health)
[![Docs](https://img.shields.io/badge/Docs-specs_%26_guidelines-9FD8CB?style=for-the-badge&logo=bookstack&logoColor=white&labelColor=0E2A33)](#project-documents)

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Flask](https://img.shields.io/badge/Flask-3-0E2A33?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Render](https://img.shields.io/badge/API_on-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://render.com)
[![Vercel](https://img.shields.io/badge/App_on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Gunicorn](https://img.shields.io/badge/Gunicorn-27-499848?style=flat-square&logo=gunicorn&logoColor=white)](https://gunicorn.org)

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

RevoTask lets a team plan work on boards. Each board says what it is for and when it is due, and shows its progress as a level of liquid in the sidebar. Members create columns and cards, move cards by drag and drop (or with a "Move to" control on touch screens), format descriptions, attach images, set due dates, discuss work in comments, and follow the cards assigned to them. Board admins also configure the board, manage who can access it and watch progress through analytics and notifications.

The business view (objectives, scope, every requirement and decision, and each change requested during the build) is in the [Business Requirements Document](docs/brd/BRD-RevoTask.md).

It has two parts: a **Flask REST API** served by **Gunicorn on Render**, backed by **Supabase PostgreSQL**, and a **Next.js** app on **Vercel** with a glassmorphism interface.

| Role | What they can do |
|---|---|
| **Board member** | View the board; create, edit, move and delete columns and cards; assign cards and set due dates; comment; add notes, links and photos to the board; follow assigned cards; receive notifications |
| **Board admin** | Everything a member can do, plus set the board's purpose, deadline and colour, manage all columns from settings, rename and delete the board, add and remove members, and see analytics |

## Live demo and demo account

| | URL |
|---|---|
| 🌐 App | **[jwrevotask.vercel.app](https://jwrevotask.vercel.app)** |
| 🔌 API | [revou-checkpoint-04.onrender.com](https://revou-checkpoint-04.onrender.com) · health check: [`/api/health`](https://revou-checkpoint-04.onrender.com/api/health) |

> [!TIP]
> The API runs on Render's free plan, which sleeps after 15 minutes without traffic. If the app seems slow to log in, open the [health check](https://revou-checkpoint-04.onrender.com/api/health) first and wait about a minute for it to wake.

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
      <h4>🗂️ Boards with a purpose</h4>
      Give each board a goal, a deadline, a colour (presets or any hue) and its own columns (add "Ideas" before "To do", drag to reorder, rename). Cards get due dates that turn amber when close and red when late. "About this board" keeps shared notes, links to recordings and documents, and photos. A liquid progress level shows in the sidebar. Admins rename and delete boards and add or remove members, and a board always keeps at least one admin.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>🧲 Columns and cards</h4>
      Add, rename, reorder and delete columns. Create, edit, assign and soft-delete cards. Moves use a FLOAT order, so each move updates one database row.
    </td>
    <td valign="top">
      <h4>🖐️ A full-screen board, on any device</h4>
      Columns run the full height of the screen and scroll sideways with the mouse wheel, arrows or a dock of column chips. Native drag and drop with an optimistic update, plus a keyboard and touch "Move to" control.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>💬 Rich descriptions and comments</h4>
      Format card descriptions with a full toolbar (bold, italic, underline, headings, lists, quotes, code, links), sanitised on the server. Add, edit and delete your own comments.
    </td>
    <td valign="top">
      <h4>🔎 My tasks and search</h4>
      The cards assigned to you, grouped by board, and a 300 ms debounced search across every board you can open (and none you can't).
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>🔔 Notifications and the Tide clock</h4>
      A bell with an unread count, checked every 30 seconds. Above your profile, the Tide clock shows the time, the date and your assigned cards, and the sidebar's waves rise towards 15:00 and ebb overnight.
    </td>
    <td valign="top">
      <h4>📊 Analytics for admins</h4>
      Cards per column, cards completed this week, and each member's comments and assigned cards, computed with SQLAlchemy joins.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>🖼️ Profile photos and card images</h4>
      Upload a profile photo or attach up to 10 images to a card. Every image is converted to AVIF (the original is never kept), served through short-lived signed links, and shown in a lightbox that blocks right-click and drag-to-save.
    </td>
    <td valign="top">
      <h4>🛡️ Safe uploads</h4>
      Only real images up to 4 MB and 40 megapixels are accepted. Re-encoding strips EXIF data such as GPS positions, and only the uploader or a board admin can remove an attachment.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>🪟 Sea-glass interface</h4>
      A full-height curved glass sidebar with a lit rim and nested navigation that collapses to an icon rail (automatically on tablets, by choice on wide screens; a swipeable drawer on phones). A slowly moving underwater background (pause it in the profile menu), dark and light themes, smooth staggered entrances, one-scroll dialogs that become bottom sheets on phones, and layouts tested from 320 px to 3840 px.
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
    <td width="50%"><img src="docs/screenshots/login-1280-dark.png" alt="Login page with the sea-glass board illustration" /><br /><sub><b>Login</b>: a card gliding to Done</sub></td>
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
    FE -->|Server Components: Bearer JWT from cookie| API["Flask API<br/>Gunicorn on Render"]
    U -->|Client Components: Bearer JWT| API
    API -->|session pooler :5432, pooled| DB[("Supabase<br/>PostgreSQL")]
    DEV([Your machine]) -.->|flask db upgrade :5432| DB
```

- **Eight Flask Blueprints** from the brief (`auth`, `boards`, `columns`, `cards`, `comments`, `notifications`, `analytics`, `users`) plus `media` for card images and signed image links, each with `routes.py`, `service.py` and `schema.py`.
- **Images in PostgreSQL:** Render's filesystem is reset on every deploy, so uploads are stored as small AVIF files in Supabase and served from `/api/media/<id>` with an HMAC-signed, one-to-two-hour URL.
- Every response uses the same envelope: `{ "data": ... }` on success and `{ "error": "..." }` on failure.
- `proxy.ts` (the Next.js 16 name for middleware) redirects signed-out visitors before a protected page renders.

## Technologies

| Layer | Tools |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TipTap 3 (rich-text editor), react-hot-toast |
| **Backend** | Python 3.13, Flask, SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Flask-Cors, Marshmallow, psycopg 3, Pillow (AVIF), nh3 (HTML sanitiser), python-dotenv; Gunicorn (the production server on Render) |
| **Database** | PostgreSQL on Supabase (local PostgreSQL or SQLite for development) |
| **Testing** | pytest + Hypothesis, Jest + React Testing Library + fast-check, Playwright + axe-core |
| **Deployment** | Render (Flask API on Gunicorn, `render.yaml` Blueprint), Vercel (Next.js app), Supabase (PostgreSQL) |
| **AI tools** | Kiro and Kiro CLI (specs, steering, generation, tests, docs); Claude Code for review and implementation |

## AI workflow summary

```mermaid
flowchart LR
    A[Brief] --> B[Specs with Kiro] --> C[Critical review<br/>28 refinements] --> D[Steering guidelines<br/>committed first] --> E[Generate and review<br/>against guidelines] --> F[Violations fixed<br/>and documented] --> G[Tests and deployment]
```

1. **Brief.** `specs/brief.md` sets the overview, the two user roles, the core features, the tech stack and the non-functional requirements.
2. **Specs with Kiro.** Kiro turned the brief into `requirements.md` (EARS acceptance criteria), `design.md` and `tasks.md`. The first version is kept in `specs-history/v1/`.
3. **Critical review and refinement.** Every AI-generated document was checked against the brief and the grading rubric, and each gap was fixed with a targeted refinement prompt. `specs/CHANGELOG.md` records all 28 refinements with a before and an after. Examples: the login token lived only in memory, so a reload logged the user out; the folder paths did not match the rubric; the two user roles were missing; search returned other users' cards.
4. **Steering guidelines first.** `guidelines/` holds 33 rules (backend, database, frontend), each with a Rule, a Rationale and a RevoTask Example. They were committed before any code, and `scripts/check-guidelines-first.ps1` verifies that order in the git history.
5. **Generate, then review.** Code was generated task by task with the guidelines in context, and library APIs were checked against current documentation (Context7 and the Next.js docs bundled with the package). `guidelines/ai-comparison.md` compares the same prompt with and without guidelines: 8 violations dropped to 0.
6. **Violations documented.** `guidelines/violation-report.md` lists 6 violations found in generated code, each with the guideline it breaks and the fix.
7. **Tests.** Every one of the 56 correctness properties in `design.md` has a test. The tests also caught real bugs: a drag that could not start from a button, an accessibility name mismatch, colours that failed their own contrast targets, and an empty error message.

## Run it locally

> [!TIP]
> You need **Python 3.12+**, **Node.js 26** (the version Vercel builds with, pinned in `frontend/package.json` `engines`) and **PostgreSQL** (SQLite also works for a quick start).

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
cp -n .env.example .env       # first time only (-n never overwrites); then set DATABASE_URL, JWT_SECRET_KEY, FRONTEND_ORIGIN
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
| **Backend** | `cd backend && pytest -v` | Every route and error status, plus 32 Hypothesis properties | ✅ 147 passed |
| **Frontend** | `cd frontend && npm test` | Components, pages and hooks, plus 21 fast-check properties | ✅ 131 passed |
| **End to end** | `cd frontend && npx playwright test` | 4 auth scenarios, the 8-step Kanban journey, photo and image uploads, the full-height board and clock, board settings and About, due dates and the collapsible sidebar, layouts at 7 widths, axe scans | ✅ 17 passed |

<details>
<summary><b>More test commands</b></summary>

```bash
# Backend
HYPOTHESIS_PROFILE=quick pytest -v          # faster local run (15 examples per property)
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/revotask_test pytest -v   # against PostgreSQL

# End to end, against the live site
cd frontend
npx playwright install                       # download the browsers once
PLAYWRIGHT_BASE_URL=https://jwrevotask.vercel.app \
PLAYWRIGHT_API_URL=https://revou-checkpoint-04.onrender.com \
npx playwright test
npx playwright show-report                   # open the HTML report
npm run check:no-wait-for-timeout            # fails if any test uses waitForTimeout
```

Each Playwright run registers new users with unique emails, so it can run repeatedly against production. `PW_CHANNEL=chrome` runs the suite on your installed Google Chrome.

</details>

## Deploy

RevoTask runs on three services: **Supabase** (PostgreSQL), **Render** (the Flask API, served by Gunicorn) and **Vercel** (the Next.js app).

<details open>
<summary><b>1. Database on Supabase</b></summary>

1. Create a Supabase project and note the database password.
2. Click **Connect** and copy the **Session pooler** connection string (port **5432**). Add `?sslmode=require` to it. The session pooler works over IPv4, which Render needs; the direct connection (`db.<ref>.supabase.co`) is IPv6 unless your project has the IPv4 add-on.
3. Create the demo account once from your machine (the Render build applies the migrations, but you can also run them here first):

   ```bash
   cd backend
   export DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
   export JWT_SECRET_KEY=unused-for-migrations
   flask --app wsgi db upgrade
   python scripts/seed_demo.py
   ```

</details>

<details open>
<summary><b>2. Flask API on Render (Gunicorn)</b></summary>

1. In the Render Dashboard choose **New > Blueprint**, pick this repository, and Render reads [`render.yaml`](render.yaml). It creates the `revotask-api` web service with:

   | Setting | Value |
   |---|---|
   | Root directory | `backend` |
   | Build command | `pip install -r requirements.txt && flask --app wsgi db upgrade` (migrations run on every deploy) |
   | Start command | `gunicorn wsgi:app --config gunicorn.conf.py` (threaded workers on `$PORT`, see [`backend/gunicorn.conf.py`](backend/gunicorn.conf.py)) |
   | Health check | `/api/health` |
   | Python | 3.13 (`PYTHON_VERSION`) |

2. Render asks for the secret values:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase **session pooler** URL from step 1 |
   | `FRONTEND_ORIGIN` | the frontend Vercel URL (you can fill it in after step 3, then redeploy) |

   `JWT_SECRET_KEY` is generated by Render. `WEB_CONCURRENCY` (Gunicorn workers, default 2), `GUNICORN_THREADS` (4), `DB_POOL_SIZE` (3) and `DB_MAX_OVERFLOW` (2) can be tuned without code changes; keep workers × (pool + overflow) under the session pooler's connection limit.
3. Once deployed, check that `https://<your-api>.onrender.com/api/health` returns `{"data": {"status": "ok"}}` (for this project: [https://revou-checkpoint-04.onrender.com/api/health](https://revou-checkpoint-04.onrender.com/api/health)).

   If the deploy log says **`JWT_SECRET_KEY is not set`** or **`DATABASE_URL is not set on Render`**, the service was probably created as a plain Web Service rather than from the Blueprint. Open the service's **Environment** tab and add the missing variables (`JWT_SECRET_KEY`: any long random string, e.g. from `python -c "import secrets; print(secrets.token_urlsafe(48))"`), then redeploy. The `.env` file is never uploaded, so locally set values do not reach Render.
4. Verify with Postman: import `docs/postman/RevoTask.postman_collection.json` and its environment, set `baseUrl` to the API URL, and run the collection (health, register, login, then one request per Blueprint).

> [!NOTE]
> On Render's **free** plan the service sleeps after 15 minutes without traffic, and the next request takes about a minute while it wakes. Paid instance types stay awake and can run the migrations as a **pre-deploy command** instead of in the build (move `flask --app wsgi db upgrade` from `buildCommand` to `preDeployCommand` in `render.yaml`).

</details>

<details open>
<summary><b>3. Next.js app on Vercel</b></summary>

1. Create a Vercel project from this repository with the **root directory set to `frontend`**. [`frontend/vercel.json`](frontend/vercel.json) runs its server functions in **Singapore (`sin1`)**, next to the Render API, because every server-rendered page calls the API; if your Render service is in another region, change `regions` to the closest Vercel region.
2. Set `NEXT_PUBLIC_API_BASE_URL` and `API_BASE_URL` to the Render API URL (`https://<your-api>.onrender.com`; for this project `https://revou-checkpoint-04.onrender.com`).
3. Deploy, then set `FRONTEND_ORIGIN` on the Render service to the Vercel URL and redeploy the API.
4. Run the Playwright suite against the live URLs and commit `frontend/playwright-report/`.
5. Optional: `python backend/scripts/latency_check.py https://revou-checkpoint-04.onrender.com` checks that p95 latency stays under 500 ms. It wakes a sleeping instance first and does not count that request.

</details>

## Project structure

```text
revotask/
├── render.yaml             Render Blueprint for the API (Gunicorn)
├── specs/                  brief, requirements, design, tasks, CHANGELOG
├── guidelines/             backend, database and frontend rules, AI comparison, violation report
├── backend/
│   ├── app/blueprints/     auth · boards · columns · cards · comments · notifications · analytics · users · media
│   │                       (each with routes.py, service.py, schema.py)
│   ├── app/common/         access checks, images (AVIF), signed media links, rich-text sanitiser
│   ├── app/models/         SQLAlchemy models
│   ├── migrations/         Flask-Migrate
│   ├── gunicorn.conf.py    Gunicorn settings (workers, threads, $PORT)
│   ├── scripts/            seed_demo.py, latency_check.py
│   └── tests/              pytest + Hypothesis
├── frontend/
│   ├── app/                pages, layouts, Server Actions      proxy.ts: route guard
│   ├── components/         board, layout, profile, shared (BaseButton, BaseModal, RichTextEditor, …)
│   ├── hooks/              useDragAndDrop, useNotifications, useErrorHandler, …
│   ├── lib/                apiClient, errors, toast, tokens, …
│   ├── __tests__/          Jest + React Testing Library + fast-check
│   └── e2e/                Playwright
└── docs/                   BRD and template, screenshots, Postman collection, logo
```

## Project documents

| Document | What it holds |
|---|---|
| [`specs/brief.md`](specs/brief.md) | Overview, roles, features, tech stack, non-functional requirements, design direction |
| [`docs/brd/BRD-RevoTask.md`](docs/brd/BRD-RevoTask.md) | Business Requirements Document: objectives, scope, 31 business requirements traced to R1–R53, decisions, every owner request and its outcome, risks, open items |
| [`docs/brd/BRD-template.md`](docs/brd/BRD-template.md) | The same structure, blank, with the questions to settle early on a new project |
| [`specs/requirements.md`](specs/requirements.md) | 53 requirements with EARS acceptance criteria |
| [`specs/design.md`](specs/design.md) | Architecture, routes, UI/UX design system, 56 correctness properties, traceability |
| [`specs/tasks.md`](specs/tasks.md) | The implementation plan, with progress |
| [`specs/CHANGELOG.md`](specs/CHANGELOG.md) | 28 refinements, each with a before and an after |
| [`guidelines/`](guidelines/) | Steering guidelines, the AI output comparison and the violation report |
| [`docs/postman/`](docs/postman/) | Postman collection and environment for the deployed API |

<br />

<div align="center">
<sub>Built for the RevoU Full Stack Software Engineering program, Module 4: AI Development.</sub>
</div>
