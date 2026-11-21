# Business Requirements Document: RevoTask

| | |
|---|---|
| **Product** | RevoTask, a team task board (Kanban) for small teams |
| **Document** | Business Requirements Document (BRD) |
| **Version** | 1.1 |
| **Date** | 21 November 2026 |
| **Status** | Deployed. Live checks and the demo account on the live database are open (see [Open items](#12-open-items)) |
| **Live** | App: [https://jwrevotask.vercel.app](https://jwrevotask.vercel.app) · API: [https://revou-checkpoint-04.onrender.com](https://revou-checkpoint-04.onrender.com) |
| **Owner** | Project owner (RevoU FSSE Module 4) |
| **Source documents** | [`specs/brief.md`](../../specs/brief.md), [`specs/requirements.md`](../../specs/requirements.md) (R1–R53), [`specs/design.md`](../../specs/design.md), [`specs/tasks.md`](../../specs/tasks.md), [`specs/CHANGELOG.md`](../../specs/CHANGELOG.md) |

This BRD says **what the business needs and why**. The detailed behaviour lives in `specs/requirements.md` (53 requirements written as EARS acceptance criteria) and the technical answer in `specs/design.md`. Every business requirement below points to the requirements that fulfil it. A blank, reusable version of this document is in [`BRD-template.md`](BRD-template.md).

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [Background and problem](#2-background-and-problem)
3. [Objectives and success measures](#3-objectives-and-success-measures)
4. [Scope](#4-scope)
5. [Stakeholders and users](#5-stakeholders-and-users)
6. [Business requirements](#6-business-requirements)
7. [Non-functional requirements](#7-non-functional-requirements)
8. [Assumptions, constraints and dependencies](#8-assumptions-constraints-and-dependencies)
9. [Key decisions and trade-offs](#9-key-decisions-and-trade-offs)
10. [Owner requests and how they were resolved](#10-owner-requests-and-how-they-were-resolved)
11. [Risks](#11-risks)
12. [Open items](#12-open-items)
13. [Acceptance and sign-off](#13-acceptance-and-sign-off)
14. [Glossary](#14-glossary)

---

## 1. Executive summary

Small teams keep losing track of who is doing what, what is late, and why a piece of work exists at all. RevoTask gives each team **boards** split into **columns** (stages of work) holding **cards** (tasks). Cards move between stages by drag and drop, carry a formatted description, images, comments, an assignee and a due date. Each board states its **purpose** and **deadline**, keeps shared **notes, links and photos**, and shows its **progress** as a level of liquid in the sidebar.

The product was built for the RevoU FSSE Module 4 assignment with a spec-driven, AI-assisted workflow (Kiro for specs, Claude Code for review and implementation). It runs on Render (API, served by Gunicorn) and Vercel (web app) with a Supabase PostgreSQL database, and has a calm "sea glass" interface that works from a 320 px phone to a 4K monitor and passes automated accessibility checks.

## 2. Background and problem

**Context.** The course assignment asks for a Trello-like app with a Flask REST API (eight blueprints), a Next.js frontend, written specs, steering guidelines, automated tests, a deployment and a README, produced with an AI-assisted workflow whose decisions are documented.

**Problems the product solves:**

| # | Problem | Who feels it |
|---|---|---|
| P1 | Work is scattered across chats and documents, so nobody sees the state of a project at a glance. | Whole team |
| P2 | It is unclear who owns a task and when it is due, so tasks slip silently. | Members, admins |
| P3 | Discussion about a task is separated from the task, so decisions get lost. | Members |
| P4 | Teams forget *why* a board exists and what the target date is. | Whole team |
| P5 | Admins cannot see progress or workload without asking people. | Admins |
| P6 | Many tools look cluttered and are hard to use on a phone or with a keyboard or screen reader. | Everyone |

## 3. Objectives and success measures

| ID | Objective | Success measure | Status |
|---|---|---|---|
| O1 | Meet every requirement of the course brief and rubric. | All brief features delivered; specs, guidelines, tests, README and deployment present. | Met, except the live deployment checks (O1-a, O1-b below). |
| O2 | Make the state of every board visible at a glance. | Progress, deadline, purpose and overdue cards visible without opening a card. | Met (R44–R51). |
| O3 | Keep every decision about a task next to the task. | Description, images, comments and due date live on the card. | Met (R6, R16, R40–R42, R51). |
| O4 | Be fast. | API p95 latency under 500 ms; a card move updates one database row. | Met locally; live check pending (O1-a). |
| O5 | Be usable by everyone. | No serious or critical axe violations on any page in either theme; full keyboard use; reduced-motion and forced-colours support. | Met (R39, R52). |
| O6 | Work on any screen. | No page-level horizontal scrolling at 320, 375, 768, 1280, 1920, 2560 and 3840 px. | Met (R38). |
| O7 | Be safe with user content. | Sanitised HTML, image re-encoding, signed image links, role checks on every route. | Met (R40–R43, R47). |
| O8 | Leave a reusable, documented process. | Specs with a change log, steering guidelines, an AI comparison, a violation report and this BRD. | Met. |

O1-a: latency check against the live API. O1-b: Playwright run against the live site.

## 4. Scope

### In scope

- Accounts: register, log in, stay signed in across reloads, log out, profile with photo.
- Boards with per-board roles (admin, member), membership management, purpose, deadline, colour, notes, links, photos, progress and analytics.
- Columns: add anywhere, rename, reorder (drag or arrows), delete.
- Cards: create, edit, rich-text description, assignee, due date, image attachments, comments, soft delete, drag and drop and a keyboard and touch "Move to" control.
- My Tasks with debounced search; notifications with an unread count.
- Navigation: full-height sidebar that can collapse, board list with progress, Tide clock, phone drawer.
- Design system: "sea glass" glassmorphism, dark and light themes, motion with reduced-motion support.
- Delivery: specs, guidelines, automated tests (unit, property, component, end-to-end, visual and accessibility), deployment configuration, README.

### Out of scope (this release)

| Item | Why it is out |
|---|---|
| Due-date reminder notifications ("due tomorrow") | Needs a scheduled job (a Render cron job, a paid service) and an email or push channel; and the free web service sleeps when idle, so it cannot schedule its own reminders. |
| Uploading recordings, videos and documents | Uploads are limited to 4 MB and media is stored in the database (the API's filesystem is ephemeral); such files are pinned as links instead. |
| Real-time collaboration (live updates without polling) | Notifications poll every 30 s, which the brief asks for; live updates would need websockets and a message channel between Gunicorn workers. |
| Card checklists, labels, recurring tasks, time tracking | Not in the brief; candidates for a later release. |
| Email sending (invites, password reset) | No email service in the stack; members are added by an existing account's email. |
| Native mobile apps | The responsive web app covers phones. |

## 5. Stakeholders and users

### Stakeholders

| Stakeholder | Interest | Involvement |
|---|---|---|
| Project owner (student) | Delivers the assignment; decides scope and design. | Raised every change request in [section 10](#10-owner-requests-and-how-they-were-resolved). |
| RevoU reviewers | Grade against the brief and rubric. | Read the README, specs, guidelines and tests; try the demo account. |
| Team members (end users) | Track and finish work. | Use boards daily. |
| Team leads (board admins) | Run a board and its people. | Configure boards, read analytics. |

### User roles

Roles are set per board: the same person can be admin of one board and member of another.

| Role | Can do |
|---|---|
| Visitor | Register and log in. |
| Board member | View the board; add, edit, move and delete columns and cards; assign cards; set due dates; comment (and edit or delete their own comments); add notes, links and photos to the board and images to cards (and remove their own); see My Tasks and notifications. |
| Board admin | Everything a member can do, plus: rename, configure (purpose, deadline, colour) and delete the board; manage columns from settings; add and remove members and set roles; remove anyone's links and images; view analytics. A board always keeps at least one admin. |

## 6. Business requirements

Priority uses MoSCoW: **M**ust, **S**hould, **C**ould. "Source" says where the need came from: the course **brief**, the **owner** during the build, or the **review** of the AI-generated specs.

### 6.1 Accounts and access

| ID | Requirement | Priority | Source | Fulfilled by |
|---|---|---|---|---|
| BR-01 | Users register with name, email and password, and log in to a session that expires. Passwords are stored only as salted hashes. | M | Brief | R1, R12 |
| BR-02 | A session survives a page reload and ends cleanly on logout; signed-out visitors are sent to the login page before a protected page renders. | M | Review | R32 |
| BR-03 | Every action checks that the user belongs to the board and, where needed, is its admin. Missing items return "not found" before "forbidden". | M | Brief, review | R31, R11 |
| BR-04 | Users edit their name and email and can add, change or remove a profile photo. The photo can be opened full size but is protected against casual saving. | S | Owner | R9, R18, R36, R41 |

### 6.2 Boards and membership

| ID | Requirement | Priority | Source | Fulfilled by |
|---|---|---|---|---|
| BR-05 | A dashboard lists every board the user belongs to, with their role, card and member counts, purpose, deadline and colour. | M | Brief, owner | R2, R13, R47, R48, R51 |
| BR-06 | Admins add members by email, set their role and remove them; a board always keeps one admin. | M | Brief | R31 |
| BR-07 | Each board states its **purpose** (one line, up to 280 characters) and optional **deadline**, shown under the board title to every member with the days left. | S | Owner | R47, R51 |
| BR-08 | Each board has a **colour** (eight named colours, automatic, or any custom hue) used for its dot, progress and tile. | C | Owner | R48 |
| BR-09 | "About this board" keeps shared **notes** (formatted), **links** (recordings, documents) and **photos** for every member. | S | Owner | R47 |
| BR-10 | The sidebar shows each board's **progress**: the share of cards in the last column, as a liquid level that updates as cards move. | C | Owner | R46 |
| BR-11 | Admins see analytics: cards per column, cards completed this week, and each member's comments and assigned cards. | M | Brief | R8 |

### 6.3 Columns and cards

| ID | Requirement | Priority | Source | Fulfilled by |
|---|---|---|---|---|
| BR-12 | Members add, rename, reorder and delete columns. New columns can go anywhere (for example "Ideas" before "To do"). Admins manage all columns in one place, including by dragging. | M | Brief, owner | R3, R49 |
| BR-13 | Members create, edit, assign and delete cards. Deleting is reversible in the database (soft delete). | M | Brief | R4, R14 |
| BR-14 | Cards move between columns by drag and drop, and by a "Move to" control for keyboard and touch users. A move appears at once and reverts if the server refuses it. | M | Brief, review | R15, R33 |
| BR-15 | A card's description supports formatting (bold, italic, underline, headings, lists, quotes, code, links). | S | Owner | R40 |
| BR-16 | Cards hold up to 10 images, shown as thumbnails and opened full size. | S | Owner | R42 |
| BR-17 | Cards have an optional **due date**. Overdue, due-soon and done states are visible on the card and in My Tasks, in colour and in words. | S | Owner | R51 |
| BR-18 | Members discuss a card in comments; only the author edits or deletes a comment. | M | Brief | R6, R16 |

### 6.4 Finding work and staying informed

| ID | Requirement | Priority | Source | Fulfilled by |
|---|---|---|---|---|
| BR-19 | My Tasks lists the user's assigned cards by board, with a 300 ms debounced search across all their boards (and none they cannot open). | M | Brief, review | R5, R17 |
| BR-20 | A bell shows unread notifications (checked every 30 s) for being added to a board, assigned a card, or a new comment on an assigned card. | M | Brief | R7, R19 |
| BR-21 | A clock above the profile shows the time, date and "tide" of the day, and how many cards are assigned to the user. | C | Owner | R45 |

### 6.5 Experience and design

| ID | Requirement | Priority | Source | Fulfilled by |
|---|---|---|---|---|
| BR-22 | A distinctive, calm "sea glass" interface: curved glass sidebar, glass panes, smooth entrances and hover, dark and light themes, an animated background that can be paused. | S | Owner | R34, R37 |
| BR-23 | Navigation: full-height sidebar with nested board list, collapsible on wide screens; icon rail on tablets; drawer on phones. No duplicated links. | S | Owner | R35, R53 |
| BR-24 | The board fills the screen; columns run full height and scroll sideways with the wheel, arrows or a column dock. Scrollbars stay out of the way while still showing there is more. | S | Owner | R44 |
| BR-25 | Every dialog scrolls in one place and becomes a bottom sheet on phones. | S | Owner | R52 |
| BR-26 | One brand mark is used in the browser tab, app icons, the app and the README. | C | Owner | R50 |

### 6.6 Delivery

| ID | Requirement | Priority | Source | Fulfilled by |
|---|---|---|---|---|
| BR-27 | Specs (requirements, design, tasks) are written first, reviewed, and every change is logged with a before, an after, a reason and the prompt used. | M | Brief | R22, CHANGELOG |
| BR-28 | Steering guidelines are committed before any code, and generated code is reviewed against them. | M | Brief | R23 |
| BR-29 | Automated tests cover the API, the UI and full user journeys. | M | Brief | R24–R26 |
| BR-30 | The app is deployed (API on Render with Gunicorn, web app on Vercel, database on Supabase) with documented steps. | M | Brief, owner | R27 |
| BR-31 | The README explains the product, the AI workflow, local setup, tests, deployment and a demo account. | M | Brief | R29 |

## 7. Non-functional requirements

| ID | Area | Requirement | Fulfilled by |
|---|---|---|---|
| NFR-01 | Performance | API p95 latency under 500 ms; a card move updates exactly one row (FLOAT ordering); the web app's server functions run in the same region as the API (Singapore) and make each identical API call once per page load. | R30 |
| NFR-02 | Security | Salted password hashes; JWT with expiry in an HttpOnly cookie; role checks on every route; HTML sanitised on the server; images re-encoded to AVIF with metadata stripped; images served only through signed links that expire in 1–2 hours; links limited to http and https. | R1, R32, R31, R40, R43, R47 |
| NFR-03 | Privacy | Original uploads are never stored; EXIF data such as GPS location is removed. | R41, R43 |
| NFR-04 | Accessibility | WCAG 2.2 AA intent: no serious or critical axe violations in either theme; keyboard access for every action; visible focus; reduced motion, reduced transparency, high contrast and forced colours respected; colour never the only signal. | R39, R51, R52 |
| NFR-05 | Responsiveness | No page-level horizontal scroll from 320 px to 3840 px; touch targets at least 44 px on touch screens. | R38 |
| NFR-06 | Reliability | Consistent `{"data"}` / `{"error"}` response envelope; optimistic UI that reverts on failure; database changes only through migrations. | R11, R15 |
| NFR-07 | Maintainability | Eight brief blueprints plus `media`; one file per concern; steering guidelines; specs as the source of truth. | R11, R23 |
| NFR-08 | Quality | Every one of the 56 correctness properties in the design has an automated test. | design.md |
| NFR-09 | Hosting limits | Uploads at most 4 MB; a small, recycled database pool per Gunicorn worker within the Supabase session pooler's limits; the free Render instance sleeps after 15 minutes idle (about a minute to wake). | R27, R43 |

## 8. Assumptions, constraints and dependencies

**Assumptions**

- Teams are small (a handful of members per board), so 30 s notification polling and in-database image storage are acceptable.
- "Done" means a card is in the board's last column; teams order their columns from start to finish.
- Users have a modern evergreen browser (the design uses View Transitions, popovers, `@starting-style` and scroll-driven animations, each with a fallback).

**Constraints**

- Course brief: Flask API with the eight named blueprints, Next.js frontend, specs and guidelines first, AI-assisted workflow documented.
- Hosting: Render for the API (Gunicorn web service; ephemeral filesystem; the free plan sleeps after 15 idle minutes and has no pre-deploy command), Vercel for the web app, Supabase PostgreSQL through the session pooler on port 5432 (IPv4) for the API and migrations.
- No paid third-party services (no storage bucket, email or scheduler).

**Dependencies**

- Pillow (AVIF encoding), nh3 (HTML sanitising), TipTap (rich-text editor), Flask-JWT-Extended, SQLAlchemy and Alembic, Next.js 16 and React 19, Tailwind CSS 4.
- Runtimes and toolchain (21 November 2026): Python 3.13 with Gunicorn 27 on Render; Node.js 26 on Vercel (pinned with `engines`); TypeScript 6.0 and ESLint 10. TypeScript 7 waits for `typescript-eslint` support (D17).
- Library behaviour was checked against current documentation (Context7) during the build.

## 9. Key decisions and trade-offs

| # | Decision | Alternatives considered | Why |
|---|---|---|---|
| D1 | **API on Render with Gunicorn, web app on Vercel, database on Supabase.** | Railway (first spec); everything on Vercel (an earlier decision, entry 20); Render Postgres. | Owner's choice. A long-running Gunicorn server keeps a connection pool and matches the course stack; Vercel is the natural home for Next.js; Supabase's free database does not expire (Render's free Postgres expires after 30 days). |
| D2 | Store images **as AVIF in PostgreSQL**, served by **signed, expiring links**. | Local disk; object storage bucket. | The API's filesystem is ephemeral (reset on every deploy); no extra paid service; AVIF keeps rows small; `<img>` tags cannot send the login token across domains. |
| D3 | **Never keep the original upload**; re-encode and strip metadata. | Store the original as well. | Owner's request; privacy (GPS) and safety (only real images stored). |
| D4 | **Block right-click, drag and long-press saving** of images, but say plainly that this is a deterrent, not DRM. | Promise full protection. | No website can stop screenshots or developer tools; honesty avoids a false promise. |
| D5 | **Sanitise rich text on the server** (allow-list). | Trust the editor. | The API, not the browser, is the trust boundary. |
| D6 | **Recordings and documents as links**, not uploads. | Upload any file. | 4 MB upload limit and database storage. |
| D7 | Board **colour keeps only the hue**; lightness and chroma are fixed. | Free colour choice. | A white or near-black choice would make dots, liquid and text unreadable. |
| D8 | **"Done" = the last column** (same as Analytics). | A column named "Done". | Names are free text and can be in any language. |
| D9 | The board's **"+" tile opens a small dialog** for everyone, not Board settings. | Send "+" to settings. | Settings are admin-only; members must still be able to add columns. |
| D10 | **Remove sidebar links that repeat the board's own buttons** (Members, Analytics). | Keep both. | One way to each panel; room for progress in each row. |
| D11 | Keep "cards assigned to you" **under the clock**. | A bubble on the profile; a count on My Tasks. | A bubble reads as a notification (confusing next to the bell); a My Tasks count would duplicate it. |
| D12 | **Tide clock** above the profile, tied to the sidebar's wave decoration. | A clock bottom-right. | Bottom-right is where the last column and the dock are; the tide makes it part of the design. |
| D13 | **No due-date reminders** yet. | Scheduled reminders. | Needs a scheduled job and a delivery channel (email or push); the free web service sleeps when idle. |
| D14 | **Quiet scrollbars**: hidden where the browser can show faded edges instead; thin scrollbar elsewhere. | Always-visible scrollbars. | Owner's request for a cleaner look, while still signalling more content. |
| D15 | **Speed through location, not an API cache**: Vercel functions in `sin1` next to the Render API; identical calls deduplicated within one page load. | A shared response cache in Flask (or Redis). | Measured first: the API answered in about 0.1 s, but Vercel ran the server functions in Washington, so each server call crossed the Pacific twice. A shared cache would risk stale boards and permissions across two Gunicorn workers for a few milliseconds of database time. |
| D16 | **ESLint 10**, with `overrides` letting three Next.js-bundled plugins run on it. | Stay on ESLint 9. | A rule-by-rule trial showed identical findings on ESLint 9 and 10, a clean codebase, a clean `npm ci` and a working build; ESLint 9 is out of support. |
| D17 | **TypeScript 6.0, not 7.0**, for now. | TypeScript 7; running 6 and 7 side by side. | TypeScript 7 type-checked, built and passed the tests, but `typescript-eslint` refuses it; the side-by-side scheme only adds a second compiler. |
| D18 | **The live demo account is created by running `seed_demo.py` once against Supabase**, not on every deploy. | Seed in Render's build command. | Keeps deploys free of data changes; the script is safe to rerun if needed. |

## 10. Owner requests and how they were resolved

Every change the owner asked for during the build, in order. "Adapted" means the need was met in a different way from the literal request, for the reason given. Full details are in `specs/CHANGELOG.md`.

| # | Request | Outcome | Notes | Changelog |
|---|---|---|---|---|
| 1 | Read the RevoU Module 4 brief and improve the Kiro specs. | Done | v1 archived in `specs-history/v1`; 20 refinements logged. | 1–19 |
| 2 | Glassmorphism UI: curved glass, responsive phone to 4K, smooth transitions and hover, nested navigation, interactive profile, curved sidebar, modern web guidelines. | Done | Sea-glass design system, R34–R39. | v2.1 |
| 3 | Run all tasks like Kiro, mark them done; use Context7 for current docs. | Done | All required and optional tasks complete. | — |
| 4 | Deploy on Vercel and Supabase instead of Railway. | Done | Serverless database settings added. | 20 |
| 5 | Redesign the README with shields, a striking design and a demo account. | Done | — | — |
| 6 | Help: Flask would not run; `npm run dev` failed; 401 errors. | Done | Virtualenv not active; second dev server; `.env` overwritten (startup guard added). | — |
| 7 | Profile appears twice in the sidebar. | Done | Kept the profile capsule. | 21 |
| 8 | Profile picture as AVIF, original deleted, clickable but protected from download. | Done, with a caveat | Protection is a deterrent (D4). | 21 |
| 9 | Images on cards as attachments. | Done | Up to 10 per card. | 21 |
| 10 | Full text-formatting toolbar for descriptions. | Done | Sanitised on the server (D5). | 21 |
| 11 | The sidebar scrolls; make it full height and more interesting. | Done | One scroller, faded edges, lit rim, tide waves. | 22 |
| 12 | Main page: scroll down and sideways like the sidebar, full width and height, more interesting. | Done | Full-height board, column dock, wheel-to-sideways. | 23 |
| 13 | Add a clock, bottom right or above the profile. | Adapted | Tide clock above the profile (D12). | 23 |
| 14 | A box-like line appears on the left when scrolling right; hide it with blur. | Done | Columns slide under the frosted sidebar. | 24 |
| 15 | Liquid progress per board; 100% when all tasks are done. | Done | Done = last column (D8). | 24 |
| 16 | Members and Analytics in the sidebar duplicate the top bar? | Removed | D10. | 24 |
| 17 | Move the "cards assigned to you" chip? | Kept in place | D11; data now refreshes on navigation. | 24 |
| 18 | Board settings: appearance (dot colour) and columns ("big cards"), e.g. add Ideas before To do. | Done | — | 25 |
| 19 | Board purpose for members, plus attachments: meeting notes, recordings, photos. | Adapted | Notes as rich text, recordings and documents as links (D6), photos uploaded. | 25 |
| 20 | Use the README logo for the favicon and in the app. | Done | — | 25 |
| 21 | Remove the add-column form, or a "+" that leads to settings. | Adapted | "+" opens a dialog for everyone (D9). | 26 |
| 22 | Two scrollbars in Board settings; make every pop-up responsive. | Done | One scroller; bottom sheets on phones. | 26 |
| 23 | Drag columns to reorder in settings. | Done | Arrows kept for keyboards. | 26 |
| 24 | A colour picker. | Adapted | Any colour, reduced to its hue (D7). | 26 |
| 25 | Deadlines for cards and boards. | Done, partly | Reminders out of scope (D13). | 26 |
| 26 | Collapsible sidebar. | Done | Wide screens; remembered. | 26 |
| 27 | Slower, smoother entrances. | Done | 620 ms, 75 ms apart. | 26 |
| 28 | "Animate background" shows no animation; turn it on by default. | Done | Motion made visible; still paused by reduced motion or the toggle. | 27 |
| 29 | Write this BRD as a reusable document and update the README. | Done | This document and `BRD-template.md`. | 27 |
| 30 | Use Render for the backend (keeping Gunicorn) and Vercel for the frontend instead. | Done | `render.yaml`, `gunicorn.conf.py`, session-pooler connection pool; database stays on Supabase (D1). | 28 |
| 31 | Do we need a Procfile? | Declined | Render reads the start command from `render.yaml`; a Procfile is a Heroku/Railway convention and would be a second place to change it. | — |
| 32 | Deploy error: `JWT_SECRET_KEY is not set`. | Done | The key had been added as a Render *Secret File*, not an environment variable. Startup errors now say how to fix them locally and on Render, and the API refuses to start on Render without `DATABASE_URL`. | — |
| 33 | Put the deployed URLs in the README. | Done | App and API links, health check, a note on the free plan's sleep. | — |
| 34 | Is the demo account available on the live site? | Explained | Not until `seed_demo.py` runs once against Supabase (D18, OI-1). | — |
| 35 | "Can't reach RevoTask" on the live site. | Done | `FRONTEND_ORIGIN` ended with `/`, so CORS rejected the browser's origin; the API now ignores a trailing slash. | — |
| 36 | Add an API cache for faster loading. | Adapted | Region co-location and per-request deduplication instead (D15). | 29 |
| 37 | npm warnings during install. | Explained | All from development tools (Jest, ESLint) or the build machine; none reach the website. | — |
| 38 | Update all dependencies (checked with Context7). | Done, partly | Gunicorn 27, React 19.3.1, Tailwind 4.3.5, TypeScript 6.0, ESLint 10, `@types/node` 26 with `engines` 26.x; TypeScript 7 deferred (D16, D17). | 30 |
| 39 | Update the README and this BRD. | Done | Version 1.1 of this document. | — |

## 11. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| RK1 | Database grows with images. | Medium | Medium | AVIF, size and count limits (10 per card, 30 per board, 4 MB per upload); move to object storage if usage grows. |
| RK2 | The free Render instance sleeps after 15 idle minutes, so the first request after a pause takes about a minute. | High | Medium | Documented; the latency check warms the service first and measures p95; a paid instance (or an uptime ping) removes the sleep. |
| RK3 | Signed image links copied and shared. | Low | Low | Links expire in 1–2 hours. |
| RK4 | Newer browser features unsupported in some browsers. | Medium | Low | Every feature has a fallback (thin scrollbars, no fades, instant transitions). |
| RK5 | Optimistic moves diverge from the server under poor connections. | Low | Medium | Moves revert with a toast on failure; reload shows the saved state. |
| RK6 | FLOAT ordering runs out of precision after many inserts between the same two cards. | Low | Low | Accepted for this scope; renumbering is a follow-up. |
| RK7 | A future release of the React, import or jsx-a11y ESLint plugins misbehaves on ESLint 10 before declaring support. | Low | Low | The plugins are pinned through `eslint-config-next` 16.4.6; recheck with the probe file before upgrading them, and remove `overrides` once they declare ESLint 10. |
| RK8 | A wrong environment setting on Render or Vercel (secret in the wrong place, origin with a slash) breaks the live site. | Medium | High | Startup errors name the missing setting and how to fix it; origins are normalised; the README lists every variable. |

## 12. Open items

| ID | Item | Owner | Needed for |
|---|---|---|---|
| OI-1 | Deployment: done (API https://revou-checkpoint-04.onrender.com, app https://jwrevotask.vercel.app). Remaining: run `scripts/seed_demo.py` once against Supabase, and push the latest commits (CORS fix, region setting, dependency updates). | Project owner | O1 |
| OI-2 | Run the latency check (task 19.5) and the Playwright suite (task 20.4) against the live URLs; commit the report. | Project owner | O1, O4 |
| OI-3 | Decide on due-date reminders (needs a scheduler, e.g. a Render cron job or Supabase scheduled functions, and an email or push channel). | Project owner | Future release |
| OI-4 | Upgrade to TypeScript 7 when `typescript-eslint` supports it; remove the ESLint `overrides` when the bundled plugins declare ESLint 10. | Project owner | Maintenance |

## 13. Acceptance and sign-off

The product is accepted when:

1. Every "Must" business requirement is fulfilled and its linked requirements pass their tests (currently 147 backend tests, 131 frontend tests and 17 end-to-end tests, all passing locally).
2. OI-1 and OI-2 are closed: the demo account exists on the live site, the live site passes the Playwright suite, and the API's p95 latency is under 500 ms.
3. The README, specs, guidelines and this BRD are current.

| Role | Name | Decision | Date |
|---|---|---|---|
| Project owner | | | |
| Reviewer | | | |

## 14. Glossary

| Term | Meaning |
|---|---|
| Board | A project space with columns and cards, and its own members. |
| Column | A stage of work on a board, such as "To do" or "Done". The last column counts as done. |
| Card | A task on a board. |
| Board admin / member | Roles set per board (see [section 5](#5-stakeholders-and-users)). |
| Purpose | A one-line statement of what a board is for. |
| Progress | Cards in the last column divided by all cards on the board. |
| Tide clock | The clock above the profile; the sidebar's waves rise towards 15:00 and fall overnight. |
| AVIF | A compact modern image format; every upload is converted to it. |
| Signed link | An image address that carries its own expiry and signature, so it works only for a short time. |
| EARS | "Easy Approach to Requirements Syntax", the WHEN/WHILE/THE … SHALL style used in `requirements.md`. |
| MoSCoW | Must, Should, Could (Won't): a way to rank requirements. |
| Property (correctness property) | A rule that must hold for all inputs, tested with generated data (Hypothesis, fast-check). |
