# Requirements Document

## Introduction

RevoTask is a Trello-like task manager. Users register, log in, create boards, organise cards in columns, drag cards between columns, comment on cards, receive notifications, and view board analytics. The scope is the full project: specs, guidelines, backend, frontend, tests, deployment and README.

RevoTask has two roles per Board, as defined in the project brief (`brief.md`):

- **Board_Member**: creates and edits Columns and Cards, moves Cards, comments, and tracks assigned Cards.
- **Board_Admin**: everything a Board_Member can do, plus managing member access, renaming and deleting the Board, and viewing analytics.

The Backend is a Flask application (SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Marshmallow, PostgreSQL) deployed on Render and served by Gunicorn, with its PostgreSQL database on Supabase. The Frontend is a Next.js application (React, TypeScript, Tailwind CSS, react-hot-toast) deployed on Vercel.

## Glossary

- **RevoTask**: The complete system, made of the Backend and the Frontend.
- **Backend**: The Flask REST API deployed on Render (Gunicorn), using a Supabase PostgreSQL database.
- **Frontend**: The Next.js web application deployed on Vercel.
- **Blueprint**: A Flask blueprint package under `app/blueprints/<name>/` containing `routes.py`, `service.py` and `schema.py`. The brief's eight Blueprints are auth, boards, columns, cards, comments, notifications, analytics and users; a ninth, media, holds card images and signed image delivery (R42, R43).
- **Media**: An uploaded image stored by the Backend as AVIF: a User's avatar or a Card attachment.
- **Signed_URL**: A short-lived image URL carrying its own expiry and HMAC signature, so `<img>` tags can load it without the JWT.
- **Board_Stage**: The area of /boards/[id] below the Top_Bar that holds the Kanban columns and the column dock.
- **Tide_Clock**: The clock above the Profile_Capsule showing the time, the date and the tide of the day.
- **Envelope**: The Backend JSON response format. A success response is `{"data": ...}`. An error response is `{"error": "..."}`.
- **User**: A registered person with a name, email and password.
- **Board**: A container with a `name` that holds Columns. Each Board has one or more Board_Admins.
- **Board_Member**: A User who has access to a Board through a membership row with the role `member` or `admin`.
- **Board_Admin**: A Board_Member whose role is `admin`. The User who creates a Board becomes its first Board_Admin.
- **Column**: An ordered list with a `name` inside a Board that holds Cards. Column order is a FLOAT value.
- **Card**: A task inside a Column. A Card has a UUID primary key, `created_at`, `updated_at`, `deleted_at` and a `db.Column(db.Float)` order value.
- **Comment**: A text note attached to a Card and owned by the User who wrote the Comment.
- **Notification**: A message for a User, which is either read or unread.
- **Analytics_Service**: The service layer of the analytics Blueprint, which computes board statistics with SQLAlchemy joins.
- **CardPositionSchema**: The Marshmallow schema that validates a Card position update. The schema requires a UUID `column_id` and a positive float `order`.
- **JWT**: The JSON Web Token issued at login and sent as a Bearer token.
- **AuthContext**: The React context that holds the JWT and the current User on the Frontend.
- **Session_Cookie**: The `revotask_token` cookie that holds the JWT so that Server Components and the Middleware can read it and the session survives a page reload.
- **Middleware**: The Next.js route guard that runs before protected pages render (`proxy.ts` in Next.js 16, formerly `middleware.ts`).
- **ApiError**: The typed error class in `lib/errors.ts`, thrown by `lib/apiClient.ts`, with the fields `statusCode` and `message`.
- **apiClient**: The typed fetch wrapper in `lib/apiClient.ts`.
- **CardDetailModal**: The Frontend component that composes CommentList inside BaseModal.
- **CommentList**: The Frontend component that lists and edits Comments for a Card.
- **BaseButton**: The shared button component in `components/shared/` with the variants primary, secondary and destructive.
- **BaseBadge**: The shared badge component in `components/shared/` with color variants.
- **BaseModal**: The shared modal component in `components/shared/`, used as the wrapper for every form shown in a modal.
- **Move_Control**: The "Move to" select on each Card that moves the Card without dragging, for touch screens and keyboard users.
- **Design_Tokens**: The named colors, radii, blur levels, shadows, durations and easings defined once in `app/globals.css` with the Tailwind `@theme` directive.
- **Glass_Pane**: A large frosted surface that blurs what is behind it (`backdrop-filter`): the Sidebar, the Top_Bar, Kanban Columns and Dashboard Board tiles.
- **Glass_Raised**: A frosted surface in the top layer: BaseModal, popovers, menus and toasts.
- **Glass_Pebble**: A translucent, non-blurring surface that sits on a Glass_Pane: Kanban Cards, inputs and chips.
- **App_Background**: The fixed full-viewport layer behind all content, made of layered CSS gradients and a grain texture.
- **Sidebar**: The curved, floating Glass_Pane navigation shown at viewport widths of 768 px and above.
- **Top_Bar**: The Glass_Pane bar at the top of the content area with the page title, the NotificationBell and, below 768 px, the menu button.
- **Nav_Drawer**: The modal `<dialog>` that holds the navigation below 768 px.
- **Nav_Tree**: The navigation links and nested groups shown inside the Sidebar or the Nav_Drawer.
- **Profile_Capsule**: The control at the bottom of the Sidebar that shows the User's avatar, name and email and opens the Profile_Menu.
- **Profile_Menu**: The popup menu opened from the Profile_Capsule, with Profile, an Appearance submenu and Log out.
- **Appearance_Preferences**: The User's theme (`system`, `light`, `dark`), "Animate background" and "Reduce transparency" choices, stored in the `revotask_prefs` cookie.
- **NotificationBell**: The Frontend component that shows the unread Notification count.
- **useDragAndDrop**: The hook that implements native HTML5 drag and drop with optimistic update.
- **useNotifications**: The hook that polls Notifications.
- **useErrorHandler**: The hook that maps ApiError status codes to toasts.
- **Spec_Set**: The `/specs` directory with `brief.md`, `requirements.md`, `design.md`, `tasks.md` and `CHANGELOG.md`.
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
4. WHEN a client sends POST /api/auth/login with a valid email and password, THE Backend SHALL return status 200 with a JWT, its expiry time and the User (without password) in the Envelope.
5. IF POST /api/auth/login receives invalid credentials, THEN THE Backend SHALL return status 401 with an error Envelope.
6. THE Backend SHALL store User passwords as salted hashes.
7. WHEN a request to a protected route lacks a valid JWT, THE Backend SHALL return status 401 with an error Envelope.
8. THE Backend SHALL issue every JWT with an expiry read from the `JWT_ACCESS_TOKEN_EXPIRES_HOURS` environment variable, defaulting to 24 hours.

### Requirement 2: Board endpoints

**User Story:** As a User, I want to manage boards, so that I can organise my projects.

#### Acceptance Criteria

1. WHEN an authenticated User sends POST /api/boards with a valid `name`, THE Backend SHALL create the Board, make the User its Board_Admin and return status 201 with the Board in the Envelope.
2. WHEN an authenticated User sends GET /api/boards, THE Backend SHALL return every Board on which the User is a Board_Member, with the User's role, in the Envelope.
3. WHEN a Board_Member sends GET /api/boards/<id>, THE Backend SHALL return the Board with nested Columns and nested live Cards, each sorted by ascending order value, in the Envelope.
4. WHEN a Board_Admin sends PATCH /api/boards/<id> with a valid `name`, THE Backend SHALL update the Board name and return the updated Board in the Envelope.
5. WHEN a Board_Admin sends DELETE /api/boards/<id>, THE Backend SHALL delete the Board and return status 200.
6. IF a Board identified in the URL does not exist, THEN THE Backend SHALL return status 404 with an error Envelope.
7. IF a User who is not a Board_Member requests a Board, THEN THE Backend SHALL return status 403 with an error Envelope.
8. IF a Board_Member who is not a Board_Admin sends PATCH or DELETE for a Board, THEN THE Backend SHALL return status 403 with an error Envelope.

### Requirement 3: Column endpoints

**User Story:** As a User, I want to create, edit, delete and reorder columns, so that I can model my workflow.

#### Acceptance Criteria

1. WHEN a Board_Member sends POST /api/boards/<id>/columns with a valid `name`, THE Backend SHALL create the Column with a FLOAT order value after the last Column and return status 201.
2. WHEN a Board_Member sends PATCH /api/columns/<id> with a valid `name`, THE Backend SHALL update the Column name and return the updated Column in the Envelope.
3. WHEN a Board_Member sends DELETE /api/columns/<id>, THE Backend SHALL delete the Column together with its Cards and their Comments and return status 200.
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

1. WHEN an authenticated User sends GET /api/cards?assignee=me, THE Backend SHALL return the live Cards assigned to that User, each with its `board_id` and `board_name`, in the Envelope.
2. WHEN an authenticated User sends GET /api/cards?search=<term>, THE Backend SHALL return the live Cards on Boards where the User is a Board_Member whose title or description contains the term, matched case-insensitively, each with its `board_id` and `board_name`, in the Envelope.
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

1. WHEN a Board_Admin sends GET /api/boards/<id>/analytics, THE Backend SHALL return the number of Cards per Column, the number of Cards completed this week and the activity per Board_Member in the Envelope.
2. THE Analytics_Service SHALL compute the statistics with SQLAlchemy joins in the service layer.
3. IF the Board identified in the URL does not exist, THEN THE Backend SHALL return status 404 with an error Envelope.
4. IF a User who is not a Board_Admin of the Board requests analytics, THEN THE Backend SHALL return status 403 with an error Envelope.

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

1. THE Backend SHALL contain eight Blueprints in `app/blueprints/` named auth, boards, columns, cards, comments, notifications, analytics and users.
2. THE Backend SHALL provide `routes.py`, `service.py` and `schema.py` in each Blueprint folder.
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
4. WHEN a visitor submits valid login credentials, THE Frontend SHALL call POST /api/auth/login, store the JWT in the Session_Cookie and in AuthContext, and redirect to /.
5. IF the Backend returns an error for registration or login, THEN THE Frontend SHALL show an error toast with react-hot-toast.
6. WHILE no unexpired Session_Cookie is present, THE Middleware SHALL redirect requests for protected pages (/, /boards/[id], /my-tasks, /profile) to /login.
7. THE /register and /login forms SHALL use controlled inputs and validate on the client (required fields, email format, password of at least 8 characters) before sending the request.

### Requirement 13: Dashboard page

**User Story:** As a User, I want a dashboard, so that I can see and create my boards.

#### Acceptance Criteria

1. THE Frontend SHALL render the / page as a Server Component that reads the JWT from the Session_Cookie and lists the Boards of the User from GET /api/boards.
2. WHEN a User submits the create-board form with a valid name, THE Frontend SHALL call POST /api/boards and show the new Board in the list.
3. WHEN a User selects a Board, THE Frontend SHALL navigate to /boards/[id].
4. WHILE the User has no Boards, THE Frontend SHALL show an empty-state message.
5. THE Backend SHALL include in each Board of GET /api/boards an `open_card_count` (the number of live Cards that are not in the Board's last Column, or all live Cards when the Board has fewer than two Columns) and a `members_preview` list of at most 4 Board_Members, each with `user_id`, `name` and `avatar_url`, ordered by ascending membership creation time, together with the existing `member_count`.
6. THE Frontend SHALL show on each Board tile the `open_card_count` labelled "open cards" (singular "open card" for 1), and an avatar stack of the `members_preview` Avatars, overlapping, followed by a "+N" chip when `member_count` exceeds the number of Avatars shown; the stack SHALL expose the total as text such as "5 members" to assistive technology.
7. WHEN the User creates a Board from the dashboard, THE Frontend SHALL show the new tile with an `open_card_count` of 0 and the User as the only Avatar.

### Requirement 14: Kanban board page

**User Story:** As a User, I want a Kanban board, so that I can manage cards visually.

#### Acceptance Criteria

1. THE Frontend SHALL render the /boards/[id] page as a Server Component that reads the JWT from the Session_Cookie and shows the Columns and Cards of the Board in ascending order value.
2. WHEN a User submits the add-column form, THE Frontend SHALL call POST /api/boards/<id>/columns and show the new Column.
3. WHEN a User submits the add-card form in a Column, THE Frontend SHALL call POST /api/columns/<id>/cards and show the new Card in that Column.
4. WHEN a User selects a Card, THE Frontend SHALL open CardDetailModal for that Card.
5. WHILE the signed-in User is a Board_Admin of the Board, THE Frontend SHALL display the analytics of the Board from GET /api/boards/<id>/analytics.
6. WHEN a User reloads /boards/[id], THE Frontend SHALL show each Card in the Column and at the order position last persisted by the Backend.
7. WHILE the signed-in User is a Board_Admin of the Board, THE Frontend SHALL show a Board settings control in the Top_Bar of /boards/[id] that opens Board settings in BaseModal, with the Board name field pre-populated and a "Save changes" button that is enabled only while a value differs from the saved one.
8. WHEN a Board_Admin saves a changed Board name, THE Frontend SHALL call PATCH /api/boards/<id>, show a success toast, and update the Board title, the Nav_Tree and the dashboard tile without a manual reload.
9. WHEN a Board_Admin activates "Delete board…" in Board settings, THE Frontend SHALL show a confirmation step that names the consequence (columns, cards, comments, notes, links and photos are removed for every member) with "Delete board permanently" and "Keep board" choices, and SHALL call DELETE /api/boards/<id> only after "Delete board permanently" is activated.
10. WHEN DELETE /api/boards/<id> succeeds from Board settings, THE Frontend SHALL show a success toast, navigate to /, and remove the Board from the dashboard and the Nav_Tree.
11. WHILE the signed-in User is a Board_Member who is not a Board_Admin, THE Frontend SHALL hide the Board settings control, so that no rename or delete control is shown.
12. IF PATCH or DELETE /api/boards/<id> returns an error from Board settings, THEN THE Frontend SHALL show an error toast and keep Board settings open with the entered values.

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
5. THE /my-tasks page SHALL group the listed Cards under their Board name.
6. WHEN a User selects a Card on /my-tasks, THE Frontend SHALL navigate to the Card's Board at /boards/[id].

### Requirement 18: Profile page

**User Story:** As a User, I want a profile page, so that I can update my name and email.

#### Acceptance Criteria

1. THE Frontend SHALL provide the /profile page with controlled inputs pre-populated from the User in AuthContext and refreshed from GET /api/users/me.
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
2. THE BaseBadge SHALL render a short text label with the color variants neutral, info, success, warning and danger.
3. THE BaseModal SHALL render a native `<dialog>` opened with `showModal()`, named by its visible title through `aria-labelledby`, with a close control.
4. WHILE the `disabled` property of BaseButton is true, THE BaseButton SHALL ignore click events.
5. THE Frontend SHALL keep BaseButton, BaseBadge and BaseModal in `components/shared/`.
6. THE pages /my-tasks, /profile, /login, /register, / and /boards/[id] SHALL render every button through BaseButton and SHALL contain no other `<button>` element, except the `<button>` elements inside the shell components Nav_Tree and Profile_Menu, which need `aria-expanded`, `aria-controls` and menu roles that BaseButton does not provide (R35.8, R36.4).

### Requirement 21: API client and error handling

**User Story:** As a developer, I want one typed API client, so that requests and errors are handled consistently.

#### Acceptance Criteria

1. THE apiClient SHALL be a typed fetch wrapper in `lib/apiClient.ts`.
2. WHERE the code runs in the browser, THE apiClient SHALL use NEXT_PUBLIC_API_BASE_URL as the base URL.
3. WHERE the code runs on the server, THE apiClient SHALL use API_BASE_URL as the base URL.
4. WHILE a JWT is present, THE apiClient SHALL send the JWT in the Authorization header as a Bearer token.
5. IF the Backend returns a non-2xx status, THEN THE apiClient SHALL throw an ApiError whose `statusCode` is the HTTP status and whose `message` is the Envelope `error` value.
6. WHEN useErrorHandler receives an ApiError, THE useErrorHandler SHALL map the `statusCode` to a user-facing message and show it through `lib/toast.ts`, which wraps `toast.success()`, `toast.error()` and `toast.loading()`.
7. WHEN useErrorHandler receives an ApiError with status 401, THE useErrorHandler SHALL end the session as defined in Requirement 32.5.
8. THE Frontend SHALL NOT write the JWT to localStorage or sessionStorage.

### Requirement 22: Specs deliverables

**User Story:** As a reviewer, I want complete specs, so that I can trace requirements to implementation.

#### Acceptance Criteria

1. THE Spec_Set SHALL contain `brief.md`, `requirements.md`, `design.md`, `tasks.md` and `CHANGELOG.md`, and `brief.md` SHALL contain an overview, the user roles, the core features, the tech stack and at least 2 non-functional requirements.
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
4. THE Guideline_Set SHALL contain one comparison of AI output for the same prompt before and after the guidelines were applied, with the number of guideline violations counted in each output as the measure of improvement.
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
2. THE Playwright_Suite SHALL contain these 4 auth scenarios: (a) a successful login redirects to /, (b) invalid credentials show an error and stay on /login, (c) an unauthenticated visit to / redirects to /login, (d) after logout, a visit to / redirects to /login.
3. THE Playwright_Suite SHALL contain this 8-step Kanban journey: (1) register, (2) log in, (3) create a Board, (4) add two Columns, (5) create a Card in the first Column, (6) drag the Card to the second Column, (7) reload the page and assert the Card is still in the second Column, (8) open the Card, add a Comment and edit it.
4. THE Playwright_Suite SHALL wait on observable conditions and use no `waitForTimeout` calls.
5. THE Repository SHALL contain the committed Playwright HTML report.
6. THE Playwright_Suite SHALL create a unique User per run, so that it can run repeatedly against the production database.

### Requirement 27: Deployment

**User Story:** As a stakeholder, I want RevoTask live, so that users can reach the application.

#### Acceptance Criteria

1. THE Backend SHALL be deployed on Render as a Python web service that runs Gunicorn (`gunicorn wsgi:app --config gunicorn.conf.py`, threaded workers bound to `$PORT`) with the health check `/api/health`, defined in `render.yaml`, and with its database on Supabase PostgreSQL.
2. WHEN a Backend version is deployed, THE migrations SHALL be applied with `flask --app wsgi db upgrade` before the new version serves traffic: in the build command on Render's free plan, or as the pre-deploy command on a paid plan.
3. THE deployment SHALL verify GET /api/health, POST /api/auth/register and POST /api/auth/login in Postman against the deployed API URL.
4. THE Frontend SHALL be deployed on Vercel.
5. WHILE the viewport is the Mobile_Viewport, THE Frontend SHALL render every page without page-level horizontal scrolling and with all controls reachable; the Kanban Columns MAY scroll horizontally inside their own container.
6. WHILE the Backend runs on Render, THE Backend SHALL connect through the Supabase session pooler (port 5432, IPv4) with a small connection pool per Gunicorn worker (3 connections plus 2 overflow by default), checked before use and recycled every 5 minutes; IF the URL uses the transaction pooler (port 6543), THEN THE Backend SHALL disable prepared statements and client-side pooling.

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

### Requirement 31: Board membership and roles

**User Story:** As a Board_Admin, I want to manage who can access my board, so that my team can collaborate while I keep control of the board.

#### Acceptance Criteria

1. WHEN a Board_Member sends GET /api/boards/<id>/members, THE Backend SHALL return the members of the Board with their name, email and role in the Envelope.
2. WHEN a Board_Admin sends POST /api/boards/<id>/members with the email of a registered User and a role of `member` or `admin`, THE Backend SHALL add that User to the Board and return status 201 with the membership in the Envelope.
3. WHEN a Board_Admin sends DELETE /api/boards/<id>/members/<user_id>, THE Backend SHALL remove that membership and return status 200.
4. IF a Board_Member who is not a Board_Admin sends POST or DELETE to the members routes, THEN THE Backend SHALL return status 403 with an error Envelope.
5. IF POST /api/boards/<id>/members receives an email that matches no User, THEN THE Backend SHALL return status 404 with an error Envelope.
6. IF POST /api/boards/<id>/members receives a User who is already a Board_Member, THEN THE Backend SHALL return status 409 with an error Envelope.
7. IF a DELETE on the members routes would leave the Board with no Board_Admin, THEN THE Backend SHALL return status 409 with an error Envelope.
8. IF a User who is not a Board_Member of the related Board sends any Column, Card or Comment request, THEN THE Backend SHALL return status 403 with an error Envelope.
9. IF PATCH /api/cards/<id> sets an `assignee_id` that is not a Board_Member of the Card's Board, THEN THE Backend SHALL return status 400 with an error Envelope.
10. IF PATCH /api/cards/<id>/position names a `column_id` on a different Board from the Card, THEN THE Backend SHALL return status 400 with an error Envelope.
11. WHEN a User is added to a Board, assigned to a Card, or a Comment is added to a Card assigned to the User by someone else, THE Backend SHALL create a Notification for that User.
12. WHILE the signed-in User is a Board_Admin of the Board, THE Frontend SHALL show a members panel on /boards/[id] that lists members and adds and removes them through BaseModal.
13. THE Frontend SHALL show each Board_Member's role on the members panel with BaseBadge.

### Requirement 32: Session persistence and logout

**User Story:** As a User, I want to stay signed in when I reload a page and to sign out when I choose, so that I do not lose my place and my account stays safe.

#### Acceptance Criteria

1. WHEN login succeeds, THE Frontend SHALL set the Session_Cookie on the server with the JWT, the `HttpOnly`, `Secure` and `SameSite=Lax` attributes, `Path=/`, and an expiry equal to the JWT expiry.
2. WHEN a User reloads any protected page while the Session_Cookie is unexpired, THE Frontend SHALL render the page as the signed-in User without asking for credentials.
3. THE root layout SHALL read the Session_Cookie on the server and initialise AuthContext with the JWT and the User from GET /api/users/me.
4. THE Server Components for / and /boards/[id] SHALL send the JWT from the Session_Cookie to the Backend through apiClient with API_BASE_URL.
5. WHEN a User selects Log out, or useErrorHandler receives status 401, THE Frontend SHALL delete the Session_Cookie, clear AuthContext, stop notification polling and redirect to /login.
6. WHILE an unexpired Session_Cookie is present, THE Middleware SHALL redirect requests for /login and /register to /.
7. THE Profile_Menu SHALL contain a Log out command.

### Requirement 33: Moving cards without a mouse

**User Story:** As a User on a phone or using a keyboard, I want to move a card without dragging, so that I can update task status on any device.

#### Acceptance Criteria

1. THE Frontend SHALL render a Move_Control on every Card that lists the Columns of the Board.
2. WHEN a User selects a Column in the Move_Control, THE Frontend SHALL move the Card to the end of that Column with the same optimistic update, PATCH /api/cards/<id>/position call and revert-on-error behaviour as useDragAndDrop.
3. THE Move_Control SHALL be operable with the keyboard alone and SHALL have an accessible label that names the Card.

### Requirement 34: Glass visual design system

**User Story:** As a User, I want a calm, polished interface with a consistent frosted-glass look, so that RevoTask is pleasant to work in for long sessions.

#### Acceptance Criteria

1. THE Frontend SHALL define colors, radii, blur levels, shadows, durations and easings as Design_Tokens, and components SHALL reference Design_Tokens instead of raw values.
2. THE Frontend SHALL render every surface at one of three levels: Glass_Pane, Glass_Raised or Glass_Pebble.
3. THE Frontend SHALL apply `backdrop-filter` only to Glass_Pane and Glass_Raised surfaces, and SHALL NOT apply `backdrop-filter` to an element inside another element that has `backdrop-filter`.
4. THE Frontend SHALL render the App_Background from CSS gradients and an inline SVG grain texture, with no network image request.
5. WHERE the browser does not support `backdrop-filter`, THE Frontend SHALL render each glass surface with an opaque tint of the same hue.
6. THE Frontend SHALL keep a contrast ratio of at least 4.5:1 for text and at least 3:1 for icons, borders and focus indicators against each glass surface, measured over the lightest region of the App_Background, in both themes.
7. THE Frontend SHALL provide a dark theme ("Deep water") and a light theme ("Shallows"), and SHALL follow the operating-system color scheme until the User picks a theme.
8. THE Frontend SHALL assign corner radii by surface hierarchy: 2rem for the Sidebar and auth card, 1.5rem for Glass_Pane and Glass_Raised surfaces, 1rem for Glass_Pebble surfaces, and fully rounded ends for chips, badges and avatars.
9. THE Frontend SHALL load Fraunces for headings and Figtree for interface text through `next/font`, self-hosted with `font-display: swap`.

### Requirement 35: Curved sidebar and nested navigation

**User Story:** As a User, I want a clear sidebar with nested links to my boards, so that I can reach any board, its members or its analytics in one or two steps.

#### Acceptance Criteria

1. WHILE the viewport is at least 1280 px wide, THE Sidebar SHALL show as an expanded Glass_Pane that runs the full height of the viewport, flush with the inline-start edge, with an outward-curved inline-end edge carrying a lit rim, icons and text labels.
2. WHILE the viewport is from 768 px to 1279 px wide, THE Sidebar SHALL show as a full-height icon rail with a shallower curved edge, and each icon link SHALL show its text label on hover and on keyboard focus.
3. WHILE the viewport is narrower than 768 px, THE Frontend SHALL hide the Sidebar and show a menu button in the Top_Bar that opens the Nav_Drawer.
4. THE Nav_Drawer SHALL slide in from the inline-start edge and SHALL close on a swipe toward that edge, a tap on the backdrop, its Close button, or the Escape key.
5. THE Nav_Tree SHALL contain Dashboard, My Tasks and a Boards group, in that order; the Boards group SHALL show the number of Boards and contain one link per Board the User belongs to, marked with a colour dot derived from the Board id and its progress (R46) or card count. Members, Analytics and Settings are reached from the board's Top_Bar only, so the Nav_Tree does not repeat them.
6. WHEN a User activates a group trigger in the expanded Sidebar or the Nav_Drawer, THE Nav_Tree SHALL expand or collapse that group in place.
7. WHEN a User activates a group trigger in the icon rail, THE Nav_Tree SHALL open that group as a flyout beside the trigger, anchored to it and flipped to stay inside the viewport.
8. THE Nav_Tree SHALL use `<a href>` links for destinations and `<button>` group triggers with `aria-expanded` and `aria-controls`, and SHALL NOT use `role="menu"`, so that users move through it with Tab.
9. THE Nav_Tree SHALL mark the current page with `aria-current="page"` and an indicator that does not rely on color alone.
10. THE Frontend SHALL keep the expanded or collapsed state of each Nav_Tree group across navigations within the browser session.
11. THE Sidebar SHALL keep the brand at the top and the Profile_Capsule at the bottom, and SHALL scroll only the Nav_Tree as a whole (never a nested list inside it); where the browser supports scroll-driven animations the scrollbar SHALL be hidden and the scrolled edges SHALL fade, otherwise a thin tinted scrollbar SHALL show.

### Requirement 36: Profile capsule, profile menu and profile page

**User Story:** As a User, I want my profile always within reach and a profile page that reacts as I edit, so that I can adjust my account and appearance quickly.

#### Acceptance Criteria

1. THE Sidebar SHALL end with the Profile_Capsule, which shows the avatar, name and email of the signed-in User in the expanded Sidebar and the avatar alone in the icon rail.
2. WHEN a User activates the Profile_Capsule, THE Frontend SHALL open the Profile_Menu anchored to the capsule, containing a Profile link to /profile, an Appearance submenu and a Log out command.
3. THE Appearance submenu SHALL contain the theme choices System, Light and Dark as a radio group, and "Animate background" and "Reduce transparency" as checkable items.
4. THE Profile_Menu SHALL support the menu keyboard model: ArrowUp and ArrowDown move between items, Home and End jump to the first and last item, ArrowRight opens the Appearance submenu, ArrowLeft and Escape close one level and return focus to its trigger, and Tab leaves the menu.
5. WHEN a User changes an Appearance_Preferences option, THE Frontend SHALL apply it without a page reload and store it in the `revotask_prefs` cookie.
6. WHEN a page is rendered on the server, THE root layout SHALL read the `revotask_prefs` cookie and set the theme on the `<html>` element, so that no flash of the wrong theme appears.
7. THE Frontend SHALL show each User's avatar as their initials on a background color derived deterministically from the User id.
8. THE /profile page SHALL show a profile hero with a large avatar, the name, the email, the number of Boards the User belongs to, the number the User administers and the number of open Cards assigned to the User.
9. WHILE a User edits the name field on /profile, THE profile hero SHALL update the name and avatar initials on every keystroke.
10. WHILE the profile form differs from the saved values, THE Frontend SHALL enable the Save button and show an unsaved-changes indicator; WHILE it matches the saved values, THE Save button SHALL be disabled.

### Requirement 37: Motion and transitions

**User Story:** As a User, I want smooth, responsive motion that shows what changed, so that the interface feels alive without distracting me.

#### Acceptance Criteria

1. THE Frontend SHALL animate only `opacity`, `translate`, `scale` and `rotate`, plus a brief `filter` blur on full-screen sheet movements, and SHALL NOT animate layout properties, `box-shadow` or `backdrop-filter`.
2. WHEN a form field, Card, Column, Board tile, Comment or list item first appears, THE Frontend SHALL fade and rise it into place using `@starting-style`.
3. WHEN a Board page first loads, THE Kanban SHALL reveal Columns and then Cards as one staggered sequence (75 ms apart, each rising over 620 ms with a soft deceleration) that settles within about 1.3 s; with reduced motion it SHALL be a short fade with no stagger.
4. WHEN a BaseModal, popover or menu opens or closes, THE Frontend SHALL animate its opacity and scale from the side that touches its trigger, and SHALL keep it in the top layer until the closing animation ends.
5. WHEN a pointer hovers a Card, Board tile or BaseButton on a device with hover, THE element SHALL lift with a stronger shadow layer, and Cards and Board tiles SHALL show a highlight that follows the pointer.
6. WHEN a User presses a Card, Board tile or BaseButton, THE element SHALL scale down slightly until release.
7. WHEN a Card moves through the Move_Control, or a CardDetailModal opens from a Card, THE Frontend SHALL morph the Card to its new position or into the modal with a same-document View Transition, and SHALL then move focus to the moved Card or the modal heading.
8. WHILE a Card is being dragged, THE dragged Card SHALL show a lifted, tilted state, and the Column under the pointer SHALL show a highlighted rim and a drop placeholder.
9. WHEN the route changes, THE Nav_Tree current-page indicator SHALL glide from the previous item to the new item.
10. WHILE `prefers-reduced-motion: reduce` is set, THE Frontend SHALL replace movement, scaling, tilting and staggering with an opacity fade of at most 150 ms, SHALL skip View Transition morphs, and SHALL keep color and focus-ring transitions.
11. THE App_Background SHALL animate by default: WHILE "Animate background" is on and `prefers-reduced-motion` is `no-preference`, its light pools SHALL drift and gently scale over about 26 s and its caustic lines SHALL flow sideways over about 48 s, using compositor-only transforms. Turning "Animate background" off SHALL stop the motion immediately, and a reduced-motion setting SHALL keep it still.
12. THE Frontend SHALL NOT show any content that flashes more than three times in any one-second period.

### Requirement 38: Responsive layout from mobile to 4K

**User Story:** As a User, I want RevoTask to look right on my phone, laptop and 4K monitor, so that I can work on any screen.

#### Acceptance Criteria

1. THE Frontend SHALL render every page without page-level horizontal scrolling at viewport widths of 320, 375, 768, 1280, 1920, 2560 and 3840 CSS pixels.
2. THE Frontend SHALL scale the root font size fluidly between 1rem and 1.25rem with viewport width, and SHALL keep text resizable to 200% without loss of content.
3. THE / page SHALL arrange Board tiles in an auto-fill grid with a minimum tile width of 18rem inside a content area no wider than 140rem.
4. WHILE the viewport is narrower than 768 px, THE Kanban SHALL show each Column at 85% of the viewport width in a horizontal scroller that snaps to Columns; at 768 px and wider, THE Kanban SHALL size Columns between 17rem and 24rem.
5. THE Frontend SHALL use dynamic viewport units for full-height layouts.
6. THE Card component SHALL adapt to its container width with container queries, showing the assignee and comment count row only when the container is at least 14rem wide.
7. WHILE the primary pointer is coarse, THE Frontend SHALL give every interactive target a hit area of at least 44 by 44 CSS pixels.
8. WHILE the viewport is narrower than 768 px, THE Kanban Columns SHALL use an opaque tint instead of `backdrop-filter`, to keep scrolling smooth on mobile GPUs.

### Requirement 39: Accessibility of visual effects

**User Story:** As a User with visual or vestibular needs, I want the glass and motion effects to adapt to my settings, so that the interface stays readable and comfortable.

#### Acceptance Criteria

1. WHILE `prefers-reduced-transparency: reduce` is set or "Reduce transparency" is on, THE Frontend SHALL render every glass surface opaque and SHALL keep the App_Background behind it.
2. WHILE `prefers-contrast: more` is set, THE Frontend SHALL render glass surfaces opaque with solid 1 px borders.
3. WHILE `forced-colors: active` is set, THE Frontend SHALL drop glass tints and shadows, use system colors, and keep focus rings and current-page indicators visible.
4. THE Frontend SHALL show a `:focus-visible` ring on every interactive element with a contrast of at least 3:1 against its surroundings.
5. WHERE a control is revealed on hover, THE Frontend SHALL also reveal it on keyboard focus within its parent, and SHALL show it at all times on devices without hover.
6. WHEN the accessibility scan runs on every page in both themes, THE scan SHALL report no violations of serious or critical impact.

### Requirement 40: Rich-text Card description

**User Story:** As a Board_Member, I want to format a Card description with bold, italic, underline, headings, lists, quotes, code and links, so that longer notes are easy to read.

#### Acceptance Criteria

1. THE CardDetailModal SHALL edit the description in a rich-text editor with a toolbar for bold, italic, underline, strikethrough, inline code, link, heading, subheading, bulleted list, numbered list, quote, code block, divider, clear formatting, undo and redo, and SHALL support the standard keyboard shortcuts (Ctrl/Cmd+B, I, U, Z).
2. THE toolbar SHALL follow the WAI-ARIA toolbar pattern: one tab stop, arrow keys, Home and End move between buttons, and toggle buttons expose `aria-pressed`.
3. WHEN a description is created or updated, THE Backend SHALL sanitise it to an allow-list of tags (p, br, strong, b, em, i, u, s, code, pre, blockquote, ul, ol, li, h2, h3, a, hr), SHALL keep only the `href` attribute on links, SHALL allow only http, https and mailto links, and SHALL set `rel="noopener noreferrer nofollow"` and `target="_blank"` on every link.
4. WHEN a description contains no markup, THE Backend SHALL escape it and store each non-empty line as a paragraph; WHEN a description has no text after sanitising, THE Backend SHALL store null.
5. THE Backend SHALL store a plain-text copy of each description, SHALL search descriptions by that copy rather than by markup, and SHALL reject a description whose plain text is longer than 5000 characters with status 400.
6. THE My Tasks page SHALL preview a Card's description as plain text.

### Requirement 41: Profile photo

**User Story:** As a User, I want to upload a profile photo, so that teammates recognise me on cards, comments and member lists.

#### Acceptance Criteria

1. WHEN an authenticated User sends POST /api/users/me/avatar with one image in the form field `file`, THE Backend SHALL centre-crop it to a square of at most 512 px, encode it as AVIF, store only the AVIF, and return status 200 with the User including `avatar_url`.
2. THE Backend SHALL never write the uploaded original file to disk or to the database, and SHALL drop EXIF, XMP and comment metadata when re-encoding.
3. WHEN a User uploads a new photo, THE Backend SHALL delete the previous one in the same transaction; WHEN a User sends DELETE /api/users/me/avatar, THE Backend SHALL delete the photo and return the User with `avatar_url` null.
4. THE Backend SHALL include `avatar_url` in the User, member, Card assignee, Comment author and attachment uploader shapes, and THE Avatar component SHALL show the photo when present and fall back to initials (R36.7) when there is none or the image fails to load.
5. THE /profile page SHALL let the User add, change and remove the photo, and clicking the photo SHALL open it full size in a lightbox.
6. THE Frontend SHALL NOT show a separate "Profile" link in the main navigation; the Profile_Capsule menu is the way to /profile.

### Requirement 42: Card image attachments

**User Story:** As a Board_Member, I want to attach images to a Card, so that screenshots and photos live next to the task.

#### Acceptance Criteria

1. WHEN a Board_Member sends POST /api/cards/<id>/attachments with one image in the form field `file`, THE Backend SHALL store an AVIF no larger than 2048 px on its longest side plus an AVIF thumbnail no larger than 480 px, and return status 201 with the attachment.
2. THE Backend SHALL return a Card's attachments from GET /api/cards/<id>/attachments to Board_Members only, SHALL return 404 for a deleted Card, and SHALL include `attachment_count` on each Card in the Board detail.
3. THE Backend SHALL reject an eleventh attachment on one Card with status 400.
4. WHEN a User sends DELETE /api/attachments/<id>, THE Backend SHALL delete it only if the User uploaded it or is an admin of the Board, and SHALL return 403 otherwise.
5. THE CardDetailModal SHALL list attachments as thumbnails, accept uploads from a file picker or by dropping image files, open a thumbnail full size in a lightbox, and show the remove control only to the uploader and Board admins, with a confirmation step.
6. THE Card on the Kanban SHALL show the number of attachments when it has any.

### Requirement 43: Image safety and delivery

**User Story:** As a User, I want uploaded images to be safe and hard to copy casually, so that board content stays within the team.

#### Acceptance Criteria

1. THE Backend SHALL accept only JPEG, PNG, WebP, GIF, AVIF, BMP and TIFF images of at most 40 megapixels and 4 MB, and SHALL reject anything else with status 400 (413 above 4 MB) without storing it.
2. THE Backend SHALL serve images only from GET /api/media/<id> with a Signed_URL whose HMAC signature covers the image id, variant and expiry, valid for one to two hours; a missing, altered or expired signature SHALL return 403 and a deleted image 404.
3. THE image response SHALL have `Content-Type: image/avif`, `Content-Disposition: inline`, `X-Content-Type-Options: nosniff` and a private cache lifetime that ends at the URL's expiry.
4. THE Frontend SHALL show every uploaded image through a protected image component that blocks the context menu, dragging, selection and the iOS long-press callout, with a transparent shield over the image, and SHALL hide images when printing.
5. THE Frontend SHALL check the file type and the 4 MB limit before uploading and show a toast for a rejected file.

### Requirement 44: Full-height Board_Stage and quiet scrolling

**User Story:** As a User, I want the board to fill my screen and to move between columns easily, so that I see more of my work and never fight scrollbars.

#### Acceptance Criteria

1. THE /boards/[id] page SHALL be exactly one viewport tall: the Board_Stage SHALL fill the height below the Top_Bar, and each Column SHALL stretch to the bottom of the Board_Stage with its card list scrolling inside it.
2. THE Kanban row SHALL scroll sideways without a visible scrollbar; WHEN it can scroll further left or right, THE Board_Stage SHALL show a soft edge shade and, for fine pointers, an arrow button on that side that scrolls by most of a screen.
3. WHEN a vertical mouse wheel turns over the Kanban row and the card list under the pointer cannot scroll that way, THE Kanban row SHALL scroll sideways instead; at either end the page SHALL keep the wheel.
4. WHILE the Kanban row overflows, THE Board_Stage SHALL show a dock with one chip per Column (name and card count), marking the Columns at least half in view with `aria-current`, and activating a chip SHALL scroll that Column to the start of the row.
5. WHERE the browser supports scroll-driven animations, THE document, the Nav_Tree and each card list SHALL scroll without a visible scrollbar, with faded edges that show more content; THE Top_Bar SHALL lift with a deeper shadow once the page scrolls, and a shade at the bottom of the viewport SHALL mark more content until the end is reached. Elsewhere a thin tinted scrollbar SHALL show.
6. THE Kanban row SHALL run from the viewport's inline-start edge to its inline-end edge, with its first Column aligned to the page content, so that Columns scrolled past the start slide under the frosted Sidebar instead of being cut off at a visible edge.

### Requirement 45: Tide_Clock

**User Story:** As a User, I want to see the time and my workload at a glance, so that I can plan the rest of my day without leaving the board.

#### Acceptance Criteria

1. THE Sidebar SHALL show the Tide_Clock above the Profile_Capsule with the time (hours and minutes), the short date, the part of the day and whether the tide is rising or falling; THE icon rail SHALL show the time only, and THE Nav_Drawer SHALL show the full Tide_Clock.
2. WHEN a User activates the time, THE Tide_Clock SHALL switch between 24-hour and 12-hour formats and remember the choice in that browser; the time button's accessible name SHALL include the full time and date.
3. THE tide level SHALL follow a smooth daily curve between 0 at 03:00 and 1 at 15:00, and THE Sidebar's waves SHALL rise and fall with it.
4. THE expanded Tide_Clock SHALL link to /my-tasks with the number of cards assigned to the User.
5. THE Tide_Clock SHALL update on each minute boundary and when the tab becomes visible again, SHALL render no time during server rendering (so hydration never mismatches), and SHALL NOT announce each minute to screen readers.

### Requirement 46: Board progress in the Nav_Tree

**User Story:** As a User, I want to see how far each board has come without opening it, so that I know where work is stuck.

#### Acceptance Criteria

1. THE Backend SHALL include `done_count` in each Board of GET /api/boards: the number of live Cards in the Board's last Column (highest order), the same rule as "completed" in Analytics, or null when the Board has fewer than two Columns.
2. WHEN a Board has a `done_count` and at least one Card, THE Nav_Tree SHALL fill its row with a liquid whose level is `done_count / card_count`, with a wave on the surface, and SHALL show `done/total`; at 100% the row SHALL be full and show a check instead.
3. THE progress SHALL be exposed to assistive technology through `aria-describedby` (for example "33% done: 4 of 12 cards in the last column") while the link's accessible name stays the Board name.
4. WHEN Cards are moved, added or deleted on the open Board, THE Nav_Tree's progress for that Board SHALL update without a reload.
5. THE liquid SHALL rise and fall with a 700 ms transition, its wave SHALL drift only when reduced motion is not requested, and it SHALL be hidden in forced-colors mode.

### Requirement 47: Board purpose, notes, links and photos

**User Story:** As a Board_Member, I want the board to say what it is for and to keep its meeting notes, recordings and photos, so that the team remembers the goal and finds the context in one place.

#### Acceptance Criteria

1. THE "New board" form SHALL accept an optional purpose of up to 280 characters, and THE Backend SHALL store it trimmed, with a blank purpose stored as null.
2. WHEN a Board_Admin changes the purpose in Board settings, THE Backend SHALL store it; THE Backend SHALL reject a purpose longer than 280 characters with status 400 and a change by a non-admin with status 403.
3. THE board page SHALL show the purpose under the board title for every member, and activating it SHALL open "About this board"; THE dashboard tile SHALL show the purpose on up to two lines.
4. "About this board" SHALL show the purpose, shared notes, links and photos to every Board_Member. Members SHALL edit the notes in the rich-text editor (sanitised as in R40), add links (http or https only; the title defaults to the host) and add photos (AVIF, as in R42, up to 30 per board).
5. THE person who added a link or photo, or a Board_Admin, SHALL be able to remove it; others SHALL receive status 403. Deleting a board SHALL delete its links and photos.
6. Recordings and documents SHALL be added as links, not uploads: the API's 4 MB upload limit and storing media in PostgreSQL make large files unsuitable.

### Requirement 48: Board colour

**User Story:** As a Board_Admin, I want to pick a colour for the board, so that I can tell my boards apart at a glance.

#### Acceptance Criteria

1. THE Backend SHALL store an optional `color_hue` from 0 to 359 for each Board, reject other values (including non-integers) with status 400, and accept null to return to the automatic colour.
2. THE "New board" form and Board settings SHALL offer the colour as a radio group of eight named colours plus "Automatic" (the hue derived from the Board id).
3. THE Board colour SHALL be used for the Nav_Tree dot and progress liquid (R46), the dot before the board title, and a wash on the dashboard tile.
4. THE colour picker SHALL also offer "Custom": a hue slider and the system colour picker. Any picked colour SHALL be reduced to its OKLCH hue and shown at the fixed lightness and chroma; greys, black and white SHALL be refused with a message, because they have no hue.

### Requirement 49: Managing columns from Board settings

**User Story:** As a Board_Admin, I want to manage the board's columns in one place, so that I can add a stage such as "Ideas" before "To do" or reorder the workflow.

#### Acceptance Criteria

1. Board settings SHALL list the Columns in order with their card counts, and let the admin rename a Column in place (Enter or leaving the field saves; Escape undoes without closing the dialog).
2. Board settings SHALL let the admin move a Column one place left or right, sending one reorder request with distinct, increasing orders for the whole sequence.
3. Board settings SHALL let the admin add a Column at the start, after any Column, or at the end.
4. WHEN the admin deletes a Column from Board settings, THE Frontend SHALL first ask for confirmation naming the number of cards that will be deleted.
5. Changes made in Board settings SHALL appear on the Kanban at once, without a reload.
6. Board settings SHALL also let the admin reorder Columns by dragging a row by its grip, with a drop line showing where it will land; the arrow buttons remain for keyboard users.
7. THE Kanban SHALL end with a slim "+" tile instead of an inline form; it SHALL open an "Add a column" dialog with a name and a position, available to every Board_Member, with a link to the full manager for Board_Admins.
8. WHEN the admin drops a dragged Column row, THE Frontend SHALL update the displayed order before the response arrives, send one PATCH /api/boards/<id>/columns/reorder request with distinct, increasing positive orders for the whole sequence, and revert the list with an error toast if the request fails.
9. THE Column rows SHALL be draggable only from their grip, so that selecting text in the rename field never starts a drag; each row SHALL keep the move-left and move-right buttons with accessible names that include the Column name.

### Requirement 50: Brand mark

**User Story:** As a User, I want the same RevoTask mark in the browser tab, the app and the README, so that the product is recognisable.

#### Acceptance Criteria

1. THE Frontend SHALL use the RevoTask mark from `docs/assets/logo.svg` as `app/icon.svg`, a 16/32/48 px `favicon.ico` and a 180 px `apple-icon.png`.
2. THE Sidebar and Nav_Drawer brand and the auth pages SHALL show the same mark as an inline SVG next to the "RevoTask" name, hidden from assistive technology because the name is next to it.

### Requirement 51: Due dates for cards and boards

**User Story:** As a User, I want cards and boards to have due dates, so that I see what is late or coming up and the board has a target date.

#### Acceptance Criteria

1. THE Backend SHALL store an optional `due_date` (a calendar date, "YYYY-MM-DD", no time zone) on Cards and Boards, accept it on create and update, return it in every Card and Board shape, and reject anything that is not a real date with status 400.
2. THE Card detail SHALL let a member set and clear the due date; THE Card on the Kanban and in My Tasks SHALL show a chip: overdue (danger colour, "N days overdue"), due today or within two days (amber), later (muted), and done for Cards in the last Column (never shown as overdue). The tone SHALL also be stated in words.
3. Board settings and the New board form SHALL let an admin set the board deadline; THE board's Top_Bar and dashboard tile SHALL show it as "12 Dec · 21 days left" or "N days overdue".
4. Days left SHALL be counted in calendar days of the reader's local date, unaffected by daylight-saving changes.

### Requirement 52: Dialogs scroll once and fit every screen

**User Story:** As a User, I want dialogs to scroll smoothly in one place and fit my phone, so that long settings are easy to use.

#### Acceptance Criteria

1. EVERY BaseModal SHALL have exactly one scrolling area, its body, below a fixed header; the dialog itself SHALL NOT scroll. The body SHALL use the quiet scrolling of R44.5 (hidden scrollbar with faded edges where supported).
2. Below 768 px, EVERY BaseModal SHALL open as a bottom sheet across the full width, at most 92% of the viewport tall, respecting the bottom safe area; wide dialogs SHALL be up to 52rem on larger screens.

### Requirement 53: Collapsible sidebar

**User Story:** As a User on a wide screen, I want to collapse the sidebar, so that the board gets more room when I need it.

#### Acceptance Criteria

1. WHILE the viewport is at least 1280 px wide, THE Sidebar SHALL show a collapse button that switches between the full Sidebar and the icon rail of R35.2, with `aria-expanded` and an accessible name naming the action ("Collapse sidebar" or "Expand sidebar").
2. THE choice SHALL be stored in the `revotask_prefs` cookie and rendered on `<html>` as `data-sidebar`, so a reload paints the chosen width with no flash; older cookies without the value SHALL parse as expanded.
3. WHEN the Sidebar collapses or expands, its width, the page padding and the Kanban row SHALL glide over about 380 ms, unless reduced motion is requested.
