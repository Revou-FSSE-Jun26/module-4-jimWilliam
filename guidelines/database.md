# Database guidelines (SQLAlchemy + PostgreSQL)

Scope: models, columns, relationships, migrations and queries. How services and routes use them is in `backend.md`.

---

## DB-01 UUID primary keys everywhere

**Rule:** Every table's primary key is `db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)`. Foreign keys use `db.Uuid` too. URLs use `<uuid:...>` converters.

**Rationale:** UUIDs do not reveal row counts or allow guessing other users' ids, and the brief requires a UUID Card key.

**Example:**
```python
id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
column_id = db.Column(db.Uuid, db.ForeignKey("columns.id", ondelete="CASCADE"), nullable=False)
```

## DB-02 Timestamps on every table, timezone-aware

**Rule:** Every model has `created_at` and `updated_at` as `db.DateTime(timezone=True)` in UTC, set by defaults (`utcnow`) and `onupdate`, never by hand in services.

**Rationale:** Analytics ("completed this week") and sorting depend on reliable times; naive datetimes break across time zones.

**Example:**
```python
created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
```

## DB-03 Cards are soft-deleted

**Rule:** Deleting a Card sets `deleted_at`; it never issues `DELETE`. Every Card query includes `Card.deleted_at.is_(None)`, through the `live_cards()` helper.

**Rationale:** R4.4 requires soft delete, and comments and notifications keep pointing at a valid row.

**Example:**
```python
def live_cards():
    return select(Card).where(Card.deleted_at.is_(None))
```

## DB-04 Order is a FLOAT and moves update one row

**Rule:** Columns and Cards store order in `db.Column(db.Float, nullable=False)`. A move writes the new order of the moved row only; it never renumbers siblings.

**Rationale:** The brief requires the FLOAT order strategy, and R30.5 limits a move to one row.

**Example:**
```python
order = db.Column(db.Float, nullable=False)
card.column_id, card.order = column.id, data["order"]   # one UPDATE
```

## DB-05 Schema changes only through Flask-Migrate

**Rule:** Never call `db.create_all()` outside tests. Every model change gets a migration (`flask db migrate -m "..."`), reviewed by hand, then applied with `flask db upgrade`.

**Rationale:** R11.5 and R27.2; migrations are applied to Supabase with `flask db upgrade` before each backend deploy, so the migration files are the source of truth.

**Example:**
```
flask db migrate -m "add board_members"
flask db upgrade
```

## DB-06 Index what you filter and sort by

**Rule:** Add an index for every foreign key used in a filter and for every `(parent_id, order)` pair used for sorting: `cards(column_id, order)`, `columns(board_id, order)`, `cards(assignee_id)`, `board_members(user_id)`, `comments(card_id)`, `notifications(user_id, read)`.

**Rationale:** The p95 latency target (R30.1) fails as soon as these lookups scan full tables.

**Example:**
```python
__table_args__ = (db.Index("ix_cards_column_order", "column_id", "order"),)
```

## DB-07 Queries use the ORM with bound parameters

**Rule:** Build queries with SQLAlchemy expressions. Never format user input into SQL strings. `LIKE` patterns escape `%`, `_` and `\` and pass `escape="\\"`.

**Rationale:** R30.4: parameterised queries prevent SQL injection, and escaping keeps search literal.

**Example:**
```python
pattern = f"%{escape_like(term)}%"
stmt = stmt.where(or_(Card.title.ilike(pattern, escape="\\"), Card.description.ilike(pattern, escape="\\")))
```

## DB-08 Load related rows in bulk, never in a loop

**Rule:** When a response nests related rows (a Board with Columns and Cards), load them with `selectinload` or one query per level. Analytics uses joins and `GROUP BY` in SQL, not Python loops over rows.

**Rationale:** N+1 queries make GET /api/boards/<id> slow as boards grow (R30.1), and R8.2 requires joins.

**Example:**
```python
stmt = (select(func.count(Card.id), Column.id)
        .join(Card, Card.column_id == Column.id)
        .where(Column.board_id == board_id, Card.deleted_at.is_(None))
        .group_by(Column.id))
```

## DB-09 Integrity lives in the schema

**Rule:** Use `nullable=False`, `unique=True`, `UniqueConstraint` and `ondelete="CASCADE"` to enforce rules the data must always meet (unique email, one membership per user and board, columns deleted with their board).

**Rationale:** Service checks can race; constraints cannot be skipped.

**Example:**
```python
__table_args__ = (db.UniqueConstraint("board_id", "user_id", name="uq_board_member"),)
```

## DB-10 One commit per service call

**Rule:** A service function makes all its changes (including notifications) and then calls `db.session.commit()` once. Routes and models never commit.

**Rationale:** A Card update and its Notification succeed or fail together.

**Example:**
```python
card.assignee_id = new_assignee
notify(new_assignee, f"You were assigned {card.title}", card_id=card.id)
db.session.commit()
```
