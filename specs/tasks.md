# Implementation Plan: RevoTask

## Overview

RevoTask is built in this order: specs, guidelines, a commit gate, backend, frontend, tests, deployment and README. The Backend is Python (Flask). The Frontend is TypeScript (Next.js). The guidelines tasks (group 2) and the commit gate (group 3) come before every task that creates files under `backend/` or `frontend/`, which satisfies Requirement 23.6. Each backend route (B1–B29) and each frontend page (P1–P6) has its own task. Route and page identifiers refer to the tables in `design.md`.

## Tasks

- [ ] 1. Specs deliverables
  - [x] 1.1 Create the `/specs` directory with the Spec_Set
    - Copy `brief.md`, `requirements.md`, `design.md`, `tasks.md` and `CHANGELOG.md` from `.kiro/specs/revotask/` into `/specs`
    - Check that `brief.md` has overview, user roles, core features, tech stack and at least 2 non-functional requirements
    - Check that `CHANGELOG.md` has at least 5 entries, each with a "Before" and an "After" state, and add an entry for every later refinement round
    - Keep the design traceability table (every AC mapped to a route or page)
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [x] 1.2 Create repository hygiene files
    - Create the root `.gitignore` excluding `.env*`, `__pycache__`, `.next/` and `node_modules/`
    - Keep `!.env.example` un-ignored so the examples can be committed
    - _Requirements: 28.1_

- [ ] 2. Guidelines deliverables (must precede all backend and frontend code)
  - [x] 2.1 Write `/guidelines/backend.md`
    - Cover Blueprint layout, Envelope, Marshmallow validation, error handling, JWT, ownership checks, CORS, secrets, tests
    - Write every rule as Rule, Rationale and Example
    - _Requirements: 23.1, 23.2_

  - [x] 2.2 Write `/guidelines/database.md`
    - Cover UUID keys, timestamps, soft delete, Float order, indexes, Flask-Migrate and parameterised queries
    - Write every rule as Rule, Rationale and Example
    - _Requirements: 23.1, 23.2_

  - [x] 2.3 Write `/guidelines/frontend.md`
    - Cover App Router and Server Components, `apiClient`, AuthContext, error handling, Tailwind, shared components, native drag and drop, mobile viewport
    - Write every rule as Rule, Rationale and Example
    - _Requirements: 23.1, 23.2_

  - [ ] 2.4 Write the AI output comparison and the violation report
    - Create `/guidelines/ai-comparison.md` with one before and after comparison of AI output
    - Create `/guidelines/violation-report.md` listing at least 3 violations
    - _Requirements: 23.4, 23.5_

  - [x] 2.5 Review the Guideline_Set for contradictions
    - Read the three guideline files together and resolve any rules that conflict
    - Confirm every rule still has Rule, Rationale and Example
    - _Requirements: 23.2, 23.3_

- [ ] 3. Commit gate: specs and guidelines first
  - [x] 3.1 Add `scripts/check-guidelines-first.ps1`
    - Compare the first commit that adds files under `backend/` or `frontend/` with the guidelines commit using `git log --diff-filter=A`
    - Exit non-zero if a code commit precedes the guidelines commit
    - _Requirements: 23.6_

  - [x] 3.2 Commit specs and guidelines
    - Create a commit for `/specs`, `.gitignore` and the scripts
    - Create a separate later commit for `/guidelines`
    - Do not add any file under `backend/` or `frontend/` in these commits
    - _Requirements: 23.6, 28.3_

- [ ] 4. Backend foundation
  - [x] 4.1 Scaffold the Flask project
    - Create `backend/app/__init__.py` (`create_app`), `extensions.py`, config from environment variables, `wsgi.py`, `requirements.txt`
    - Create the eight Blueprint packages under `backend/app/blueprints/` (auth, boards, columns, cards, comments, notifications, analytics, users), each with `__init__.py`, `routes.py`, `service.py` and `schema.py`, and register them
    - Create `backend/.env.example` with `JWT_SECRET_KEY`, `DATABASE_URL`, `FRONTEND_ORIGIN` and `JWT_ACCESS_TOKEN_EXPIRES_HOURS` placeholders
    - Configure CORS for `FRONTEND_ORIGIN` only; rewrite a `postgres://` URL to `postgresql://`
    - _Requirements: 1.8, 11.1, 11.2, 28.2, 30.2, 30.3_

  - [x] 4.2 Implement the Envelope, error handlers and access helpers
    - Create `common/envelope.py` (`ok`, `fail`), `common/errors.py` (`AppError` and handlers for validation, JWT and 500 without stack trace) and `common/access.py`
    - Implement `require_member(board_id, user_id, admin=False)`, checking 404 before 403
    - _Requirements: 1.7, 11.3, 11.4, 11.6, 31.4, 31.8_

  - [x] 4.3 Implement the data models and the first migration
    - Create User, Board (`name`), BoardMember (`role`), Column (`name`), Card, Comment and Notification models with UUID keys, timestamps, Float `order` and Card `deleted_at`
    - Add the indexes and the unique (board_id, user_id) constraint from the design and generate the Flask-Migrate migration
    - _Requirements: 4.1, 11.5, 30.4_

  - [x] 4.4 Implement B26: GET /api/health
    - Register the route in `create_app` returning `{"data": {"status": "ok"}}` without JWT
    - _Requirements: 10.1_

  - [x] 4.5 Create pytest fixtures
    - Create `backend/tests/conftest.py` with the app, test database, client, user factory and JWT helper
    - _Requirements: 24.1_

  - [ ]* 4.6 Write property test for the Envelope
    - **Property 25: Envelope on every response**
    - **Validates: Requirements 11.3, 11.6**

  - [ ]* 4.7 Write example tests for health and structure
    - Test B26, the eight Blueprint packages and the three files in each
    - _Requirements: 10.1, 11.1, 11.2_

- [ ] 5. Backend: auth Blueprint
  - [x] 5.1 Implement B1: POST /api/auth/register
    - Add the schema, service (salted hash with `generate_password_hash`) and route
    - Return 201, 400 or 409
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [x] 5.2 Implement B2: POST /api/auth/login
    - Verify the hash and return `{token, expires_at, user}`, or 401 with the same message for unknown email and wrong password
    - Read the token expiry from `JWT_ACCESS_TOKEN_EXPIRES_HOURS` (default 24)
    - _Requirements: 1.4, 1.5, 1.6, 1.8_

  - [ ]* 5.3 Write property test for wrong credentials
    - **Property 4: Wrong credentials are rejected**
    - **Validates: Requirements 1.5**

  - [ ]* 5.4 Write property test for password hashing
    - **Property 5: Passwords are salted hashes**
    - **Validates: Requirements 1.6**

- [ ] 6. Backend: boards Blueprint
  - [x] 6.1 Implement B3: POST /api/boards
    - Create the Board and an `admin` BoardMember for the creator in one transaction
    - _Requirements: 2.1_

  - [x] 6.2 Implement B4: GET /api/boards
    - Return only the Boards where the requesting User is a Board_Member, with the User's `role`
    - _Requirements: 2.2_

  - [x] 6.3 Implement B5: GET /api/boards/<id>
    - Return the Board with nested Columns and live Cards, ordered by `order`
    - Return 404 and 403 through `require_member`
    - _Requirements: 2.3, 2.6, 2.7_

  - [x] 6.4 Implement B6: PATCH /api/boards/<id>
    - Admin only; update `name`
    - _Requirements: 2.4, 2.6, 2.7, 2.8_

  - [x] 6.5 Implement B7: DELETE /api/boards/<id>
    - Admin only
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

  - [x] 6.8 Implement B27: GET /api/boards/<id>/members
    - Return members with name, email and role
    - _Requirements: 31.1_

  - [x] 6.9 Implement B28: POST /api/boards/<id>/members
    - Admin only; look up the User by email (404), reject an existing member (409), create a Notification for the added User
    - _Requirements: 31.2, 31.4, 31.5, 31.6, 31.11_

  - [x] 6.10 Implement B29: DELETE /api/boards/<id>/members/<user_id>
    - Admin only; return 409 if the removal would leave no admin
    - _Requirements: 31.3, 31.4, 31.7_

  - [ ]* 6.11 Write property test for the admin invariant
    - **Property 35: A Board always keeps an admin**
    - **Validates: Requirements 2.1, 31.2, 31.3, 31.7**

  - [ ]* 6.6 Write property test for board update
    - **Property 10: Board update applies the given fields**
    - **Validates: Requirements 2.4**

  - [ ]* 6.7 Write property test for board create and fetch
    - **Property 9: Board create and fetch round trip**
    - **Validates: Requirements 2.1, 2.2, 2.3, 4.2**

- [ ] 7. Backend: columns Blueprint
  - [x] 7.1 Implement B8: POST /api/boards/<id>/columns
    - Assign a Float order after the last Column
    - Every column route calls `require_member` on the Column's Board (403 for non-members)
    - _Requirements: 3.1, 3.5, 3.6, 31.8_

  - [x] 7.2 Implement B9: PATCH /api/boards/<id>/columns/reorder
    - Validate the list of identifiers and Float orders and persist them
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 7.3 Implement B10: PATCH /api/columns/<id>
    - _Requirements: 3.2, 3.5, 3.6_

  - [x] 7.4 Implement B11: DELETE /api/columns/<id>
    - Delete the Column; its Cards and Comments go with it through `ondelete="CASCADE"` (v3 entry 14)
    - _Requirements: 3.3, 3.6_

  - [ ]* 7.5 Write property test for column reorder
    - **Property 11: Column reorder round trip**
    - **Validates: Requirements 3.1, 3.4**

- [ ] 8. Backend: cards Blueprint
  - [x] 8.1 Implement B12: POST /api/columns/<id>/cards
    - Create the Card with a Float order and return 201
    - Every card route calls `require_member` on the Card's Board (403 for non-members)
    - _Requirements: 4.1, 4.2, 4.7, 31.8_

  - [x] 8.2 Implement B13: GET /api/cards?assignee=me and ?search=<term>
    - Join Card → Column → Board → BoardMember and keep only the requesting User's Boards
    - Use bound parameters, escape `%` and `_`, match case-insensitively on title and description, exclude soft-deleted Cards
    - Return `board_id` and `board_name` on every Card
    - Return 400 for an empty or whitespace term
    - _Requirements: 5.1, 5.2, 5.4, 30.4_

  - [x] 8.3 Implement B14: PATCH /api/cards/<id>
    - Update fields and `updated_at`, return 404 for unknown or deleted Cards
    - Reject an `assignee_id` that is not a Board_Member (400); notify a newly assigned User
    - _Requirements: 4.3, 4.7, 31.9, 31.11_

  - [x] 8.4 Implement B15: DELETE /api/cards/<id>
    - Set `deleted_at` and exclude the Card from later responses
    - _Requirements: 4.4, 4.7_

  - [x] 8.5 Implement B16: PATCH /api/cards/<id>/position
    - Add `CardPositionSchema` (UUID `column_id`, positive float `order`)
    - Update only the moved Card row; return 400 if the target Column is on another Board
    - _Requirements: 4.5, 4.6, 4.7, 30.5, 31.10_

  - [ ]* 8.6 Write property test for card position persistence
    - **Property 12: Card position persists and touches one row**
    - **Validates: Requirements 4.5, 14.6, 30.5**

  - [ ]* 8.7 Write property test for the position schema
    - **Property 13: Position schema accepts only valid payloads**
    - **Validates: Requirements 4.6**

  - [ ]* 8.8 Write property test for card update
    - **Property 14: Card update refreshes `updated_at`**
    - **Validates: Requirements 4.3**

  - [ ]* 8.9 Write property test for soft delete
    - **Property 15: Soft-deleted Cards never appear**
    - **Validates: Requirements 4.4**

  - [ ]* 8.10 Write property test for the assignee filter
    - **Property 16: Assignee filter**
    - **Validates: Requirements 5.1**

  - [ ]* 8.11 Write property test for search
    - **Property 17: Search is case-insensitive and complete**
    - **Validates: Requirements 5.2, 30.4**

- [ ] 9. Backend: comments Blueprint
  - [x] 9.1 Implement B17: POST /api/cards/<id>/comments
    - _Requirements: 6.1, 6.5, 6.6_

  - [x] 9.2 Implement B18: GET /api/cards/<id>/comments
    - _Requirements: 6.2, 6.6_

  - [x] 9.3 Implement B19: PATCH /api/comments/<id>
    - Allow the owner only and return 403 otherwise
    - _Requirements: 6.3, 6.5, 6.7_

  - [x] 9.4 Implement B20: DELETE /api/comments/<id>
    - Allow the owner only and return 403 otherwise
    - _Requirements: 6.4, 6.7_

  - [ ]* 9.5 Write property test for comment create and list
    - **Property 19: Comment create and list round trip**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 9.6 Write property test for comment owner edit and delete
    - **Property 20: Comment owner can edit and delete**
    - **Validates: Requirements 6.3, 6.4**

  - [x] 9.7 Write the comments status-code tests
    - Create `backend/tests/test_comments.py` asserting 201, 400, 401 and 403
    - _Requirements: 24.2_

- [ ] 10. Backend: notifications Blueprint
  - [x] 10.1 Implement B21: GET /api/notifications?page&per_page
    - Return `{items, page, per_page, total, unread_count}`
    - Return 400 when `page` or `per_page` is not a positive integer
    - _Requirements: 7.1, 7.4_

  - [x] 10.2 Implement B22: PATCH /api/notifications/<id>/read
    - Return 403 for another User's Notification
    - _Requirements: 7.2, 7.3_

  - [x] 10.3 Create Notifications from membership, card assignment and comments
    - Add service hooks in `boards/service.py`, `cards/service.py` and `comments/service.py`; never notify a User about their own action
    - _Requirements: 7.1, 31.11_

  - [ ]* 10.4 Write property test for pagination
    - **Property 21: Notification pagination partitions the set**
    - **Validates: Requirements 7.1**

  - [ ]* 10.5 Write property test for marking read
    - **Property 22: Marking read is idempotent**
    - **Validates: Requirements 7.2**

  - [ ]* 10.6 Write unit tests for the notification hooks
    - Test assignment and comment notifications
    - _Requirements: 7.1_

- [ ] 11. Backend: analytics Blueprint
  - [x] 11.1 Implement B23: GET /api/boards/<id>/analytics
    - Admin only
    - Compute cards per Column, cards completed this week and activity per member with SQLAlchemy joins in `analytics/service.py`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 11.2 Write property test for analytics
    - **Property 23: Analytics matches a reference model**
    - **Validates: Requirements 8.1**

- [ ] 12. Backend: users Blueprint
  - [x] 12.1 Implement B24: GET /api/users/me
    - Return the profile without the password field
    - _Requirements: 9.1_

  - [x] 12.2 Implement B25: PATCH /api/users/me
    - Update only name and email, ignore `password`, return 409 for a duplicate email
    - _Requirements: 9.2, 9.3, 9.4_

  - [ ]* 12.3 Write property test for the register and login round trip
    - **Property 1: Register then login round trip**
    - **Validates: Requirements 1.1, 1.4, 9.1**

  - [ ]* 12.4 Write property test for duplicate email
    - **Property 2: Duplicate email is rejected**
    - **Validates: Requirements 1.2, 9.4**

  - [ ]* 12.5 Write property test for profile update
    - **Property 24: Profile update changes only name and email**
    - **Validates: Requirements 9.2, 9.3**

- [ ] 13. Backend cross-route tests and commit
  - [ ]* 13.1 Write property test for invalid payloads
    - **Property 3: Invalid payloads are rejected with 400**
    - **Validates: Requirements 1.3, 3.5, 5.4, 6.5, 7.4, 11.4**

  - [ ]* 13.2 Write property test for JWT enforcement
    - **Property 6: Protected routes require a valid JWT**
    - **Validates: Requirements 1.7, 6.6**

  - [ ]* 13.3 Write property test for access control
    - **Property 7: Access follows membership, role and ownership**
    - **Validates: Requirements 2.7, 2.8, 6.3, 6.4, 6.7, 7.3, 8.4, 31.4, 31.8**

  - [ ]* 13.4 Write property test for unknown identifiers
    - **Property 8: Unknown identifiers return 404**
    - **Validates: Requirements 2.6, 3.6, 4.7, 8.3**

  - [x] 13.5 Commit the Backend
    - Run `pytest -v`, then commit `backend/` with its `.env.example`
    - _Requirements: 24.1, 28.2, 28.3_

- [x] 14. Checkpoint - Backend
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Frontend foundation
  - [ ] 15.1 Scaffold the Next.js project
    - Create `frontend/` with App Router (no `src/` folder), TypeScript, Tailwind CSS, react-hot-toast, Jest and React Testing Library
    - Create the folders `components/shared/`, `hooks/`, `lib/` and `context/` at the project root
    - Create `frontend/.env.example` with `NEXT_PUBLIC_API_BASE_URL` and `API_BASE_URL`
    - _Requirements: 20.5, 25.1, 28.2_

  - [ ] 15.2 Implement `lib/apiClient.ts`, `lib/errors.ts`, `lib/toast.ts` and `lib/order.ts`
    - `apiClient` picks the base URL by environment, sends the Bearer header and throws `ApiError` with `statusCode` and `message`
    - `toast.ts` wraps `toast.success()`, `toast.error()` and `toast.loading()`
    - `computeOrder` returns a value between neighbours
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 15.3_

  - [ ] 15.3 Implement the session: Server Actions, Middleware and AuthContext
    - `app/actions/session.ts`: `createSession(token, expiresAt)` sets the `HttpOnly`, `Secure`, `SameSite=Lax` cookie; `deleteSession()` removes it
    - `lib/session.ts#getToken()` reads the cookie in Server Components
    - `middleware.ts`: redirect protected paths to /login without an unexpired cookie, and /login and /register to / with one
    - `context/AuthContext.tsx`: accepts `initial={token, user}` from the layout, exposes `login()` and `logout()`; never touches localStorage
    - _Requirements: 12.6, 21.8, 32.1, 32.2, 32.3, 32.5, 32.6_

  - [ ] 15.4 Implement `useErrorHandler`
    - Map `statusCode` to toasts through `lib/toast.ts` and call `logout()` on 401
    - _Requirements: 21.6, 21.7, 32.5_

  - [ ] 15.5 Implement BaseButton, BaseBadge and BaseModal in `components/shared/`
    - BaseButton variants primary, secondary and destructive, ignoring clicks while disabled
    - BaseBadge color variants neutral, info, success, warning and danger
    - BaseModal as a native `<dialog>` opened with `showModal()`, `aria-labelledby` on the title, `closedby="any"`, a named close button; no `role="dialog"`, `aria-modal`, focus trap or Escape handler
    - Add `overscroll-behavior: contain` to `dialog:modal` and `::backdrop` so the page does not scroll behind the modal
    - Style all three with the glass tokens from task 15.12 and the interaction states and motion from the design
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 16.6, 37.4, 37.5, 37.6_

  - [ ] 15.6 Implement the root layout and route groups
    - `app/layout.tsx` reads the Session_Cookie and `revotask_prefs`, fetches B24, renders `<html data-theme data-glass data-bg-motion>`, and wraps children in AuthProvider and PrefsProvider with the glass-styled Toaster
    - `(auth)/layout.tsx` renders the App_Background and a centred content area; `(app)/layout.tsx` renders the AppShell (task 15.16) and fetches B4 for the Nav_Tree
    - _Requirements: 12.6, 27.5, 32.3, 32.5, 36.6_

  - [ ] 15.12 Write the Design_Tokens and glass utilities in `app/globals.css`
    - `@theme` tokens for color (both themes), radius, elevation, blur, durations and easing, as listed in the design
    - Utilities `glass-pane`, `glass-raised` and `glass-pebble`, each opaque by default, translucent with `backdrop-filter` inside `@supports`
    - Overrides for `data-glass="reduced"`, `prefers-reduced-transparency`, `prefers-contrast: more` and `forced-colors: active`
    - Root fluid font size, breakpoints `md`, `xl`, `3xl`, `4xl`, coarse-pointer 44 px targets, the `:focus-visible` ring
    - _Requirements: 34.1, 34.2, 34.3, 34.5, 34.6, 34.7, 34.8, 38.2, 38.7, 39.1, 39.2, 39.3, 39.4_

  - [ ] 15.13 Load the fonts in `app/fonts.ts`
    - Fraunces (variable, `SOFT` and `opsz` axes) and Figtree with `next/font/google`, `display: "swap"`, exposed as CSS variables used by the type tokens
    - _Requirements: 34.9_

  - [ ] 15.14 Implement `components/layout/AppBackground.tsx`
    - Fixed layer with the gradient, three light pools, the caustic SVG and the grain SVG as inline data URIs; no network images
    - Drift animation only under `[data-bg-motion="on"]` inside `prefers-reduced-motion: no-preference`
    - _Requirements: 34.4, 37.11_

  - [ ] 15.15 Implement Appearance_Preferences
    - `lib/prefs.ts` (`parsePrefs`, `serializePrefs`), `app/actions/prefs.ts` (`setPrefs`), `context/PrefsContext.tsx` and `hooks/usePreferences.ts` that update the `<html>` attributes at once and then persist the cookie
    - _Requirements: 34.7, 36.5, 36.6, 39.1_

  - [ ] 15.16 Implement the AppShell: Sidebar, Nav_Tree, Nav_Drawer and Top_Bar
    - `Sidebar` with the curved inline-end edge (elliptical border radius), arc-offset items, expanded (≥1280 px) and rail (768–1279 px) modes, rail labels on hover and focus
    - `NavTree` with links and disclosure buttons, admin-only Members and Analytics links, `aria-current`, the gliding current-page pill, rail flyouts as anchored popovers, open state in `sessionStorage`
    - `NavDrawer` as a modal `<dialog>` with the scroll-snap swipe, scroll-linked backdrop inside `@supports`, `closedby="any"` and an autofocused Close button
    - `TopBar` with the menu button (<768 px), the page `<h1>` and the NotificationBell slot
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6, 35.7, 35.8, 35.9, 35.10, 37.9, 38.5_

  - [ ] 15.17 Implement ProfileCapsule, ProfileMenu and Avatar
    - `lib/avatar.ts` (initials and hue from the User id), `Avatar.tsx`
    - `ProfileCapsule` as the command invoker, `ProfileMenu` with Profile, the Appearance submenu (theme radio group, two checkable items) and Log out (calls `logout()`)
    - `hooks/useMenuKeyboard.ts` for Home, End, ArrowRight, ArrowLeft, Escape and focus moves in the `toggle` event
    - _Requirements: 32.5, 32.7, 36.1, 36.2, 36.3, 36.4, 36.7_

  - [ ] 15.18 Implement the motion and interaction helpers
    - `lib/viewTransition.ts` (`withViewTransition` with `flushSync`, reduced-motion skip and focus routing)
    - `hooks/useSpecularHighlight.ts` (pointer-following highlight on hover-capable devices, one update per frame)
    - Entry and exit utilities with `@starting-style`, `display`/`overlay` and a separate `transition-behavior: allow-discrete`; the `canTransitionDisplay()` probe and the `data-closing` exit fallback
    - `lib/polyfills.ts`: feature-detected Popover polyfill, invoker-command, anchor-positioning, `focusgroup` and `closedby` fallbacks
    - _Requirements: 37.1, 37.2, 37.4, 37.5, 37.6, 37.10, 37.12, 39.5_

  - [ ]* 15.7 Write property test for the Bearer header
    - **Property 32: Bearer header is sent when a JWT exists**
    - **Validates: Requirements 21.4**

  - [ ]* 15.8 Write property test for ApiError
    - **Property 33: Non-2xx responses throw ApiError**
    - **Validates: Requirements 21.5**

  - [ ]* 15.9 Write property test for error mapping
    - **Property 34: Every status maps to a toast message**
    - **Validates: Requirements 21.6, 21.7**

  - [ ]* 15.10 Write property test for `computeOrder`
    - **Property 29: Computed order lies between neighbours**
    - **Validates: Requirements 15.3, 4.6**

  - [ ]* 15.11 Write property test for the route guard
    - **Property 26: Unauthenticated users are redirected**
    - **Validates: Requirements 12.6, 32.6**

- [ ] 16. Frontend pages and features
  - [ ] 16.1 Implement P1: /register
    - Controlled form with name, email and password, client-side validation, call B1, redirect to /login, error toast
    - _Requirements: 12.1, 12.3, 12.5, 12.7_

  - [ ] 16.2 Implement P2: /login
    - Controlled form with email and password, client-side validation, call B2, call `createSession`, update AuthContext, redirect to /
    - _Requirements: 12.2, 12.4, 12.5, 12.7, 32.1_

  - [ ] 16.3 Implement P3: / (dashboard)
    - Server Component list of Boards (B4 with the token from `getToken()`), client create-board form (B3), link to /boards/[id], role badge, empty state
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 32.4_

  - [ ] 16.4 Implement P4: /boards/[id] (Kanban page)
    - Server Component page that renders Columns and Cards in ascending order (B5 with the token from `getToken()`)
    - Add-column form (B8) and add-card form (B12); `data-testid` on every Column and Card
    - _Requirements: 14.1, 14.2, 14.3, 14.6, 32.4_

  - [ ] 16.5 Implement `useDragAndDrop` and the Move_Control, and wire them into P4
    - One `moveCard(cardId, columnId, index)` function: snapshot, `computeOrder`, optimistic update, B16, revert and toast on error
    - Native HTML5 `onDragStart`/`onDragOver`/`onDrop` call `moveCard`
    - `components/board/MoveControl.tsx`: a labelled `<select>` on every Card that calls `moveCard(cardId, columnId, Infinity)`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 33.1, 33.2, 33.3_

  - [ ] 16.6 Implement CommentList and CardDetailModal and wire them into P4
    - Open the modal on Card click, load B18, post B17, edit B19 and delete B20 for owned Comments only
    - _Requirements: 14.4, 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ] 16.7 Add the analytics panel to P4
    - Show the data from B23 on the Kanban page, only for Board_Admins
    - _Requirements: 14.5_

  - [ ] 16.17 Add the members panel to P4
    - Admin only: list members (B27) with a role BaseBadge, add a member by email in BaseModal (B28), remove a member (B29)
    - _Requirements: 31.12, 31.13_

  - [ ] 16.8 Implement P5: /my-tasks
    - List Cards from B13 `assignee=me` grouped by `board_name`, search with a 300 ms debounced `useDebouncedValue`, loading indicator and empty state
    - Each Card links to `/boards/<board_id>`
    - _Requirements: 5.3, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [ ] 16.9 Implement P6: /profile
    - Controlled inputs pre-populated from AuthContext and refreshed from B24, submit B25, success and error toasts
    - _Requirements: 18.1, 18.2, 18.3_

  - [ ] 16.10 Implement `useNotifications` and NotificationBell
    - Poll B21 every 30 seconds, mark read with B22, hide the badge at zero, stop polling on unmount and sign-out
    - Add the bell to the shared layout
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ] 16.11 Make every page usable at the Mobile_Viewport and audit buttons
    - Use responsive Tailwind classes so pages at 375 px have no page-level horizontal scroll and all controls are reachable; the Kanban row scrolls in its own container
    - Search the pages for raw `<button>` elements and replace each with BaseButton
    - _Requirements: 20.6, 27.5_

  - [ ]* 16.12 Write property test for board display order
    - **Property 27: Board display order**
    - **Validates: Requirements 14.1**

  - [ ]* 16.13 Write property test for optimistic move and revert
    - **Property 28: Optimistic move, then revert on failure**
    - **Validates: Requirements 15.2, 15.4**

  - [ ]* 16.14 Write property test for comment controls
    - **Property 30: Comment controls follow ownership**
    - **Validates: Requirements 16.4, 16.5**

  - [ ]* 16.15 Write property test for the unread badge
    - **Property 31: Unread badge reflects the count**
    - **Validates: Requirements 19.1, 19.3, 19.4**

  - [ ]* 16.16 Write property test for the search debounce
    - **Property 18: Search debounce**
    - **Validates: Requirements 5.3, 17.2**

  - [ ]* 16.18 Write property test for drag and Move_Control equivalence
    - **Property 36: Drag and Move_Control produce the same move**
    - **Validates: Requirements 15.2, 15.3, 33.2**

  - [ ] 16.19 Apply the design to /register and /login
    - Two-column layout from 1024 px with the display line and the To do → Doing → Done pebble stack (one glide on load, static under reduced motion); card only below 1024 px
    - Floating-label fields, animated error text with `aria-describedby` and `aria-invalid`, show/hide password, pending button label
    - _Requirements: 12.7, 34.8, 37.2, 37.10_

  - [ ] 16.20 Apply the design to the Kanban page
    - Columns as Glass_Panes (opaque tint below 768 px), Cards as Glass_Pebbles with `@container` meta row, 85vw snap columns on mobile
    - First-load stagger under 600 ms, drag states (lifted tilted card, rim, drop placeholder), Move_Control and card-to-modal morphs with `withViewTransition`
    - CardDetailModal as a full-height sheet below 768 px; owner comment actions visible on hover, focus-within and touch
    - _Requirements: 37.3, 37.7, 37.8, 38.4, 38.6, 38.8, 39.5_

  - [ ] 16.21 Implement the profile hero and live profile form
    - `ProfileHero` with the large avatar, name, email and stat chips from B4 and B13
    - `ProfileForm` with live hero preview while typing, an unsaved-changes indicator, Save disabled when clean and a Reset button
    - _Requirements: 36.8, 36.9, 36.10_

  - [ ] 16.22 Apply the design to the dashboard
    - Auto-fill grid of Board tiles (`minmax(18rem, 1fr)`, max width 140rem), role badge, avatar stack, "New board" tile opening BaseModal, empty state
    - _Requirements: 13.4, 38.3_

  - [ ]* 16.23 Write property test for avatars
    - **Property 38: Avatars are deterministic**
    - **Validates: Requirements 36.7**

  - [ ]* 16.24 Write property test for the preference cookie
    - **Property 39: Preference cookie round trip**
    - **Validates: Requirements 36.5, 36.6**

  - [ ] 16.25 Write the token contrast test
    - **Property 37: Design tokens meet contrast targets**
    - Table test over every text, icon, border and focus-ring token on each surface, translucent and opaque, in both themes
    - **Validates: Requirements 34.6, 39.4**

- [ ] 17. Checkpoint - Frontend
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Frontend tests and commit
  - [ ] 18.1 Write component tests for BaseButton and BaseModal
    - Test variants, the disabled state, the close control and Escape
    - _Requirements: 20.1, 20.3, 20.4, 16.6, 25.2_

  - [ ] 18.2 Write component tests for CardDetailModal and NotificationBell
    - Test that CommentList loads inside the modal, and that the badge shows and hides
    - _Requirements: 16.1, 16.2, 19.1, 19.4, 25.2_

  - [ ] 18.5 Write component tests for the Nav_Tree and Profile_Menu
    - Nav_Tree: group triggers toggle `aria-expanded` and `hidden`; Members and Analytics only for admins; `aria-current` on the current link
    - Profile_Menu: the keyboard model, radio and checkbox `aria-checked` updates, Log out calls `logout()`
    - _Requirements: 35.5, 35.6, 35.8, 35.9, 36.2, 36.3, 36.4_

  - [ ]* 18.3 Write example tests for the pages
    - Test forms, redirects and toasts for P1, P2, P3, P5 and P6
    - _Requirements: 12.3, 12.4, 12.5, 13.2, 17.3, 17.4, 18.2, 18.3_

  - [ ] 18.4 Commit the Frontend
    - Run `npm test`, then commit `frontend/` with its `.env.example`
    - _Requirements: 25.1, 28.2, 28.3_

- [ ] 19. Deployment configuration
  - [x] 19.1 Add the Railway configuration for the Backend
    - Create `Procfile` or `railway.json` that runs `flask db upgrade` and then `gunicorn wsgi:app`
    - _Requirements: 27.1, 27.2_

  - [ ] 19.2 Create the Postman collection
    - Add requests for B26, B1 and B2 with an environment for the Railway URL
    - _Requirements: 27.3_

  - [ ] 19.3 Add the Vercel configuration for the Frontend
    - Document the environment variables and add `vercel.json` if needed
    - _Requirements: 27.4_

  - [ ] 19.4 Commit the deployment files
    - _Requirements: 28.3_

  - [ ] 19.5 Measure API latency on the live Railway URL
    - Add `scripts/latency_check.py` that sends 100 requests each to B26, B4 and B5 with a test JWT and prints the 95th percentile
    - Record the result in the README; investigate any endpoint over 500 ms (missing index, N+1 query)
    - _Requirements: 30.1_

- [ ] 20. End-to-end tests
  - [ ] 20.1 Configure Playwright
    - Read the live Vercel URL from `PLAYWRIGHT_BASE_URL` and enable the HTML reporter (`frontend/playwright-report/`)
    - Do not ignore the report directory so it can be committed
    - Add a helper that builds a unique email per run (`e2e+<timestamp>@revotask.test`)
    - Add an npm script that fails if `waitForTimeout` appears under `e2e/`
    - _Requirements: 26.1, 26.4, 26.5, 26.6_

  - [ ] 20.2 Write the 4 auth scenarios in `e2e/auth.spec.ts`
    - (a) login redirects to /, (b) invalid credentials show an error and stay on /login, (c) unauthenticated / redirects to /login, (d) after Log out from the Profile_Menu, / redirects to /login
    - Wait with web-first assertions only; never call `waitForTimeout`
    - _Requirements: 26.2, 26.4, 32.5_

  - [ ] 20.3 Write the 8-step Kanban journey in `e2e/kanban.spec.ts`
    - Steps: register, log in, create Board, add 2 Columns, create Card, `dragTo` the second Column, `page.reload()` and assert the Card is in the second Column, open the Card and add then edit a Comment
    - Wait for the B16 response with `page.waitForResponse` before reloading
    - _Requirements: 14.6, 26.3, 26.4, 32.2_

  - [ ] 20.5 Write the visual and accessibility suite in `e2e/visual.spec.ts`
    - **Property 40: No nested blur and no page-level horizontal overflow** at 320, 375, 768, 1280, 1920, 2560 and 3840 px in both themes
    - `@axe-core/playwright` scan of every page with no serious or critical violations
    - Re-run with `reducedMotion: "reduce"` and `forcedColors: "active"`; save full-page screenshots to `docs/screenshots/`
    - **Validates: Requirements 34.3, 38.1, 39.6**

  - [ ] 20.4 Run the suite against the live URL and commit the HTML report
    - Requires the Backend and Frontend to be deployed
    - Create a separate commit for the tests and the report
    - _Requirements: 26.1, 26.5, 28.3_

- [ ] 21. README
  - [ ] 21.1 Write `README.md`
    - Include overview, AI workflow summary, feature list, technology list, local run steps, test steps and screenshots
    - _Requirements: 29.1_

  - [ ] 21.2 Add a script that captures the screenshots
    - Use Playwright to save screenshots of the main pages into `docs/screenshots`
    - _Requirements: 29.1_

  - [ ] 21.3 Commit the README and screenshots
    - _Requirements: 28.3_

- [ ] 22. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP.
- Groups 1 to 3 (specs, guidelines, commit gate) must finish before any task that creates files under `backend/` or `frontend/`.
- Each route B1–B29 and each page P1–P6 has one task: B1 (5.1), B2 (5.2), B3 (6.1), B4 (6.2), B5 (6.3), B6 (6.4), B7 (6.5), B8 (7.1), B9 (7.2), B10 (7.3), B11 (7.4), B12 (8.1), B13 (8.2), B14 (8.3), B15 (8.4), B16 (8.5), B17 (9.1), B18 (9.2), B19 (9.3), B20 (9.4), B21 (10.1), B22 (10.2), B23 (11.1), B24 (12.1), B25 (12.2), B26 (4.4), B27 (6.8), B28 (6.9), B29 (6.10); P1 (16.1), P2 (16.2), P3 (16.3), P4 (16.4), P5 (16.8), P6 (16.9).
- Task numbers 6.8–6.11, 16.17 and 16.18 were added in refinement round v2, and 15.12–15.18, 16.19–16.25, 18.5 and 20.5 in round v2.1 (see `CHANGELOG.md`). They keep their numbers so earlier references stay valid.
- The UI tasks (15.12–15.18, 16.19–16.25) follow the "UI/UX Design System" section of `design.md`; build the tokens (15.12) before any styled component.
- The comments status tests (9.7) and the component tests (18.1, 18.2) are not optional because Requirements 24.2 and 25.2 demand them.
- Task 20.4 needs the live deployment, which the user performs on Railway and Vercel.

## Task Dependency Graph

```json
{
  "waves": [
    {"id": 0, "tasks": ["1.1", "1.2", "2.1", "2.2", "2.3", "3.1"]},
    {"id": 1, "tasks": ["2.4", "2.5"]},
    {"id": 2, "tasks": ["3.2"]},
    {"id": 3, "tasks": ["4.1", "15.1"]},
    {"id": 4, "tasks": ["4.2", "4.3", "15.2", "15.3", "15.12", "15.13"]},
    {"id": 5, "tasks": ["4.4", "4.5", "15.4", "15.7", "15.8", "15.10", "15.11", "19.3", "20.1", "15.5", "15.14", "15.15", "15.18"]},
    {"id": 6, "tasks": ["4.7", "5.1", "6.1", "7.1", "8.1", "9.1", "10.1", "11.1", "12.1", "15.6", "15.9", "18.1", "15.16", "15.17", "16.23", "16.24", "16.25"]},
    {"id": 7, "tasks": ["5.2", "6.2", "6.8", "6.9", "6.10", "7.2", "8.2", "9.2", "10.2", "10.4", "11.2", "12.2", "16.1", "16.2", "16.3", "16.4", "16.8", "16.9", "16.10", "19.1", "19.2"]},
    {"id": 8, "tasks": ["5.3", "5.4", "6.3", "7.3", "8.3", "8.10", "8.11", "9.3", "9.5", "10.5", "12.3", "12.4", "12.5", "16.5", "16.12", "16.15", "16.16", "20.2", "16.19", "16.21", "16.22"]},
    {"id": 9, "tasks": ["6.4", "6.7", "7.4", "7.5", "8.4", "8.8", "9.4", "16.6", "16.13", "16.17", "18.5"]},
    {"id": 10, "tasks": ["6.5", "6.6", "8.5", "8.9", "9.6", "9.7", "16.7", "16.14", "16.18", "18.2", "16.20"]},
    {"id": 11, "tasks": ["4.6", "6.11", "8.6", "8.7", "10.3", "13.1", "13.2", "13.3", "13.4", "16.11", "20.3"]},
    {"id": 12, "tasks": ["10.6", "18.3", "21.2", "20.5"]},
    {"id": 13, "tasks": ["13.5", "21.1"]},
    {"id": 14, "tasks": ["18.4"]},
    {"id": 15, "tasks": ["19.4"]},
    {"id": 16, "tasks": ["20.4", "19.5"]},
    {"id": 17, "tasks": ["21.3"]}
  ]
}
```
