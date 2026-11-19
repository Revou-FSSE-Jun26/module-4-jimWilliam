"""Boards (B3-B7) and members (B27-B29)."""


def test_create_board_makes_creator_admin(client, api):
    _, headers, _ = api.user()
    res = client.post("/api/boards", json={"name": "  Launch  "}, headers=headers)
    assert res.status_code == 201
    assert res.get_json()["data"]["name"] == "Launch"
    assert res.get_json()["data"]["role"] == "admin"


def test_create_board_without_name_returns_400(client, api):
    _, headers, _ = api.user()
    assert client.post("/api/boards", json={}, headers=headers).status_code == 400


def test_list_boards_returns_only_member_boards(client, api, owner, outsider):
    api.board(outsider["headers"], "Private")
    names = [b["name"] for b in client.get("/api/boards", headers=owner["headers"]).get_json()["data"]]
    assert names == ["Sprint 14"]


def test_get_board_nests_columns_and_cards_in_order(client, owner, api):
    api.card(owner["headers"], owner["todo"]["id"], "Second card")
    res = client.get(f"/api/boards/{owner['board']['id']}", headers=owner["headers"])
    assert res.status_code == 200
    board = res.get_json()["data"]
    assert [c["name"] for c in board["columns"]] == ["To do", "Done"]
    assert [c["title"] for c in board["columns"][0]["cards"]] == ["Write the brief", "Second card"]
    assert board["columns"][0]["cards"][0]["comment_count"] == 0


def test_get_board_by_non_member_returns_403_and_unknown_returns_404(client, owner, outsider):
    assert client.get(f"/api/boards/{owner['board']['id']}", headers=outsider["headers"]).status_code == 403
    assert client.get("/api/boards/00000000-0000-0000-0000-000000000000", headers=owner["headers"]).status_code == 404


def test_member_cannot_rename_or_delete_board(client, owner, member):
    board_id = owner["board"]["id"]
    assert client.patch(f"/api/boards/{board_id}", json={"name": "X"}, headers=member["headers"]).status_code == 403
    assert client.delete(f"/api/boards/{board_id}", headers=member["headers"]).status_code == 403


def test_admin_can_rename_and_delete_board(client, owner):
    board_id = owner["board"]["id"]
    res = client.patch(f"/api/boards/{board_id}", json={"name": "Renamed"}, headers=owner["headers"])
    assert res.status_code == 200 and res.get_json()["data"]["name"] == "Renamed"
    assert client.delete(f"/api/boards/{board_id}", headers=owner["headers"]).status_code == 200
    assert client.get(f"/api/boards/{board_id}", headers=owner["headers"]).status_code == 404


def test_add_member_flow(client, api, owner):
    _, headers, email = api.user("New Person")
    board_id = owner["board"]["id"]
    res = client.post(f"/api/boards/{board_id}/members", json={"email": email}, headers=owner["headers"])
    assert res.status_code == 201 and res.get_json()["data"]["role"] == "member"
    assert client.post(f"/api/boards/{board_id}/members", json={"email": email}, headers=owner["headers"]).status_code == 409
    unknown = client.post(f"/api/boards/{board_id}/members", json={"email": "ghost@example.com"}, headers=owner["headers"])
    assert unknown.status_code == 404
    # The new member was notified and can now see the board.
    notes = client.get("/api/notifications", headers=headers).get_json()["data"]["items"]
    assert notes[0]["message"] == "You were added to Sprint 14"
    assert client.get(f"/api/boards/{board_id}", headers=headers).status_code == 200


def test_member_cannot_manage_members(client, owner, member, api):
    _, _, email = api.user("Someone")
    board_id = owner["board"]["id"]
    assert client.post(f"/api/boards/{board_id}/members", json={"email": email}, headers=member["headers"]).status_code == 403
    assert client.delete(f"/api/boards/{board_id}/members/{owner['user']['id']}", headers=member["headers"]).status_code == 403


def test_last_admin_cannot_be_removed(client, owner, member):
    board_id = owner["board"]["id"]
    res = client.delete(f"/api/boards/{board_id}/members/{owner['user']['id']}", headers=owner["headers"])
    assert res.status_code == 409
    res = client.delete(f"/api/boards/{board_id}/members/{member['user']['id']}", headers=owner["headers"])
    assert res.status_code == 200
    members = client.get(f"/api/boards/{board_id}/members", headers=owner["headers"]).get_json()["data"]
    assert [m["role"] for m in members] == ["admin"]
