# Requirements Document

## Introduction

RevoTask is a Trello-like task manager. Users register, log in, create boards, organise cards in columns, drag cards between columns, comment on cards, receive notifications, and view board analytics. The scope is the full project: specs, guidelines, backend, frontend, tests, deployment and README.

The Backend is a Flask application (SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Marshmallow, PostgreSQL, Gunicorn) deployed on Railway. The Frontend is a Next.js application (React, TypeScript, Tailwind CSS, react-hot-toast) deployed on Vercel.

## Glossary

- **RevoTask**: The complete system, made of the Backend and the Frontend.
- **Backend**: The Flask REST API deployed on Railway.
- **Frontend**: The Next.js web application deployed on Vercel.
- **Blueprint**: A Flask blueprint package containing `routes.py`, `service.py` and `schema.py`. The eight Blueprints are auth, boards, columns, cards, comments, notifications, analytics and users.
- **Envelope**: The Backend JSON response format. A success response is `{"data": ...}`. An error response is `{"error": "..."}`.
- **User**: A registered person with a name, email and password.
- **Board**: A named container owned by a User that holds Columns.
- **Column**: An ordered list inside a Board that holds Cards. Column order is a FLOAT value.
- **Card**: A task inside a Column. A Card has a UUID primary key, `created_at`, `updated_at`, `deleted_at` and a `db.Column(db.Float)` order value.
- **Comment**: A text note attached to a Card and owned by the User who wrote the Comment.
- **Notification**: A message for a User, which is either read or unread.
- **Analytics_Service**: The service layer of the analytics Blueprint, which computes board statistics with SQLAlchemy joins.
- **CardPositionSchema**: The Marshmallow schema that validates a Card position update. The schema requires a UUID `column_id` and a positive float `order`.
- **JWT**: The JSON Web Token issued at login and sent as a Bearer token.
- **AuthContext**: The React context that stores the JWT on the Frontend.
- **ApiError**: The typed error thrown by `apiClient.ts` that carries an HTTP status code and message.
- **apiClient**: The typed fetch wrapper in `apiClient.ts`.
- **CardDetailModal**: The Frontend component that composes CommentList inside BaseModal.
- **CommentList**: The Frontend component that lists and edits Comments for a Card.
- **BaseButton**: The shared button component with the variants primary, secondary and destructive.
- **BaseBadge**: The shared badge component.
- **BaseModal**: The shared modal component.
- **NotificationBell**: The Frontend component that shows the unread Notification count.
- **useDragAndDrop**: The hook that implements native HTML5 drag and drop with optimistic update.
- **useNotifications**: The hook that polls Notifications.
- **useErrorHandler**: The hook that maps ApiError status codes to toasts.
- **Spec_Set**: The `/specs` directory with `requirements.md`, `design.md`, `tasks.md` and `CHANGELOG.md`.
- **Guideline_Set**: The `/guidelines` directory with `frontend.md`, `backend.md` and `database.md`.
- **Playwright_Suite**: The end-to-end test suite that runs against the live Vercel URL.
- **Repository**: The Git repository that holds all RevoTask files.
- **Mobile_Viewport**: A viewport width of 375 pixels.

## Requirements

### Requirement 1: Authentication endpoints

**User Story:** As a visitor, I want to register and log in, so that I can access my boards.

#### Acceptance Criteria

1. WHEN a client sends POST /api/auth/register with a valid name, email and password, THE Backend SHALL create the User and return status 201 with the User in the Envelope.
2. IF POST /api/auth/register receives an email that already exists, THEN THE Backend SHALL return status 409 with an error Envelope.
3. IF POST /api/auth/register receives a payload that fails schema validation, THEN THE Backend SHALL return status 400 with an error Envelope.
4. WHEN a client sends POST /api/auth/login with a valid email and password, THE Backend SHALL return status 200 with a JWT in the Envelope.
5. IF POST /api/auth/login receives invalid credentials, THEN THE Backend SHALL return status 401 with an error Envelope.
6. THE Backend SHALL store User passwords as salted hashes.
7. WHEN a request to a protected route lacks a valid JWT, THE Backend SHALL return status 401 with an error Envelope.

### Requirement 2: Board endpoints

**User Story:** As a User, I want to manage boards, so that I can organise my projects.

#### Acceptance Criteria

1. WHEN an authenticated User sends POST /api/boards with a valid title, THE Backend SHALL create the Board and return status 201 with the Board in the Envelope.
2. WHEN an authenticated User sends GET /api/boards, THE Backend SHALL return the Boards of that User in the Envelope.
3. WHEN an authenticated User sends GET /api/boards/<id> for an accessible Board, THE Backend SHALL return the Board with nested Columns and nested Cards in the Envelope.
4. WHEN an authenticated User sends PATCH /api/boards/<id> with valid fields, THE Backend SHALL update the Board and return the updated Board in the Envelope.
5. WHEN an authenticated User sends DELETE /api/boards/<id> for an owned Board, THE Backend SHALL delete the Board and return status 200.
6. IF a Board identified in the URL does not exist, THEN THE Backend SHALL return status 404 with an error Envelope.
7. IF a User requests a Board that the User does not own, THEN THE Backend SHALL return status 403 with an error Envelope.

### Requirement 3: Column endpoints

**User Story:** As a User, I want to create, edit, delete and reorder columns, so that I can model my workflow.

#### Acceptance Criteria

1. WHEN an authenticated User sends POST /api/boards/<id>/columns with a valid title, THE Backend SHALL create the Column with a FLOAT order value and return status 201.
2. WHEN an authenticated User sends PATCH /api/columns/<id> with valid fields, THE Backend SHALL update the Column and return the updated Column in the Envelope.
3. WHEN an authenticated User sends DELETE /api/columns/<id>, THE Backend SHALL delete the Column and return status 200.
4. WHEN an authenticated User sends PATCH /api/boards/<id>/columns/reorder with a valid list of Column identifiers and FLOAT order values, THE Backend SHALL persist the new order of the Columns.
5. IF a Column request payload fails schema validation, THEN THE Backend SHALL return status 400 with an error Envelope.
6. IF a Column identified in the URL does not exist, THEN THE Backend SHALL return status 404 with an error Envelope.

### Requirement 4: Card endpoints and model

**User Story:** As a User, I want to create, edit, move and delete cards, so that I can track tasks.

#### Acceptance Criteria

1. THE Backend SHALL define the Card model with a UUID primary key, `created_at`, `updated_at`, `deleted_at` and a `db.Column(db.Float)` order attribute.
2. WHEN an authenticated User sends POST /api/columns/<id>/cards with a valid title, THE Backend SHALL create the Card and return status 201 with the Card in the Envelope.
3. WHEN an authenticated User sends PATCH /api/cards/<id> with valid fields, THE Backend SHALL update the Card, set `updated_at` and return the updated Card in the Envelope.
4. WHEN an authenticated User sends DELETE /api/cards/<id>, THE Backend SHALL set `deleted_at` on the Card and exclude the Card from subsequent responses.
5. WHEN an authenticated User sends PATCH /api/cards/<id>/position with a payload that satisfies CardPositionSchema, THE Backend SHALL persist the new Column and the new order of the Card.
6. IF a payload for PATCH /api/cards/<id>/position contains a `column_id` that is not a UUID or an `order` that is not a positive float, THEN THE Backend SHALL return status 400 with an error Envelope.
7. IF a Card identified in the URL does not exist, THEN THE Backend SHALL return status 404 with an error Envelope.

### Requirement 5: Card filtering endpoints

**User Story:** As a User, I want to see my assigned cards and search cards, so that I can find work quickly.

#### Acceptance Criteria

1. WHEN an authenticated User sends GET /api/cards?assignee=me, THE Backend SHALL return the Cards assigned to that User in the Envelope.
2. WHEN an authenticated User sends GET /api/cards?search=<term>, THE Backend SHALL return the Cards whose title or description contains the term, matched case-insensitively, in the Envelope.
3. WHEN a User types in the Frontend search field, THE Frontend SHALL send the search request 300 milliseconds after the last keystroke.
4. IF the search term is empty, THEN THE Backend SHALL return status 400 with an error Envelope.

### Requirement 6: Comment endpoints

**User Story:** As a User, I want to comment on cards, so that I can discuss tasks with teammates.

#### Acceptance Criteria

1. WHEN an authenticated User sends POST /api/cards/<id>/comments with valid text, THE Backend SHALL create the Comment and return status 201 with the Comment in the Envelope.
2. WHEN an authenticated User sends GET /api/cards/<id>/comments, THE Backend SHALL return the Comments of the Card in the Envelope.
3. WHEN the owner of a Comment sends PATCH /api/comments/<id> with valid text, THE Backend SHALL update the Comment and return the updated Comment in the Envelope.
4. WHEN the owner of a Comment sends DELETE /api/comments/<id>, THE Backend SHALL delete the Comment and return status 200.
5. IF a Comment request payload fails schema validation, THEN THE Backend SHALL return status 400 with an error Envelope.
6. IF a Comment request lacks a valid JWT, THEN THE Backend SHALL return status 401 with an error Envelope.
7. IF a User who is not the owner sends PATCH or DELETE for a Comment, THEN THE Backend SHALL return status 403 with an error Envelope.

### Requirement 7: Notification endpoints

**User Story:** As a User, I want to see notifications, so that I know when something relevant happens.

#### Acceptance Criteria

1. WHEN an authenticated User sends GET /api/notifications with `page` and `per_page` parameters, THE Backend SHALL return the requested page of Notifications of that User in the Envelope.
2. WHEN an authenticated User sends PATCH /api/notifications/<id>/read for an owned Notification, THE Backend SHALL mark the Notification as read.
3. IF a User sends PATCH /api/notifications/<id>/read for a Notification that belongs to another User, THEN THE Backend SHALL return status 403 with an error Envelope.
4. IF `page` or `per_page` is not a positive integer, THEN THE Backend SHALL return status 400 with an error Envelope.

### Requirement 8: Analytics endpoint

**User Story:** As a User, I want board statistics, so that I can see progress and team activity.

#### Acceptance Criteria

1. WHEN an authenticated User sends GET /api/boards/<id>/analytics for an accessible Board, THE Backend SHALL return the number of Cards per Column, the number of Cards completed this week and the activity per member in the Envelope.
2. THE Analytics_Service SHALL compute the statistics with SQLAlchemy joins in the service layer.
3. IF the Board identified in the URL does not exist, THEN THE Backend SHALL return status 404 with an error Envelope.
4. IF a User requests analytics for a Board that the User does not own, THEN THE Backend SHALL return status 403 with an error Envelope.

### Requirement 9: User profile endpoints

**User Story:** As a User, I want to view and edit my profile, so that I can keep my details current.

#### Acceptance Criteria

1. WHEN an authenticated User sends GET /api/users/me, THE Backend SHALL return the User profile without the password field in the Envelope.
2. WHEN an authenticated User sends PATCH /api/users/me with a valid name or email, THE Backend SHALL update only the name and the email and return the updated profile without the password field.
3. IF PATCH /api/users/me contains a password field, THEN THE Backend SHALL ignore the password field and leave the stored password unchanged.
4. IF PATCH /api/users/me contains an email that belongs to another User, THEN THE Backend SHALL return status 409 with an error Envelope.

### Requirement 10: Health endpoint

**User Story:** As an operator, I want a health check, so that I can verify the deployment.

#### Acceptance Criteria

1. WHEN a client sends GET /api/health, THE Backend SHALL return status 200 with `{"data": {"status": "ok"}}` without requiring a JWT.

### Requirement 11: Backend structure and response format

**User Story:** As a developer, I want a consistent backend structure, so that the code stays maintainable.

#### Acceptance Criteria

1. THE Backend SHALL contain eight Blueprints named auth, boards, columns, cards, comments, notifications, analytics and users.
2. THE Backend SHALL provide `routes.py`, `service.py` and `schema.py` in each Blueprint.
3. THE Backend SHALL return every response in the Envelope format.
4. THE Backend SHALL validate every request payload with a Marshmallow schema.
5. THE Backend SHALL manage database schema changes with Flask-Migrate migrations.
6. IF an unhandled exception occurs, THEN THE Backend SHALL return status 500 with an error Envelope that contains no stack trace.

### Requirement 12: Registration and login pages

**User Story:** As a visitor, I want register and login pages, so that I can create an account and sign in.

#### Acceptance Criteria

1. THE Frontend SHALL provide the /register page with name, email and password fields.
2. THE Frontend SHALL provide the /login page with email and password fields.
3. WHEN a visitor submits valid registration data, THE Frontend SHALL call POST /api/auth/register and redirect to /login.
4. WHEN a visitor submits valid login credentials, THE Frontend SHALL call POST /api/auth/login, store the JWT in AuthContext and redirect to /.
5. IF the Backend returns an error for registration or login, THEN THE Frontend SHALL show an error toast with react-hot-toast.
6. WHILE no JWT is present in AuthContext, THE Frontend SHALL redirect requests for protected pages to /login.

### Requirement 13: Dashboard page

**User Story:** As a User, I want a dashboard, so that I can see and create my boards.

#### Acceptance Criteria

1. THE Frontend SHALL render the / page as a Server Component that lists the Boards of the User.
2. WHEN a User submits the create-board form with a valid title, THE Frontend SHALL call POST /api/boards and show the new Board in the list.
3. WHEN a User selects a Board, THE Frontend SHALL navigate to /boards/[id].
4. WHILE the User has no Boards, THE Frontend SHALL show an empty-state message.

### Requirement 14: Kanban board page

**User Story:** As a User, I want a Kanban board, so that I can manage cards visually.

#### Acceptance Criteria

1. THE Frontend SHALL render the /boards/[id] page as a Server Component that shows the Columns and Cards of the Board in ascending order value.
2. WHEN a User submits the add-column form, THE Frontend SHALL call POST /api/boards/<id>/columns and show the new Column.
3. WHEN a User submits the add-card form in a Column, THE Frontend SHALL call POST /api/columns/<id>/cards and show the new Card in that Column.
4. WHEN a User selects a Card, THE Frontend SHALL open CardDetailModal for that Card.
5. THE Frontend SHALL display the analytics of the Board from GET /api/boards/<id>/analytics.
6. WHEN a User reloads /boards/[id], THE Frontend SHALL show each Card in the Column and at the order position last persisted by the Backend.

### Requirement 15: Drag and drop

**User Story:** As a User, I want to drag cards between columns, so that I can update task status quickly.

#### Acceptance Criteria

1. THE useDragAndDrop SHALL implement drag and drop with native HTML5 drag events and no third-party drag-and-drop library.
2. WHEN a User drops a Card on a Column position, THE useDragAndDrop SHALL update the displayed position before the API response arrives.
3. WHEN a User drops a Card, THE useDragAndDrop SHALL call PATCH /api/cards/<id>/position with the target `column_id` and a FLOAT order between the neighbouring Cards.
4. IF PATCH /api/cards/<id>/position returns an error, THEN THE useDragAndDrop SHALL revert the displayed position to the position before the drop and trigger an error toast.

### Requirement 16: Card detail and comments UI

**User Story:** As a User, I want to view and discuss a card in a modal, so that I can work on the task in context.

#### Acceptance Criteria

1. THE CardDetailModal SHALL compose CommentList inside BaseModal.
2. WHEN CardDetailModal opens, THE CommentList SHALL load Comments from GET /api/cards/<id>/comments.
3. WHEN a User submits a new Comment, THE CommentList SHALL call POST /api/cards/<id>/comments and append the Comment to the list.
4. WHILE the signed-in User owns a Comment, THE CommentList SHALL show edit and delete controls for that Comment.
5. WHILE the signed-in User does not own a Comment, THE CommentList SHALL hide edit and delete controls for that Comment.
6. WHEN a User presses the Escape key while BaseModal is open, THE BaseModal SHALL close.

### Requirement 17: My tasks page and search

**User Story:** As a User, I want a page with my assigned cards, so that I can focus on my own work.

#### Acceptance Criteria

1. THE Frontend SHALL provide the /my-tasks page that lists Cards from GET /api/cards?assignee=me.
2. WHEN a User types a term in the search field on /my-tasks, THE Frontend SHALL call GET /api/cards?search=<term> after a 300 millisecond debounce and show the matching Cards.
3. WHILE a request for Cards is pending, THE Frontend SHALL show a loading indicator.
4. IF the list of Cards is empty, THEN THE Frontend SHALL show an empty-state message.

### Requirement 18: Profile page

**User Story:** As a User, I want a profile page, so that I can update my name and email.

#### Acceptance Criteria

1. THE Frontend SHALL provide the /profile page that shows the name and email from GET /api/users/me.
2. WHEN a User submits a valid name and email, THE Frontend SHALL call PATCH /api/users/me and show a success toast.
3. IF PATCH /api/users/me returns an error, THEN THE Frontend SHALL show an error toast.

### Requirement 19: Notifications UI

**User Story:** As a User, I want to see unread notifications, so that I notice new activity.

#### Acceptance Criteria

1. THE NotificationBell SHALL show the count of unread Notifications.
2. THE useNotifications SHALL poll GET /api/notifications every 30 seconds.
3. WHEN a User marks a Notification as read, THE Frontend SHALL call PATCH /api/notifications/<id>/read and decrease the unread count by one.
4. WHEN the unread count is zero, THE NotificationBell SHALL hide the count badge.
5. WHEN the signed-in User leaves the page or signs out, THE useNotifications SHALL stop polling.

### Requirement 20: Shared components

**User Story:** As a developer, I want reusable base components, so that the interface stays consistent.

#### Acceptance Criteria

1. THE BaseButton SHALL support the variants primary, secondary and destructive.
2. THE BaseBadge SHALL render a short text label.
3. THE BaseModal SHALL render a titled overlay with a close control.
4. WHILE the `disabled` property of BaseButton is true, THE BaseButton SHALL ignore click events.

### Requirement 21: API client and error handling

**User Story:** As a developer, I want one typed API client, so that requests and errors are handled consistently.

#### Acceptance Criteria

1. THE apiClient SHALL be a typed fetch wrapper in `apiClient.ts`.
2. WHERE the code runs in the browser, THE apiClient SHALL use NEXT_PUBLIC_API_BASE_URL as the base URL.
3. WHERE the code runs on the server, THE apiClient SHALL use API_BASE_URL as the base URL.
4. WHILE a JWT is present, THE apiClient SHALL send the JWT in the Authorization header as a Bearer token.
5. IF the Backend returns a non-2xx status, THEN THE apiClient SHALL throw an ApiError with the status code and the error message.
6. WHEN useErrorHandler receives an ApiError, THE useErrorHandler SHALL map the status code to a toast message through `errors.ts` and `toast.ts`.
7. WHEN useErrorHandler receives an ApiError with status 401, THE useErrorHandler SHALL clear the JWT from AuthContext and redirect to /login.
8. THE AuthContext SHALL keep the JWT in memory-backed React state.

### Requirement 22: Specs deliverables

**User Story:** As a reviewer, I want complete specs, so that I can trace requirements to implementation.

#### Acceptance Criteria

1. THE Spec_Set SHALL contain `requirements.md`, `design.md`, `tasks.md` and `CHANGELOG.md`.
2. THE Spec_Set SHALL contain at least one acceptance criterion for every requirement.
3. THE Spec_Set SHALL map every acceptance criterion to a route or a page.
4. THE Spec_Set SHALL contain at least one task in `tasks.md` for every route and every page.
5. THE `CHANGELOG.md` SHALL contain at least 5 entries, and each entry SHALL show a before state and an after state.

### Requirement 23: Guidelines deliverables

**User Story:** As a reviewer, I want written guidelines, so that code follows agreed rules.

#### Acceptance Criteria

1. THE Guideline_Set SHALL contain `frontend.md`, `backend.md` and `database.md`.
2. THE Guideline_Set SHALL describe every rule with a Rule, a Rationale and an Example.
3. THE Guideline_Set SHALL contain no rules that contradict each other.
4. THE Guideline_Set SHALL contain one comparison of AI output before and after the guidelines were applied.
5. THE Guideline_Set SHALL contain a violation report that lists at least 3 violations.
6. THE Repository SHALL contain the Guideline_Set in a commit that precedes the first commit of Backend or Frontend code.

### Requirement 24: Backend tests

**User Story:** As a developer, I want automated backend tests, so that regressions are caught.

#### Acceptance Criteria

1. WHEN `pytest -v` runs in the Backend project, THE Backend test suite SHALL execute all tests and pass.
2. THE Backend test suite SHALL include comments tests that assert status 201, 400, 401 and 403.

### Requirement 25: Frontend tests

**User Story:** As a developer, I want component tests, so that UI behaviour is verified.

#### Acceptance Criteria

1. WHEN `npm test` runs in the Frontend project, THE Frontend test suite SHALL execute React Testing Library tests and pass.
2. THE Frontend test suite SHALL cover BaseButton, BaseModal, CardDetailModal and NotificationBell.

### Requirement 26: End-to-end tests

**User Story:** As a developer, I want end-to-end tests on the live site, so that the deployed system is verified.

#### Acceptance Criteria

1. THE Playwright_Suite SHALL run against the live Vercel URL.
2. THE Playwright_Suite SHALL contain 4 auth scenarios.
3. THE Playwright_Suite SHALL contain a Kanban journey of 8 steps that includes drag and drop and verification of Card position persistence after a page reload.
4. THE Playwright_Suite SHALL wait on observable conditions and use no `waitForTimeout` calls.
5. THE Repository SHALL contain the committed Playwright HTML report.

### Requirement 27: Deployment

**User Story:** As a stakeholder, I want RevoTask live, so that users can reach the application.

#### Acceptance Criteria

1. THE Backend SHALL be deployed on Railway and run with Gunicorn.
2. WHEN the Backend deploys on Railway, THE deployment process SHALL run `flask db upgrade`.
3. THE deployment SHALL verify GET /api/health, POST /api/auth/register and POST /api/auth/login in Postman against the Railway URL.
4. THE Frontend SHALL be deployed on Vercel.
5. WHILE the viewport is the Mobile_Viewport, THE Frontend SHALL render every page without horizontal scrolling and with all controls reachable.

### Requirement 28: Repository hygiene

**User Story:** As a developer, I want a clean repository, so that secrets and build output stay out of version control.

#### Acceptance Criteria

1. THE Repository SHALL contain a `.gitignore` that excludes `.env*`, `__pycache__`, `.next/` and `node_modules/`.
2. THE Repository SHALL contain a committed `.env.example` in the Backend project and in the Frontend project.
3. THE Repository SHALL contain commits that cover specs, guidelines, backend, frontend, tests and deployment.

### Requirement 29: README

**User Story:** As a new contributor, I want a README, so that I can understand and run the project.

#### Acceptance Criteria

1. THE README SHALL contain an overview, an AI workflow summary, a feature list, a technology list, local run steps, test steps and screenshots.

### Requirement 30: Non-functional requirements

**User Story:** As a User, I want a fast, secure and reliable application, so that I can trust RevoTask with my work.

#### Acceptance Criteria

1. WHEN the Backend receives a request to a non-analytics endpoint under normal load, THE Backend SHALL respond within 500 milliseconds at the 95th percentile.
2. THE Backend SHALL read the secrets JWT secret key and database URL from environment variables.
3. THE Backend SHALL allow cross-origin requests only from the configured Frontend origin.
4. THE Backend SHALL use SQLAlchemy parameterised queries for all database access.
5. WHEN a Card moves, THE Backend SHALL update only the moved Card row and leave the order values of other Cards unchanged.
