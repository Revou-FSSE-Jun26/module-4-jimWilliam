# RevoTask — Project Brief

## Overview

RevoTask is a Trello-like task management application. Teams create boards, split work into columns, move cards between stages with drag and drop, discuss work in card comments, and track the cards assigned to them. Board administrators control who can access a board and watch team progress through analytics and notifications.

The project is built through a spec-driven, AI-assisted workflow: this brief was turned into `requirements.md`, `design.md` and `tasks.md` with Kiro, every generated document was reviewed and refined (see `CHANGELOG.md`), and the code is generated against the steering guidelines in `/guidelines`.

## User roles

Roles are set per board, so the same person can be an admin on one board and a member on another.

| Role | Who | Can do |
|---|---|---|
| Visitor | Not signed in | Register, log in |
| Board member | A user added to a board | View the board; create, edit, move and delete columns and cards; assign cards to board members; comment on cards and edit or delete their own comments; see assigned cards on My Tasks; receive notifications |
| Board administrator | The board creator, or a member promoted by an admin | Everything a member can do, plus: rename and delete the board, add and remove members and set their role, view board analytics |

## Core features

1. **Authentication**: register, log in with JWT (with expiry), stay signed in across page reloads, log out.
2. **Boards**: dashboard of every board the user belongs to; create, rename and delete boards (admin).
3. **Membership**: admins add members by email, set the role (member or admin) and remove members; a board always keeps at least one admin.
4. **Columns**: add, rename, delete and reorder columns (FLOAT order).
5. **Cards**: create, edit, assign, soft-delete, and move cards between columns by drag and drop or with a "Move to" control on touch screens, with optimistic updates that revert on error.
6. **Comments**: add, edit and delete comments in the card detail modal (only the author can edit or delete).
7. **My Tasks and search**: cards assigned to the user grouped by board, plus a 300 ms debounced search across the user's boards.
8. **Notifications**: a bell with an unread count, polled every 30 seconds; notifications for being added to a board, being assigned a card, and new comments on assigned cards.
9. **Analytics** (admin): cards per column, cards completed this week, activity per member.
10. **Profile**: update name and email.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask, SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Marshmallow, PostgreSQL, python-dotenv, Gunicorn |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, react-hot-toast |
| Testing | pytest (+ Hypothesis), Jest + React Testing Library (+ fast-check), Playwright |
| Deployment | Render (Flask API on Gunicorn), Vercel (Next.js app), Supabase (PostgreSQL) |
| AI tools | Kiro (specs, steering, code generation), Kiro CLI (tests and documentation) |

## Design direction

**Sea glass.** RevoTask's interface is frosted glass floating over deep water: cards are smooth glass pebbles that move between stages, the way sea glass is tumbled by the tide.

- **Glassmorphism with three surface levels:** blurred panes (sidebar, top bar, columns, board tiles), raised glass in the top layer (modals, menus, toasts) and translucent pebbles (cards, inputs).
- **Signature element:** a floating, curved glass sidebar whose edge bows outward like a lens, with nested navigation to each board and its members and analytics. It collapses to an icon rail on tablets and becomes a swipeable drawer on phones.
- **Interactive profile:** a profile capsule at the foot of the sidebar opens a menu with the profile link, an Appearance submenu (theme, animated background, reduced transparency) and log out; the profile page previews edits live.
- **Motion that answers the user:** smooth entrances for fields and cards, hover lift with a light highlight that follows the pointer, morphing card moves, and gliding navigation, all respecting reduced-motion settings.
- **Every screen from 320 px phones to 3840 px 4K monitors,** with fluid type and opaque fallbacks wherever glass would hurt readability or performance.
- **Built on modern web platform features** (`<dialog>`, popover, View Transitions, `@starting-style`, anchor positioning) with feature-detected fallbacks, following the modern-web-guidance best practices.

## Non-functional requirements

1. **Performance**: non-analytics API endpoints respond within 500 ms at the 95th percentile under normal load; a card move writes exactly one database row.
2. **Security**: passwords are stored as salted hashes; secrets come from environment variables; CORS allows only the frontend origin; every query is parameterised; users can only see and change data on boards they belong to.
3. **Reliability**: every API response uses the `{ "data": ... }` / `{ "error": "..." }` envelope, and unhandled errors return 500 without a stack trace.
4. **Usability**: every page works from 320 px to 3840 px wide without page-level horizontal scrolling, and every card can be moved without a mouse.
5. **Maintainability**: every Blueprint has `routes.py`, `service.py` and `schema.py`, and every schema change goes through a Flask-Migrate migration.
6. **Accessibility**: text keeps at least 4.5:1 contrast on glass in both themes; motion, transparency, contrast and forced-colors preferences are respected; an automated accessibility scan finds no serious or critical issues.

## Out of scope

Real-time updates (websockets), file attachments, email delivery, password reset, OAuth sign-in, and card labels or due dates.

## Success criteria

- The Flask API is live on Render (Gunicorn), the Next.js app on Vercel, and the database on Supabase.
- The live demo covers register, login, create board, add columns, create and drag cards (position persists after reload), add and edit a comment, search for a card, and the notification bell with an unread count.
- `pytest -v`, `npm test` and the Playwright suite against the live Vercel URL all pass.
