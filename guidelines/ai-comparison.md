# AI output before and after the steering guidelines

Requirement 23.4 asks for one comparison of AI output for the same prompt, with and without the guidelines, using the number of guideline violations as the measure.

## Method

- **Prompt (identical for both runs):** "Write the Flask code for `POST /api/cards/<id>/comments`, which adds a comment to a card for the logged-in user."
- **Run A (no guidelines):** the prompt alone, with the models available but no `/guidelines` files in context.
- **Run B (with guidelines):** the same prompt with `backend.md` and `database.md` in context.
- **Scoring:** each output was read against every rule in `backend.md` and `database.md`; each rule broken counts once.
- **Who generated it:** both outputs were produced by the AI assistant used to build RevoTask (Claude Code) in the same session. Run A is that model's answer to the bare prompt, so it is indicative rather than independent. To reproduce with Kiro, paste the prompt into a fresh Kiro chat with and without the steering files attached and score both outputs with the table below.

## Run A: without guidelines

```python
@app.route("/api/cards/<int:card_id>/comments", methods=["POST"])
@jwt_required()
def add_comment(card_id):
    data = request.json
    card = Card.query.get_or_404(card_id)
    comment = Comment(text=data["text"], card_id=card_id, user_id=get_jwt_identity())
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment.to_dict()), 201
```

| # | Rule broken | Where | Effect |
|---|---|---|---|
| 1 | BE-01 One Blueprint per feature | Route on `app`, no `comments` Blueprint | Fails the rubric folder check |
| 2 | BE-02 Routes stay thin | Query, insert and commit inside the route | Logic cannot be reused or unit-tested |
| 3 | BE-03 Validate with a schema | `data["text"]` read directly | Missing `text` raises `KeyError` → 500, not 400; empty text accepted |
| 4 | BE-04 Envelope | `jsonify(comment.to_dict())`; `get_or_404` returns an HTML page | Frontend `apiClient` cannot read `data` or `error` |
| 5 | BE-06 Board membership | No `require_member` | Any logged-in user can comment on any board's card |
| 6 | BE-07 Notifications | Assignee is never notified | R31.11 not met |
| 7 | DB-01 UUID keys | `<int:card_id>` | Ids are guessable; does not match the UUID model |
| 8 | DB-03 Soft delete | `Card.query.get_or_404` also finds deleted cards | Comments can be added to deleted cards |

**Violations: 8**

## Run B: with guidelines

The code committed in `backend/app/blueprints/comments/`:

```python
# routes.py
@bp.post("/cards/<uuid:card_id>/comments")
@jwt_required()
def create_comment(card_id):
    comment = service.create_comment(card_id, current_user_id(), request.get_json(silent=True))
    return ok(CommentSchema().dump(comment), 201)

# service.py
def create_comment(card_id, user_id, payload) -> Comment:
    card = get_live_card_or_404(card_id)
    board_id = card.column.board_id
    require_member(board_id, user_id)
    data = CommentTextSchema().load(payload or {})
    comment = Comment(card_id=card.id, user_id=user_id, text=data["text"])
    db.session.add(comment)
    notify(card.assignee_id, f"New comment on {card.title}", actor_id=user_id, card_id=card.id, board_id=board_id)
    db.session.commit()
    return comment
```

| Rule | Result |
|---|---|
| BE-01 | Inside the `comments` Blueprint with `routes.py`, `service.py`, `schema.py` |
| BE-02 | The route reads the request, calls one service, returns `ok(...)` |
| BE-03 | `CommentTextSchema` (required, 1–5000 characters, trimmed, unknown keys excluded) |
| BE-04 / BE-05 | `ok(..., 201)`; errors raised as `AppError` and enveloped; 404 before 403 |
| BE-06 | `require_member` on the Card's Board |
| BE-07 | Assignee notified, never the author |
| DB-01 / DB-03 | `<uuid:...>` converter; `get_live_card_or_404` ignores deleted Cards |
| DB-10 | One commit after the comment and its notification |

**Violations: 0**

## Result

| | Run A | Run B |
|---|---|---|
| Guideline violations | 8 | 0 |
| Correct status for a missing `text` | 500 | 400 |
| Non-member can comment | yes | no (403) |
| Covered by tests | none | `tests/test_comments.py` (201, 400, 401, 403, 404, owner-only edit and delete) |

The guidelines removed every violation found in the unguided output for this prompt (8 → 0). The two biggest risks they closed were a security hole (BE-06: any user could comment on any board) and an unhandled crash on bad input (BE-03).
