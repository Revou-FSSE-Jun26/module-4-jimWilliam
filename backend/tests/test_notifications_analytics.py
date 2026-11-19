"""Notifications (B21, B22) and analytics (B23)."""


def _notify_member(client, owner, member, times):
    for i in range(times):
        card = client.post(f"/api/columns/{owner['todo']['id']}/cards", json={"title": f"Task {i}"},
                           headers=owner["headers"]).get_json()["data"]
        client.patch(f"/api/cards/{card['id']}", json={"assignee_id": member["user"]["id"]}, headers=owner["headers"])


def test_notifications_paginate_without_overlap(client, owner, member):
    _notify_member(client, owner, member, 5)   # plus 1 "added to board" notification = 6
    seen = []
    for page in (1, 2, 3):
        data = client.get(f"/api/notifications?page={page}&per_page=4", headers=member["headers"]).get_json()["data"]
        assert data["total"] == 6 and len(data["items"]) <= 4
        seen += [n["id"] for n in data["items"]]
    assert len(seen) == len(set(seen)) == 6


def test_notifications_reject_bad_paging(client, owner, member):
    for query in ("page=0", "per_page=-1", "page=abc", "per_page=1000"):
        assert client.get(f"/api/notifications?{query}", headers=member["headers"]).status_code == 400, query


def test_mark_read_is_idempotent_and_owner_only(client, owner, member):
    data = client.get("/api/notifications", headers=member["headers"]).get_json()["data"]
    assert data["unread_count"] == 1
    note_id = data["items"][0]["id"]
    assert client.patch(f"/api/notifications/{note_id}/read", headers=owner["headers"]).status_code == 403
    for _ in range(2):
        res = client.patch(f"/api/notifications/{note_id}/read", headers=member["headers"])
        assert res.status_code == 200 and res.get_json()["data"]["read"] is True
    assert client.get("/api/notifications", headers=member["headers"]).get_json()["data"]["unread_count"] == 0
    assert client.patch("/api/notifications/00000000-0000-0000-0000-000000000000/read",
                        headers=member["headers"]).status_code == 404


def test_analytics_counts(client, owner, member, api):
    api.card(owner["headers"], owner["todo"]["id"], "Second")
    client.patch(f"/api/cards/{owner['card']['id']}/position", json={"column_id": owner["done"]["id"], "order": 10},
                 headers=owner["headers"])
    client.patch(f"/api/cards/{owner['card']['id']}", json={"assignee_id": member["user"]["id"]}, headers=owner["headers"])
    client.post(f"/api/cards/{owner['card']['id']}/comments", json={"text": "hi"}, headers=member["headers"])
    res = client.get(f"/api/boards/{owner['board']['id']}/analytics", headers=owner["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert [(c["name"], c["count"]) for c in data["cards_per_column"]] == [("To do", 1), ("Done", 1)]
    assert data["completed_this_week"] == 1
    activity = {a["name"]: (a["comments"], a["cards_assigned"]) for a in data["activity_per_member"]}
    assert activity == {"Ana Novak": (0, 0), "Mia Member": (1, 1)}


def test_analytics_is_admin_only(client, owner, member, outsider):
    url = f"/api/boards/{owner['board']['id']}/analytics"
    assert client.get(url, headers=member["headers"]).status_code == 403
    assert client.get(url, headers=outsider["headers"]).status_code == 403
    assert client.get("/api/boards/00000000-0000-0000-0000-000000000000/analytics",
                      headers=owner["headers"]).status_code == 404
