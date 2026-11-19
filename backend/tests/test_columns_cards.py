"""Columns (B8-B11) and cards (B12-B16)."""
from app.extensions import db
from app.models import Card


def test_new_column_goes_after_the_last(client, owner, api):
    third = api.column(owner["headers"], owner["board"]["id"], "Review")
    assert third["order"] > owner["done"]["order"] > owner["todo"]["order"]


def test_column_routes_reject_non_members_and_bad_payloads(client, owner, outsider):
    board_id, col_id = owner["board"]["id"], owner["todo"]["id"]
    assert client.post(f"/api/boards/{board_id}/columns", json={"name": "X"}, headers=outsider["headers"]).status_code == 403
    assert client.post(f"/api/boards/{board_id}/columns", json={"name": ""}, headers=owner["headers"]).status_code == 400
    assert client.patch(f"/api/columns/{col_id}", json={"name": "X"}, headers=outsider["headers"]).status_code == 403
    assert client.delete("/api/columns/00000000-0000-0000-0000-000000000000", headers=owner["headers"]).status_code == 404


def test_rename_and_delete_column(client, owner):
    col_id = owner["todo"]["id"]
    res = client.patch(f"/api/columns/{col_id}", json={"name": "Backlog"}, headers=owner["headers"])
    assert res.status_code == 200 and res.get_json()["data"]["name"] == "Backlog"
    assert client.delete(f"/api/columns/{col_id}", headers=owner["headers"]).status_code == 200
    board = client.get(f"/api/boards/{owner['board']['id']}", headers=owner["headers"]).get_json()["data"]
    assert [c["name"] for c in board["columns"]] == ["Done"]


def test_reorder_columns(client, owner):
    board_id = owner["board"]["id"]
    body = {"columns": [{"id": owner["todo"]["id"], "order": 3000}, {"id": owner["done"]["id"], "order": 500}]}
    res = client.patch(f"/api/boards/{board_id}/columns/reorder", json=body, headers=owner["headers"])
    assert res.status_code == 200
    assert [c["name"] for c in res.get_json()["data"]] == ["Done", "To do"]
    bad = {"columns": [{"id": owner["todo"]["id"], "order": -1}]}
    assert client.patch(f"/api/boards/{board_id}/columns/reorder", json=bad, headers=owner["headers"]).status_code == 400


def test_update_card_refreshes_updated_at(client, owner):
    card = owner["card"]
    res = client.patch(f"/api/cards/{card['id']}", json={"title": "Rewritten"}, headers=owner["headers"])
    data = res.get_json()["data"]
    assert res.status_code == 200 and data["title"] == "Rewritten"
    assert data["updated_at"] >= card["updated_at"] and data["created_at"] == card["created_at"]


def test_assignee_must_be_a_board_member(client, owner, outsider, member):
    url = f"/api/cards/{owner['card']['id']}"
    assert client.patch(url, json={"assignee_id": outsider["user"]["id"]}, headers=owner["headers"]).status_code == 400
    res = client.patch(url, json={"assignee_id": member["user"]["id"]}, headers=owner["headers"])
    assert res.status_code == 200 and res.get_json()["data"]["assignee"]["name"] == "Mia Member"
    notes = client.get("/api/notifications", headers=member["headers"]).get_json()["data"]["items"]
    assert "You were assigned Write the brief" in [n["message"] for n in notes]


def test_soft_deleted_card_disappears(app, client, owner):
    card_id = owner["card"]["id"]
    assert client.delete(f"/api/cards/{card_id}", headers=owner["headers"]).status_code == 200
    board = client.get(f"/api/boards/{owner['board']['id']}", headers=owner["headers"]).get_json()["data"]
    assert board["columns"][0]["cards"] == []
    assert client.patch(f"/api/cards/{card_id}", json={"title": "x"}, headers=owner["headers"]).status_code == 404
    assert client.get(f"/api/cards/{card_id}/comments", headers=owner["headers"]).status_code == 404
    row = db.session.get(Card, __import__("uuid").UUID(card_id))
    assert row is not None and row.deleted_at is not None


def test_move_card_persists_and_touches_one_row(client, owner, api):
    other = api.card(owner["headers"], owner["todo"]["id"], "Stays put")
    res = client.patch(f"/api/cards/{owner['card']['id']}/position",
                       json={"column_id": owner["done"]["id"], "order": 512.5}, headers=owner["headers"])
    assert res.status_code == 200
    board = client.get(f"/api/boards/{owner['board']['id']}", headers=owner["headers"]).get_json()["data"]
    todo, done = board["columns"]
    assert [c["id"] for c in done["cards"]] == [owner["card"]["id"]]
    assert done["cards"][0]["order"] == 512.5
    assert todo["cards"][0]["id"] == other["id"] and todo["cards"][0]["order"] == other["order"]


def test_position_schema_rejects_bad_payloads(client, owner):
    url = f"/api/cards/{owner['card']['id']}/position"
    for body in ({"column_id": "not-a-uuid", "order": 10}, {"column_id": owner["done"]["id"], "order": 0},
                 {"column_id": owner["done"]["id"], "order": -5}, {"column_id": owner["done"]["id"]}, {}):
        assert client.patch(url, json=body, headers=owner["headers"]).status_code == 400, body


def test_move_card_to_another_boards_column_returns_400(client, owner, api):
    other_board = api.board(owner["headers"], "Other")
    other_col = api.column(owner["headers"], other_board["id"])
    res = client.patch(f"/api/cards/{owner['card']['id']}/position",
                       json={"column_id": other_col["id"], "order": 10}, headers=owner["headers"])
    assert res.status_code == 400


def test_assignee_filter_and_search(client, owner, member, outsider, api):
    api.card(owner["headers"], owner["todo"]["id"], "Fix 50% bug", description="Discount_code issue")
    client.patch(f"/api/cards/{owner['card']['id']}", json={"assignee_id": owner["user"]["id"]}, headers=owner["headers"])
    mine = client.get("/api/cards?assignee=me", headers=owner["headers"]).get_json()["data"]
    assert [c["title"] for c in mine] == ["Write the brief"] and mine[0]["board_name"] == "Sprint 14"
    found = client.get("/api/cards?search=50%25", headers=owner["headers"]).get_json()["data"]
    assert [c["title"] for c in found] == ["Fix 50% bug"]
    assert [c["title"] for c in client.get("/api/cards?search=DISCOUNT_", headers=owner["headers"]).get_json()["data"]] == ["Fix 50% bug"]
    assert client.get("/api/cards?search=5_", headers=owner["headers"]).get_json()["data"] == []
    # Search never returns cards from boards the user cannot open.
    assert client.get("/api/cards?search=brief", headers=outsider["headers"]).get_json()["data"] == []
    assert client.get("/api/cards?search=%20%20", headers=owner["headers"]).status_code == 400
    assert client.get("/api/cards", headers=owner["headers"]).status_code == 400
