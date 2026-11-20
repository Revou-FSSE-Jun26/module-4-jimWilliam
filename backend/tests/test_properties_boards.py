"""Property tests for boards, members and access control.

Feature: revotask, Properties 7, 9, 10, 11, 35 (design "Correctness Properties").
"""
from hypothesis import given
from hypothesis import strategies as st

from tests.strategies import names, positive_floats


def _board_with_roles(api, client, role):
    """An admin's board, plus a second user who is `role` on it (none, member or admin)."""
    _, admin_headers, _ = api.user("Admin")
    board = api.board(admin_headers)
    column = api.column(admin_headers, board["id"])
    card = api.card(admin_headers, column["id"])
    comment = client.post(f"/api/cards/{card['id']}/comments", json={"text": "by admin"}, headers=admin_headers).get_json()["data"]
    _, headers, email = api.user("Actor")
    if role != "none":
        api.add_member(admin_headers, board["id"], email, role)
    return board, column, card, comment, headers


ROUTES = [
    # (method, path, body, who may do it: "admin" | "member" | "owner")
    ("get", "/api/boards/{b}", None, "member"),
    ("patch", "/api/boards/{b}", {"name": "Renamed"}, "admin"),
    ("get", "/api/boards/{b}/analytics", None, "admin"),
    ("get", "/api/boards/{b}/members", None, "member"),
    ("post", "/api/boards/{b}/columns", {"name": "New"}, "member"),
    ("patch", "/api/columns/{c}", {"name": "Renamed"}, "member"),
    ("post", "/api/columns/{c}/cards", {"title": "New"}, "member"),
    ("patch", "/api/cards/{k}", {"title": "Renamed"}, "member"),
    ("get", "/api/cards/{k}/comments", None, "member"),
    ("post", "/api/cards/{k}/comments", {"text": "hi"}, "member"),
    ("patch", "/api/comments/{m}", {"text": "edit"}, "owner"),
    ("delete", "/api/comments/{m}", None, "owner"),
]


# Feature: revotask, Property 7: Access follows membership, role and ownership
@given(role=st.sampled_from(["none", "member", "admin"]), route=st.sampled_from(ROUTES))
def test_property_7_access_follows_membership_role_and_ownership(client, api, role, route):
    board, column, card, comment, headers = _board_with_roles(api, client, role)
    method, path, body, needs = route
    url = path.format(b=board["id"], c=column["id"], k=card["id"], m=comment["id"])
    res = getattr(client, method)(url, json=body, headers=headers)
    allowed = {"none": False, "member": needs == "member", "admin": needs in ("member", "admin")}[role]
    assert res.status_code < 400 if allowed else res.status_code == 403, (role, method, path, res.get_json())


BOARD_SHAPES = st.lists(st.lists(st.integers(min_value=0, max_value=3), min_size=0, max_size=3), min_size=1, max_size=3)


# Feature: revotask, Property 9: Board create and fetch round trip
@given(shapes=BOARD_SHAPES)
def test_property_9_board_create_and_fetch_round_trip(client, api, shapes):
    _, headers, _ = api.user()
    api.board(api.user("Stranger")[1], "Not mine")
    expected = {}
    for b, columns in enumerate(shapes):
        board = api.board(headers, f"Board {b}")
        expected[board["id"]] = []
        for c, n_cards in enumerate(columns):
            col = api.column(headers, board["id"], f"Col {c}")
            titles = [api.card(headers, col["id"], f"Card {c}.{k}")["title"] for k in range(n_cards)]
            expected[board["id"]].append((f"Col {c}", titles))
    listed = client.get("/api/boards", headers=headers).get_json()["data"]
    assert {b["id"] for b in listed} == set(expected)
    assert all(b["role"] == "admin" for b in listed)
    for board_id, columns in expected.items():
        detail = client.get(f"/api/boards/{board_id}", headers=headers).get_json()["data"]
        assert [(c["name"], [card["title"] for card in c["cards"]]) for c in detail["columns"]] == columns


# Feature: revotask, Property 10: Board update applies the given fields
@given(name=names.filter(lambda s: len(s.strip()) <= 120))
def test_property_10_board_update_applies_the_given_fields(client, owner, name):
    url = f"/api/boards/{owner['board']['id']}"
    res = client.patch(url, json={"name": name}, headers=owner["headers"])
    assert res.status_code == 200 and res.get_json()["data"]["name"] == name.strip()
    assert client.get(url, headers=owner["headers"]).get_json()["data"]["name"] == name.strip()


# Feature: revotask, Property 11: Column reorder round trip
@given(orders=st.lists(positive_floats, min_size=1, max_size=5, unique=True))
def test_property_11_column_reorder_round_trip(client, api, orders):
    _, headers, _ = api.user()
    board = api.board(headers)
    cols = [api.column(headers, board["id"], f"C{i}") for i in range(len(orders))]
    body = {"columns": [{"id": c["id"], "order": o} for c, o in zip(cols, orders)]}
    assert client.patch(f"/api/boards/{board['id']}/columns/reorder", json=body, headers=headers).status_code == 200
    expected = [c["name"] for c, _ in sorted(zip(cols, orders), key=lambda pair: pair[1])]
    detail = client.get(f"/api/boards/{board['id']}", headers=headers).get_json()["data"]
    assert [c["name"] for c in detail["columns"]] == expected


# Feature: revotask, Property 35: A Board always keeps an admin
@given(ops=st.lists(st.tuples(st.sampled_from(["add", "remove"]), st.integers(min_value=0, max_value=3), st.sampled_from(["member", "admin"])),
                    min_size=1, max_size=8))
def test_property_35_a_board_always_keeps_an_admin(client, api, ops):
    creator, headers, _ = api.user("Creator")
    board = api.board(headers)
    people = [api.user(f"P{i}") for i in range(4)]
    url = f"/api/boards/{board['id']}/members"
    for op, who, role in ops:
        user, _, email = people[who]
        if op == "add":
            client.post(url, json={"email": email, "role": role}, headers=headers)
        else:
            target = creator["id"] if role == "admin" else user["id"]
            before = client.get(url, headers=headers).get_json()["data"]
            res = client.delete(f"{url}/{target}", headers=headers)
            if res.status_code == 409:  # refused: memberships unchanged
                assert client.get(url, headers=headers).get_json()["data"] == before
            if target == creator["id"] and res.status_code == 200:
                return  # the creator left; they can no longer manage this board
        members = client.get(url, headers=headers).get_json()["data"]
        assert any(m["role"] == "admin" for m in members)
