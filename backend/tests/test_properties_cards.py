"""Property tests for cards, comments, notifications and analytics.

Feature: revotask, Properties 12-17, 19-23 (design "Correctness Properties").
"""
import uuid

from hypothesis import assume, given
from hypothesis import strategies as st

from app.common.richtext import clean_description
from app.extensions import db
from app.models import Card, Notification
from tests.strategies import PRINTABLE, positive_floats


def _cards(client, headers, board_id):
    board = client.get(f"/api/boards/{board_id}", headers=headers).get_json()["data"]
    return {card["id"]: (col["id"], card["order"]) for col in board["columns"] for card in col["cards"]}


# Feature: revotask, Property 12: Card position persists and touches one row
@given(n_cards=st.integers(min_value=1, max_value=4), target=st.integers(min_value=0, max_value=1), order=positive_floats,
       which=st.integers(min_value=0, max_value=3))
def test_property_12_card_position_persists_and_touches_one_row(client, api, n_cards, target, order, which):
    _, headers, _ = api.user()
    board = api.board(headers)
    cols = [api.column(headers, board["id"], "A"), api.column(headers, board["id"], "B")]
    cards = [api.card(headers, cols[0]["id"], f"c{i}") for i in range(n_cards)]
    moved = cards[which % n_cards]["id"]
    before = _cards(client, headers, board["id"])
    res = client.patch(f"/api/cards/{moved}/position", json={"column_id": cols[target]["id"], "order": order}, headers=headers)
    assert res.status_code == 200
    after = _cards(client, headers, board["id"])
    assert after[moved] == (cols[target]["id"], order)
    assert {k: v for k, v in after.items() if k != moved} == {k: v for k, v in before.items() if k != moved}


ORDERS = st.one_of(positive_floats, st.floats(max_value=0), st.just(float("nan")), st.just(float("inf")),
                   st.text(max_size=5), st.none(), st.booleans())


# Feature: revotask, Property 13: Position schema accepts only valid payloads
@given(column=st.sampled_from(["valid", "junk", "missing"]), junk=st.text(max_size=12), order=ORDERS)
def test_property_13_position_schema_accepts_only_valid_payloads(client, owner, column, junk, order):
    payload = {"order": order}
    if column == "valid":
        payload["column_id"] = owner["done"]["id"]
    elif column == "junk":
        assume(not _is_uuid(junk))
        payload["column_id"] = junk
    res = client.patch(f"/api/cards/{owner['card']['id']}/position", json=payload, headers=owner["headers"])
    valid_order = isinstance(order, float) and order == order and order not in (float("inf"),) and order > 0
    if column == "valid" and valid_order:
        assert res.status_code == 200
    else:
        assert res.status_code == 400, (payload, res.get_json())


def _is_uuid(value):
    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError, TypeError):
        return False


# Feature: revotask, Property 14: Card update refreshes updated_at
@given(title=st.text(PRINTABLE, min_size=1, max_size=60).filter(lambda s: s.strip()), description=st.one_of(st.none(), st.text(max_size=80)))
def test_property_14_card_update_refreshes_updated_at(client, owner, title, description):
    url = f"/api/cards/{owner['card']['id']}"
    before = client.get(f"/api/boards/{owner['board']['id']}", headers=owner["headers"]).get_json()["data"]
    old = next(c for col in before["columns"] for c in col["cards"] if c["id"] == owner["card"]["id"])
    res = client.patch(url, json={"title": title, "description": description}, headers=owner["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]
    # Descriptions are stored as sanitised HTML (R40); plain text becomes escaped paragraphs.
    assert data["title"] == title.strip() and data["description"] == clean_description(description)[0]
    assert data["updated_at"] >= old["updated_at"] and data["created_at"] == old["created_at"]


# Feature: revotask, Property 15: Soft-deleted Cards never appear
@given(n_cards=st.integers(min_value=1, max_value=5), delete_mask=st.lists(st.booleans(), min_size=5, max_size=5))
def test_property_15_soft_deleted_cards_never_appear(app, client, api, n_cards, delete_mask):
    user, headers, _ = api.user()
    board = api.board(headers)
    col = api.column(headers, board["id"])
    cards = [api.card(headers, col["id"], f"needle {i}", assignee_id=user["id"]) for i in range(n_cards)]
    deleted = {c["id"] for c, d in zip(cards, delete_mask) if d}
    for card_id in deleted:
        assert client.delete(f"/api/cards/{card_id}", headers=headers).status_code == 200
    visible = set(_cards(client, headers, board["id"]))
    assert visible == {c["id"] for c in cards} - deleted
    for query in ("assignee=me", "search=needle"):
        found = {c["id"] for c in client.get(f"/api/cards?{query}", headers=headers).get_json()["data"]}
        assert not (found & deleted)
    for card_id in deleted:
        assert client.patch(f"/api/cards/{card_id}", json={"title": "x"}, headers=headers).status_code == 404
        assert client.patch(f"/api/cards/{card_id}/position", json={"column_id": col["id"], "order": 1}, headers=headers).status_code == 404
        assert client.get(f"/api/cards/{card_id}/comments", headers=headers).status_code == 404
        assert db.session.get(Card, uuid.UUID(card_id)).deleted_at is not None


# Feature: revotask, Property 16: Assignee filter
@given(assignees=st.lists(st.sampled_from(["me", "other", "none"]), min_size=1, max_size=6))
def test_property_16_assignee_filter(client, api, assignees):
    me, headers, _ = api.user("Me")
    other, _, other_email = api.user("Other")
    board = api.board(headers)
    api.add_member(headers, board["id"], other_email)
    col = api.column(headers, board["id"])
    mine = set()
    for i, who in enumerate(assignees):
        assignee = {"me": me["id"], "other": other["id"], "none": None}[who]
        card = api.card(headers, col["id"], f"t{i}", assignee_id=assignee)
        if who == "me":
            mine.add(card["id"])
    found = client.get("/api/cards?assignee=me", headers=headers).get_json()["data"]
    assert {c["id"] for c in found} == mine
    assert all(c["board_name"] == "Sprint 14" for c in found)


TEXT = st.text(st.sampled_from("abcAB%_\\' x1"), min_size=1, max_size=12)


# Feature: revotask, Property 17: Search is case-insensitive and complete
@given(titles=st.lists(TEXT, min_size=1, max_size=5), descriptions=st.lists(st.one_of(st.none(), TEXT), min_size=5, max_size=5),
       term=TEXT.filter(lambda s: s.strip()))
def test_property_17_search_is_case_insensitive_and_complete(client, api, titles, descriptions, term):
    _, headers, _ = api.user()
    board = api.board(headers)
    col = api.column(headers, board["id"])
    created = []
    for title, desc in zip(titles, descriptions):
        assume(title.strip())
        card = api.card(headers, col["id"], title, description=desc)
        created.append((card["id"], card["title"], desc))
    # A stranger's board with a matching card must never show up.
    _, s_headers, _ = api.user("Stranger")
    s_col = api.column(s_headers, api.board(s_headers)["id"])
    api.card(s_headers, s_col["id"], term.strip() or "x")
    needle = term.strip().lower()
    expected = {cid for cid, title, desc in created if needle in title.lower() or (desc is not None and needle in desc.lower())}
    res = client.get("/api/cards", query_string={"search": term}, headers=headers)
    assert res.status_code == 200
    assert {c["id"] for c in res.get_json()["data"]} == expected


# Feature: revotask, Property 19: Comment create and list round trip
@given(texts=st.lists(st.tuples(st.text(PRINTABLE, min_size=1, max_size=40).filter(lambda s: s.strip()), st.booleans()), min_size=1, max_size=5))
def test_property_19_comment_create_and_list_round_trip(client, api, owner, texts):
    _, member_headers, member_email = api.user("Member")
    api.add_member(owner["headers"], owner["board"]["id"], member_email)
    card = api.card(owner["headers"], owner["todo"]["id"], "fresh")
    for text, by_member in texts:
        res = client.post(f"/api/cards/{card['id']}/comments", json={"text": text}, headers=member_headers if by_member else owner["headers"])
        assert res.status_code == 201
    listed = client.get(f"/api/cards/{card['id']}/comments", headers=owner["headers"]).get_json()["data"]
    assert [(c["text"], c["author"]["name"]) for c in listed] == [(t.strip(), "Member" if m else "Ana Novak") for t, m in texts]


# Feature: revotask, Property 20: Comment owner can edit and delete
@given(text=st.text(PRINTABLE, min_size=1, max_size=40).filter(lambda s: s.strip()))
def test_property_20_comment_owner_can_edit_and_delete(client, owner, text):
    card = owner["card"]["id"]
    comment = client.post(f"/api/cards/{card}/comments", json={"text": "original"}, headers=owner["headers"]).get_json()["data"]
    res = client.patch(f"/api/comments/{comment['id']}", json={"text": text}, headers=owner["headers"])
    assert res.status_code == 200 and res.get_json()["data"]["text"] == text.strip()
    assert client.delete(f"/api/comments/{comment['id']}", headers=owner["headers"]).status_code == 200
    ids = [c["id"] for c in client.get(f"/api/cards/{card}/comments", headers=owner["headers"]).get_json()["data"]]
    assert comment["id"] not in ids


# Feature: revotask, Property 21: Notification pagination partitions the set
@given(n=st.integers(min_value=0, max_value=25), per_page=st.integers(min_value=1, max_value=10))
def test_property_21_notification_pagination_partitions_the_set(app, client, api, n, per_page):
    user, headers, _ = api.user()
    other, _, _ = api.user("Other")
    for i in range(n):
        db.session.add(Notification(user_id=uuid.UUID(user["id"]), message=f"n{i}"))
        db.session.add(Notification(user_id=uuid.UUID(other["id"]), message=f"other {i}"))
    db.session.commit()
    seen = []
    pages = max(1, -(-n // per_page))
    for page in range(1, pages + 1):
        data = client.get(f"/api/notifications?page={page}&per_page={per_page}", headers=headers).get_json()["data"]
        assert data["total"] == n and len(data["items"]) <= per_page
        seen += [item["message"] for item in data["items"]]
    assert sorted(seen) == sorted(f"n{i}" for i in range(n))


# Feature: revotask, Property 22: Marking read is idempotent
@given(n_unread=st.integers(min_value=1, max_value=5), repeats=st.integers(min_value=1, max_value=4))
def test_property_22_marking_read_is_idempotent(app, client, api, n_unread, repeats):
    user, headers, _ = api.user()
    for i in range(n_unread):
        db.session.add(Notification(user_id=uuid.UUID(user["id"]), message=f"n{i}"))
    db.session.commit()
    first = client.get("/api/notifications", headers=headers).get_json()["data"]
    target = first["items"][0]["id"]
    for _ in range(repeats):
        res = client.patch(f"/api/notifications/{target}/read", headers=headers)
        assert res.status_code == 200 and res.get_json()["data"]["read"] is True
    assert client.get("/api/notifications", headers=headers).get_json()["data"]["unread_count"] == n_unread - 1


# Feature: revotask, Property 23: Analytics matches a reference model
@given(layout=st.lists(st.lists(st.tuples(st.sampled_from([None, 0, 1]), st.integers(min_value=0, max_value=2)), max_size=3),
                       min_size=1, max_size=3))
def test_property_23_analytics_matches_a_reference_model(client, api, layout):
    admin, headers, _ = api.user("Admin")
    member, m_headers, m_email = api.user("Member")
    board = api.board(headers)
    api.add_member(headers, board["id"], m_email)
    people = [(admin, headers), (member, m_headers)]
    ref_cols, ref_comments, ref_assigned = [], {admin["id"]: 0, member["id"]: 0}, {admin["id"]: 0, member["id"]: 0}
    for c, cards in enumerate(layout):
        col = api.column(headers, board["id"], f"Col {c}")
        ref_cols.append((col["name"], len(cards)))
        for k, (assignee, n_comments) in enumerate(cards):
            assignee_id = people[assignee][0]["id"] if assignee is not None else None
            card = api.card(headers, col["id"], f"card {c}.{k}", assignee_id=assignee_id)
            if assignee_id:
                ref_assigned[assignee_id] += 1
            for j in range(n_comments):
                user, h = people[j % 2]
                client.post(f"/api/cards/{card['id']}/comments", json={"text": "x"}, headers=h)
                ref_comments[user["id"]] += 1
    data = client.get(f"/api/boards/{board['id']}/analytics", headers=headers).get_json()["data"]
    assert [(c["name"], c["count"]) for c in data["cards_per_column"]] == ref_cols
    assert data["completed_this_week"] == ref_cols[-1][1]  # every card was updated this week
    activity = {a["user_id"]: (a["comments"], a["cards_assigned"]) for a in data["activity_per_member"]}
    assert activity == {uid: (ref_comments[uid], ref_assigned[uid]) for uid in ref_comments}
