# Implementation Plan: RevoTask

## Overview

RevoTask is built in this order: specs, guidelines, a commit gate, backend, frontend, tests, deployment and README. The Backend is Python (Flask). The Frontend is TypeScript (Next.js). The guidelines tasks (group 2) and the commit gate (group 3) come before every task that creates files under `backend/` or `frontend/`, which satisfies Requirement 23.6. Each backend route (B1–B26) and each frontend page (P1–P6) has its own task. Route and page identifiers refer to the tables in `design.md`.

## Tasks

- [ ] 1. Specs deliverables
  - [ ] 1.1 Create the `/specs` directory with the Spec_Set
    - Copy `requirements.md`, `design.md` and `tasks.md` into `/specs`
    - Write `/specs/CHANGELOG.md` with at least 5 entries, each with a "Before" and an "After" state
    - Keep the design traceability table (every AC mapped to a route or page)
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [ ] 1.2 Create repository hygiene files
    - Create the root `.gitignore` excluding `.env*`, `__pycache__`, `.next/` and `node_modules/`
    - Keep `!.env.example` un-ignored so the examples can be committed
    - _Requirements: 28.1_

- [ ] 2. Guidelines deliverables (must precede all backend and frontend code)
  - [ ] 2.1 Write `/guidelines/backend.md`
    - Cover Blueprint layout, Envelope, Marshmallow validation, error handling, JWT, ownership checks, CORS, secrets, tests
    - Write every rule as Rule, Rationale and Example
    - _Requirements: 23.1, 23.2_

  - [ ] 2.2 Write `/guidelines/database.md`
    - Cover UUID keys, timestamps, soft delete, Float order, indexes, Flask-Migrate and parameterised queries
    - Write every rule as Rule, Rationale and Example
    - _Requirements: 23.1, 23.2_

  - [ ] 2.3 Write `/guidelines/frontend.md`
    - Cover App Router and Server Components, `apiClient`, AuthContext, error handling, Tailwind, shared components, native drag and drop, mobile viewport
    - Write every rule as Rule, Rationale and Example
    - _Requirements: 23.1, 23.2_

  - [ ] 2.4 Write the AI output comparison and the violation report
    - Create `/guidelines/ai-comparison.md` with one before and after comparison of AI output
    - Create `/guidelines/violation-report.md` listing at least 3 violations
    - _Requirements: 23.4, 23.5_

  - [ ] 2.5 Review the Guideline_Set for contradictions
    - Read the three guideline files together and resolve any rules that conflict
    - Confirm every rule still has Rule, Rationale and Example
    - _Requirements: 23.2, 23.3_

- [ ] 3. Commit gate: specs and guidelines first
  - [ ] 3.1 Add `scripts/check-guidelines-first.ps1`
    - Compare the first commit that adds files under `backend/` or `frontend/` with the guidelines commit using `git log --diff-filter=A`
    - Exit non-zero if a code commit precedes the guidelines commit
    - _Requirements: 23.6_

  - [ ] 3.2 Commit specs and guidelines
    - Create a commit for `/specs`, `.gitignore` and the scripts
    - Create a separate later commit for `/guidelines`
    - Do not add any file under `backend/` or `frontend/` in these commits
    - _Requirements: 23.6, 28.3_

- [ ] 4. Backend foundation
  - [ ] 4.1 Scaffold the Flask project
    - Create `backend/app/__init__.py` (`create_app`), `extensions.py`, config from environment variables, `wsgi.py`, `requirements.txt`
    - Create the eight Blueprint packages, each with `routes.py`, `service.py` and `schema.py`, and register them
    - Create `backend/.env.example` with JWT secret key, database URL and frontend origin
    - Configure CORS for `FRONTEND_ORIGIN` only
    - _Requirements: 11.1, 11.2, 28.2, 30.2, 30.3_

  - [ ] 4.2 Implement the Envelope, error handlers and access helpers
    - Create `common/envelope.py` (`ok`, `fail`), `common/errors.py` (`AppError` and handlers for validation, JWT and 500 without stack trace) and `common/access.py`
    - Check 404 before 403 in `get_accessible_board`
    - _Requirements: 1.7, 11.3, 11.4, 11.6_

  - [ ] 4.3 Implement the data models and the first migration
    - Create User, Board, Column, Card, Comment and Notification models with UUID keys, timestamps, Float `order` and Card `deleted_at`
    - Add the indexes from the design and generate the Flask-Migrate migration
    - _Requirements: 4.1, 11.5, 30.4_

  - [ ] 4.4 Implement B26: GET /api/health
    - Create `health.py` returning `{"data": {"status": "ok"}}` without JWT
    - _Requirements: 10.1_

  - [ ] 4.5 Create pytest fixtures
    - Create `backend/tests/conftest.py` with the app, test database, client, user factory and JWT helper
    - _Requirements: 24.1_

  - [ ]* 4.6 Write property test for the Envelope
    - **Property 25: Envelope on every response**
    - **Validates: Requirements 11.3, 11.6**

  - [ ]* 4.7 Write example tests for health and structure
    - Test B26, the eight Blueprint packages and the three files in each
    - _Requirements: 10.1, 11.1, 11.2_

- [ ] 5. Backend: auth Blueprint
  - [ ] 5.1 Implement B1: POST /api/auth/register
    - Add the schema, service (salted hash with `generate_password_hash`) and route
    - Return 201, 400 or 409
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [ ] 5.2 Implement B2: POST /api/auth/login
    - Verify the hash and return a JWT, or 401 with the same message for unknown email and wrong password
    - _Requirements: 1.4, 1.5, 1.6_

  - [ ]* 5.3 Write property test for wrong credentials
    - **Property 4: Wrong credentials are rejected**
    - **Validates: Requirements 1.5**

  - [ ]* 5.4 Write property test for password hashing
    - **Property 5: Passwords are salted hashes**
    - **Validates: Requirements 1.6**

- [ ] 6. Backend: boards Blueprint
  - [ ] 6.1 Implement B3: POST /api/boards
    - _Requirements: 2.1_

  - [ ] 6.2 Implement B4: GET /api/boards
    - Return only the Boards of the requesting User
    - _Requirements: 2.2_

  - [ ] 6.3 Implement B5: GET /api/boards/<id>
    - Return the Board with nested Columns and live Cards, ordered by `order`
    - Return 404 and 403 through `get_accessible_board`
    - _Requirements: 2.3, 2.6, 2.7_

  - [ ] 6.4 Implement B6: PATCH /api/boards/<id>
    - _Requirements: 2.4, 2.6, 2.7_

  - [ ] 6.5 Implement B7: DELETE /api/boards/<id>
    - _Requirements: 2.5, 2.6, 2.7_

  - [ ]* 6.6 Write property test for board update
    - **Property 10: Board update applies the given fields**
    - **Validates: Requirements 2.4**

  - [ ]* 6.7 Write property test for board create and fetch
    - **Property 9: Board create and fetch round trip**
    - **Validates: Requirements 2.1, 2.2, 2.3, 4.2**

- [ ] 7. Backend: columns Blueprint
  - [ ] 7.1 Implement B8: POST /api/boards/<id>/columns
    - Assign a Float order after the last Column
    - _Requirements: 3.1, 3.5, 3.6_

  - [ ] 7.2 Implement B9: PATCH /api/boards/<id>/columns/reorder
    - Validate the list of identifiers and Float orders and persist them
    - _Requirements: 3.4, 3.5, 3.6_

  - [ ] 7.3 Implement B10: PATCH /api/columns/<id>
    - _Requirements: 3.2, 3.5, 3.6_

  - [ ] 7.4 Implement B11: DELETE /api/columns/<id>
    - _Requirements: 3.3, 3.6_

  - [ ]* 7.5 Write property test for column reorder
    - **Property 11: Column reorder round trip**
    - **Validates: Requirements 3.1, 3.4**

- [ ] 8. Backend: cards Blueprint
  - [ ] 8.1 Implement B12: POST /api/columns/<id>/cards
    - Create the Card with a Float order and return 201
    - _Requirements: 4.1, 4.2, 4.7_

  - [ ] 8.2 Implement B13: GET /api/cards?assignee=me and ?search=<term>
    - Use bound parameters, escape `%` and `_`, match case-insensitively on title and description, exclude soft-deleted Cards
    - Return 400 for an empty or whitespace term
    - _Requirements: 5.1, 5.2, 5.4, 30.4_

  - [ ] 8.3 Implement B14: PATCH /api/cards/<id>
    - Update fields and `updated_at`, return 404 for unknown or deleted Cards
    - _Requirements: 4.3, 4.7_

  - [ ] 8.4 Implement B15: DELETE /api/cards/<id>
    - Set `deleted_at` and exclude the Card from later responses
    - _Requirements: 4.4, 4.7_

  - [ ] 8.5 Implement B16: PATCH /api/cards/<id>/position
    - Add `CardPositionSchema` (UUID `column_id`, positive float `order`)
    - Update only the moved Card row and check ownership through the target Column
    - _Requirements: 4.5, 4.6, 4.7, 30.5_

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
  - [ ] 9.1 Implement B17: POST /api/cards/<id>/comments
    - _Requirements: 6.1, 6.5, 6.6_

  - [ ] 9.2 Implement B18: GET /api/cards/<id>/comments
    - _Requirements: 6.2, 6.6_

  - [ ] 9.3 Implement B19: PATCH /api/comments/<id>
    - Allow the owner only and return 403 otherwise
    - _Requirements: 6.3, 6.5, 6.7_

  - [ ] 9.4 Implement B20: DELETE /api/comments/<id>
    - Allow the owner only and return 403 otherwise
    - _Requirements: 6.4, 6.7_

  - [ ]* 9.5 Write property test for comment create and list
    - **Property 19: Comment create and list round trip**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 9.6 Write property test for comment owner edit and delete
    - **Property 20: Comment owner can edit and delete**
    - **Validates: Requirements 6.3, 6.4**

  - [ ] 9.7 Write the comments status-code tests
    - Create `backend/tests/test_comments.py` asserting 201, 400, 401 and 403
    - _Requirements: 24.2_

- [ ] 10. Backend: notifications Blueprint
  - [ ] 10.1 Implement B21: GET /api/notifications?page&per_page
    - Return 400 when `page` or `per_page` is not a positive integer
    - _Requirements: 7.1, 7.4_

  - [ ] 10.2 Implement B22: PATCH /api/notifications/<id>/read
    - Return 403 for another User's Notification
    - _Requirements: 7.2, 7.3_

  - [ ] 10.3 Create Notifications from card assignment and comments
    - Add service hooks in `cards/service.py` and `comments/service.py` (design assumption)
    - _Requirements: 7.1_

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
  - [ ] 11.1 Implement B23: GET /api/boards/<id>/analytics
    - Compute cards per Column, cards completed this week and activity per member with SQLAlchemy joins in `analytics/service.py`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 11.2 Write property test for analytics
    - **Property 23: Analytics matches a reference model**
    - **Validates: Requirements 8.1**

- [ ] 12. Backend: users Blueprint
  - [ ] 12.1 Implement B24: GET /api/users/me
    - Return the profile without the password field
    - _Requirements: 9.1_

  - [ ] 12.2 Implement B25: PATCH /api/users/me
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

  - [ ]* 13.3 Write property test for ownership
    - **Property 7: Resource ownership is enforced**
    - **Validates: Requirements 2.7, 6.3, 6.4, 6.7, 7.3, 8.4**

  - [ ]* 13.4 Write property test for unknown identifiers
    - **Property 8: Unknown identifiers return 404**
    - **Validates: Requirements 2.6, 3.6, 4.7, 8.3**

  - [ ] 13.5 Commit the Backend
    - Run `pytest -v`, then commit `backend/` with its `.env.example`
    - _Requirements: 24.1, 28.2, 28.3_

- [ ] 14. Checkpoint - Backend
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Frontend foundation
  - [ ] 15.1 Scaffold the Next.js project
    - Create `frontend/` with App Router, TypeScript, Tailwind CSS, react-hot-toast, Jest and React Testing Library
    - Create `frontend/.env.example` with `NEXT_PUBLIC_API_BASE_URL` and `API_BASE_URL`
    - _Requirements: 25.1, 28.2_

  - [ ] 15.2 Implement `apiClient.ts`, `errors.ts`, `toast.ts` and `order.ts`
    - `apiClient` picks the base URL by environment, sends the Bearer header and throws `ApiError`
    - `computeOrder` returns a value between neighbours
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 15.3_

  - [ ] 15.3 Implement AuthContext and the route guard
    - Keep the JWT in React state only and redirect to /login when it is missing
    - _Requirements: 12.6, 21.8_

  - [ ] 15.4 Implement `useErrorHandler`
    - Map status codes to toasts and clear the JWT and go to /login on 401
    - _Requirements: 21.6, 21.7_

  - [ ] 15.5 Implement BaseButton, BaseBadge and BaseModal
    - BaseButton variants primary, secondary and destructive, ignoring clicks while disabled
    - BaseModal with title, close control and Escape to close
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 16.6_

  - [ ] 15.6 Implement the root layout
    - Create `layout.tsx` with AuthProvider, the Toaster and a responsive navigation to /, /my-tasks and /profile
    - _Requirements: 12.6, 27.5_

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
    - **Validates: Requirements 12.6**

- [ ] 16. Frontend pages and features
  - [ ] 16.1 Implement P1: /register
    - Form with name, email and password, call B1, redirect to /login, error toast
    - _Requirements: 12.1, 12.3, 12.5_

  - [ ] 16.2 Implement P2: /login
    - Form with email and password, call B2, store the JWT in AuthContext, redirect to /
    - _Requirements: 12.2, 12.4, 12.5_

  - [ ] 16.3 Implement P3: / (dashboard)
    - Server Component list of Boards (B4), client create-board form (B3), link to /boards/[id], empty state
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ] 16.4 Implement P4: /boards/[id] (Kanban page)
    - Server Component page that renders Columns and Cards in ascending order (B5)
    - Add-column form (B8) and add-card form (B12)
    - _Requirements: 14.1, 14.2, 14.3, 14.6_

  - [ ] 16.5 Implement `useDragAndDrop` and wire it into P4
    - Native HTML5 events, optimistic update, call B16 with `computeOrder`, revert and toast on error
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ] 16.6 Implement CommentList and CardDetailModal and wire them into P4
    - Open the modal on Card click, load B18, post B17, edit B19 and delete B20 for owned Comments only
    - _Requirements: 14.4, 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ] 16.7 Add the analytics panel to P4
    - Show the data from B23 on the Kanban page
    - _Requirements: 14.5_

  - [ ] 16.8 Implement P5: /my-tasks
    - List Cards from B13 `assignee=me`, search with a 300 ms debounced `useDebouncedValue`, loading indicator and empty state
    - _Requirements: 5.3, 17.1, 17.2, 17.3, 17.4_

  - [ ] 16.9 Implement P6: /profile
    - Show name and email from B24, submit B25, success and error toasts
    - _Requirements: 18.1, 18.2, 18.3_

  - [ ] 16.10 Implement `useNotifications` and NotificationBell
    - Poll B21 every 30 seconds, mark read with B22, hide the badge at zero, stop polling on unmount and sign-out
    - Add the bell to the shared layout
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ] 16.11 Make every page usable at the Mobile_Viewport
    - Use responsive Tailwind classes so pages at 375 px have no horizontal scroll and all controls are reachable
    - _Requirements: 27.5_

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

- [ ] 17. Checkpoint - Frontend
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Frontend tests and commit
  - [ ] 18.1 Write component tests for BaseButton and BaseModal
    - Test variants, the disabled state, the close control and Escape
    - _Requirements: 20.1, 20.3, 20.4, 16.6, 25.2_

  - [ ] 18.2 Write component tests for CardDetailModal and NotificationBell
    - Test that CommentList loads inside the modal, and that the badge shows and hides
    - _Requirements: 16.1, 16.2, 19.1, 19.4, 25.2_

  - [ ]* 18.3 Write example tests for the pages
    - Test forms, redirects and toasts for P1, P2, P3, P5 and P6
    - _Requirements: 12.3, 12.4, 12.5, 13.2, 17.3, 17.4, 18.2, 18.3_

  - [ ] 18.4 Commit the Frontend
    - Run `npm test`, then commit `frontend/` with its `.env.example`
    - _Requirements: 25.1, 28.2, 28.3_

- [ ] 19. Deployment configuration
  - [ ] 19.1 Add the Railway configuration for the Backend
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

- [ ] 20. End-to-end tests
  - [ ] 20.1 Configure Playwright
    - Read the live Vercel URL from an environment variable and enable the HTML reporter
    - Do not ignore the report directory so it can be committed
    - _Requirements: 26.1, 26.5_

  - [ ] 20.2 Write the 4 auth scenarios
    - Wait on observable conditions and never call `waitForTimeout`
    - _Requirements: 26.2, 26.4_

  - [ ] 20.3 Write the 8-step Kanban journey
    - Include drag and drop and a page reload that verifies the Card position persisted
    - _Requirements: 26.3, 26.4_

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
- Each route B1–B26 and each page P1–P6 has one task: B1 (5.1), B2 (5.2), B3 (6.1), B4 (6.2), B5 (6.3), B6 (6.4), B7 (6.5), B8 (7.1), B9 (7.2), B10 (7.3), B11 (7.4), B12 (8.1), B13 (8.2), B14 (8.3), B15 (8.4), B16 (8.5), B17 (9.1), B18 (9.2), B19 (9.3), B20 (9.4), B21 (10.1), B22 (10.2), B23 (11.1), B24 (12.1), B25 (12.2), B26 (4.4); P1 (16.1), P2 (16.2), P3 (16.3), P4 (16.4), P5 (16.8), P6 (16.9).
- The comments status tests (9.7) and the component tests (18.1, 18.2) are not optional because Requirements 24.2 and 25.2 demand them.
- Task 20.4 needs the live deployment, which the user performs on Railway and Vercel.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "2.2", "2.3", "3.1"] },
    { "id": 1, "tasks": ["2.4", "2.5"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["4.1", "15.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "15.2", "15.3", "15.5"] },
    { "id": 5, "tasks": ["4.4", "4.5", "15.4", "15.7", "15.8", "15.10", "15.11", "18.1", "19.3", "20.1"] },
    { "id": 6, "tasks": ["4.7", "5.1", "6.1", "7.1", "8.1", "9.1", "10.1", "11.1", "12.1", "15.6", "15.9"] },
    { "id": 7, "tasks": ["5.2", "6.2", "7.2", "8.2", "9.2", "10.2", "10.4", "11.2", "12.2", "16.1", "16.2", "16.3", "16.4", "16.8", "16.9", "16.10", "19.1", "19.2"] },
    { "id": 8, "tasks": ["5.3", "5.4", "6.3", "7.3", "8.3", "8.10", "8.11", "9.3", "9.5", "10.5", "12.3", "12.4", "12.5", "16.5", "16.12", "16.15", "16.16", "20.2"] },
    { "id": 9, "tasks": ["6.4", "6.7", "7.4", "7.5", "8.4", "8.8", "9.4", "16.6", "16.13"] },
    { "id": 10, "tasks": ["6.5", "6.6", "8.5", "8.9", "9.6", "9.7", "16.7", "16.14", "18.2"] },
    { "id": 11, "tasks": ["4.6", "8.6", "8.7", "10.3", "13.1", "13.2", "13.3", "13.4", "16.11", "20.3"] },
    { "id": 12, "tasks": ["10.6", "18.3", "21.2"] },
    { "id": 13, "tasks": ["13.5", "21.1"] },
    { "id": 14, "tasks": ["18.4"] },
    { "id": 15, "tasks": ["19.4"] },
    { "id": 16, "tasks": ["20.4"] },
    { "id": 17, "tasks": ["21.3"] }
  ]
}
```
