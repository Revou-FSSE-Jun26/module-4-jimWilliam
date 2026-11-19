"""Comments routes B17-B20. Required statuses (R24.2): 201, 400, 401 and 403."""


def _post(client, card_id, headers=None, body=None):
    return client.post(f"/api/cards/{card_id}/comments", json=body if body is not None else {"text": "Looks good"},
                       headers=headers or {})


def test_create_comment_returns_201_with_comment(client, owner):
    res = _post(client, owner["card"]["id"], owner["headers"])
    assert res.status_code == 201
    data = res.get_json()["data"]
    assert data["text"] == "Looks good"
    assert data["author"]["name"] == "Ana Novak"


def test_create_comment_without_text_returns_400(client, owner):
    res = _post(client, owner["card"]["id"], owner["headers"], body={})
    assert res.status_code == 400
    assert "text" in res.get_json()["error"]


def test_create_comment_with_blank_text_returns_400(client, owner):
    res = _post(client, owner["card"]["id"], owner["headers"], body={"text": "   "})
    assert res.status_code == 400


def test_create_comment_without_token_returns_401(client, owner):
    res = _post(client, owner["card"]["id"])
    assert res.status_code == 401
    assert res.get_json() == {"error": "Authentication required"}


def test_create_comment_by_non_member_returns_403(client, owner, outsider):
    res = _post(client, owner["card"]["id"], outsider["headers"])
    assert res.status_code == 403


def test_create_comment_on_unknown_card_returns_404(client, owner):
    res = _post(client, "00000000-0000-0000-0000-000000000000", owner["headers"])
    assert res.status_code == 404


def test_list_comments_returns_comments_in_order(client, owner):
    _post(client, owner["card"]["id"], owner["headers"], {"text": "first"})
    _post(client, owner["card"]["id"], owner["headers"], {"text": "second"})
    res = client.get(f"/api/cards/{owner['card']['id']}/comments", headers=owner["headers"])
    assert res.status_code == 200
    assert [c["text"] for c in res.get_json()["data"]] == ["first", "second"]


def test_owner_can_edit_and_delete_comment(client, owner):
    comment = _post(client, owner["card"]["id"], owner["headers"]).get_json()["data"]
    res = client.patch(f"/api/comments/{comment['id']}", json={"text": "Edited"}, headers=owner["headers"])
    assert res.status_code == 200 and res.get_json()["data"]["text"] == "Edited"
    res = client.delete(f"/api/comments/{comment['id']}", headers=owner["headers"])
    assert res.status_code == 200
    listing = client.get(f"/api/cards/{owner['card']['id']}/comments", headers=owner["headers"]).get_json()["data"]
    assert listing == []


def test_edit_comment_by_other_member_returns_403(client, owner, member):
    comment = _post(client, owner["card"]["id"], owner["headers"]).get_json()["data"]
    res = client.patch(f"/api/comments/{comment['id']}", json={"text": "Hijack"}, headers=member["headers"])
    assert res.status_code == 403


def test_delete_comment_by_other_member_returns_403(client, owner, member):
    comment = _post(client, owner["card"]["id"], owner["headers"]).get_json()["data"]
    res = client.delete(f"/api/comments/{comment['id']}", headers=member["headers"])
    assert res.status_code == 403


def test_edit_comment_with_empty_text_returns_400(client, owner):
    comment = _post(client, owner["card"]["id"], owner["headers"]).get_json()["data"]
    res = client.patch(f"/api/comments/{comment['id']}", json={"text": ""}, headers=owner["headers"])
    assert res.status_code == 400


def test_comment_notifies_assignee_but_not_the_author(client, api, owner, member):
    client.patch(f"/api/cards/{owner['card']['id']}", json={"assignee_id": member["user"]["id"]}, headers=owner["headers"])
    _post(client, owner["card"]["id"], owner["headers"])
    page = client.get("/api/notifications", headers=member["headers"]).get_json()["data"]
    messages = [n["message"] for n in page["items"]]
    assert "New comment on Write the brief" in messages
    # The member commenting on their own card does not notify themselves.
    _post(client, owner["card"]["id"], member["headers"])
    assert client.get("/api/notifications", headers=member["headers"]).get_json()["data"]["total"] == len(messages)
