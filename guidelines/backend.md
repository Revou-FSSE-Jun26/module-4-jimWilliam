# Backend guidelines (Flask API)

Scope: how Flask code is organised, validated, secured, and tested. Database modelling and query rules live in `database.md`; anything in the Next.js app lives in `frontend.md`. Every rule has an ID so reviews and the violation report can cite it.

---

## BE-01 One Blueprint per feature, three files each

**Rule:** Each feature lives in `app/blueprints/<feature>/` with exactly `routes.py` (HTTP), `service.py` (business logic) and `schema.py` (Marshmallow schemas). The eight Blueprints are auth, boards, columns, cards, comments, notifications, analytics and users.

**Rationale:** The rubric checks this layout, and a fixed shape means anyone can find the code for a route in one guess.

**Example:**
```
app/blueprints/comments/
  __init__.py   # bp = Blueprint("comments", __name__)
  routes.py     # create_comment(), list_comments(), update_comment(), delete_comment()
  service.py    # create_comment(card_id, user_id, data) -> Comment
  schema.py     # CommentCreateSchema, CommentSchema
```

## BE-02 Routes stay thin

**Rule:** A route function only reads the request, calls one service function, and returns `ok(...)`. It never queries the database or checks access. (Where the commit happens is covered by DB-10.)

**Rationale:** Logic in routes cannot be reused or unit-tested without HTTP, and it is where access checks get forgotten.

**Example:**
```python
@bp.post("/cards/<uuid:card_id>/comments")
@jwt_required()
def create_comment(card_id):
    comment = service.create_comment(card_id, current_user_id(), request.get_json(silent=True))
    return ok(CommentSchema().dump(comment), 201)
```

## BE-03 Validate every payload with a Marshmallow schema in the service

**Rule:** Every request body and query string is loaded through a Marshmallow schema before use. Never read `request.json["field"]` directly. Unknown fields are excluded (`unknown = EXCLUDE`).

**Rationale:** Validation in one place gives a consistent 400 response (R11.4) and stops fields like `password` from leaking into updates (R9.3).

**Example:**
```python
class CardPositionSchema(Schema):
    class Meta:
        unknown = EXCLUDE
    column_id = fields.UUID(required=True)
    order = fields.Float(required=True, validate=validate.Range(min=0, min_inclusive=False))

data = CardPositionSchema().load(payload or {})   # ValidationError -> 400
```

## BE-04 Every response uses the envelope

**Rule:** Success responses go through `ok(data, status)` and produce `{"data": ...}`. Errors are raised as `AppError(message, status)` and turned into `{"error": "..."}` by the global handler. Routes never call `jsonify` directly.

**Rationale:** The frontend `apiClient` reads only `data` and `error`; one shape for every route is what R11.3 asks for.

**Example:**
```python
return ok(BoardSchema().dump(board), 201)        # {"data": {...}}
raise AppError("Board not found", 404)            # {"error": "Board not found"}
```

## BE-05 Use the right status code

**Rule:** 200 read/update/delete, 201 create, 400 validation or bad reference, 401 missing or invalid JWT, 403 authenticated but not allowed, 404 unknown or soft-deleted resource, 409 conflict (duplicate email, existing member, last admin). Check existence (404) before permission (403).

**Rationale:** The comments tests (R24.2) and the frontend error toasts depend on exact codes.

**Example:**
```python
board = db.session.get(Board, board_id)
if board is None:
    raise AppError("Board not found", 404)   # first
if membership is None:
    raise AppError("Forbidden", 403)          # second
```

## BE-06 Protect routes with JWT and board membership

**Rule:** Every route except register, login and health has `@jwt_required()`. Every service that touches a Board, Column, Card or Comment resolves the Board and calls `require_member(board_id, user_id, admin=...)` before reading or writing.

**Rationale:** Access is per Board (R31). One helper means one place to get it right.

**Example:**
```python
def update_board(board_id, user_id, payload):
    require_member(board_id, user_id, admin=True)   # 404 / 403
    data = BoardUpdateSchema().load(payload or {})
```

## BE-07 Comments and notifications follow ownership

**Rule:** Only the author may edit or delete a Comment; only the recipient may mark a Notification as read. Never notify a user about their own action.

**Rationale:** R6.7, R7.3 and R31.11; notifications about your own actions are noise.

**Example:**
```python
if comment.user_id != user_id:
    raise AppError("You can only edit your own comments", 403)
if card.assignee_id and card.assignee_id != user_id:
    notify(card.assignee_id, f"New comment on {card.title}", card_id=card.id)
```

## BE-08 No secrets or stack traces in responses

**Rule:** The 500 handler returns `{"error": "Internal server error"}` and logs the traceback server-side. Error messages never include SQL, exception text, or other users' data.

**Rationale:** Stack traces leak internals (R11.6) and wrong-credential messages must not reveal which emails exist.

**Example:**
```python
@app.errorhandler(Exception)
def handle_unexpected(err):
    app.logger.exception("Unhandled error")
    return fail("Internal server error", 500)
```

## BE-09 Configuration comes from the environment

**Rule:** `JWT_SECRET_KEY`, `DATABASE_URL`, `FRONTEND_ORIGIN` and `JWT_ACCESS_TOKEN_EXPIRES_HOURS` are read in `config.py` from environment variables (python-dotenv locally). No secret appears in code; `.env.example` lists every variable with a placeholder.

**Rationale:** R30.2 and R28.2; the same code runs locally, in tests and on Railway.

**Example:**
```python
JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
CORS(app, origins=[app.config["FRONTEND_ORIGIN"]], allow_headers=["Authorization", "Content-Type"])
```

## BE-10 Passwords are hashed and never serialised

**Rule:** Store `generate_password_hash(password)`; compare with `check_password_hash`. Output schemas for users never contain `password` or `password_hash`. Login returns the same 401 message for an unknown email and a wrong password.

**Rationale:** R1.6, R9.1 and protection against account enumeration.

**Example:**
```python
if user is None or not check_password_hash(user.password_hash, data["password"]):
    raise AppError("Invalid email or password", 401)
```

## BE-11 Every route has tests for success and each documented error

**Rule:** For each route, pytest covers the success status and each error status listed in the design route table, using the shared fixtures in `tests/conftest.py`. Test names say the behaviour: `test_create_comment_returns_403_for_non_member`.

**Rationale:** `pytest -v` is graded (R24) and the route table is the contract.

**Example:**
```python
def test_update_comment_by_other_user_returns_403(client, comment, other_user_headers):
    res = client.patch(f"/api/comments/{comment.id}", json={"text": "x"}, headers=other_user_headers)
    assert res.status_code == 403
    assert "error" in res.get_json()
```
