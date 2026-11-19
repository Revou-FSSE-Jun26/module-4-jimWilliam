"""Cross-route checks for the error statuses in the design route table (BE-11):
401 without a token, 403 for non-members, 403 for members on admin routes, 404 for unknown ids."""
import pytest

UNKNOWN = "00000000-0000-0000-0000-000000000000"


def _routes(o):
    b, c, card = o["board"]["id"], o["todo"]["id"], o["card"]["id"]
    return [
        ("get", f"/api/boards/{b}", None),
        ("patch", f"/api/boards/{b}", {"name": "X"}),
        ("delete", f"/api/boards/{b}", None),
        ("get", f"/api/boards/{b}/members", None),
        ("post", f"/api/boards/{b}/members", {"email": "x@example.com"}),
        ("post", f"/api/boards/{b}/columns", {"name": "X"}),
        ("patch", f"/api/boards/{b}/columns/reorder", {"columns": [{"id": c, "order": 5}]}),
        ("patch", f"/api/columns/{c}", {"name": "X"}),
        ("delete", f"/api/columns/{c}", None),
        ("post", f"/api/columns/{c}/cards", {"title": "X"}),
        ("patch", f"/api/cards/{card}", {"title": "X"}),
        ("delete", f"/api/cards/{card}", None),
        ("patch", f"/api/cards/{card}/position", {"column_id": c, "order": 5}),
        ("post", f"/api/cards/{card}/comments", {"text": "X"}),
        ("get", f"/api/cards/{card}/comments", None),
        ("get", f"/api/boards/{b}/analytics", None),
    ]


def _call(client, method, url, body, headers=None):
    return getattr(client, method)(url, json=body, headers=headers or {})


def test_every_protected_route_requires_a_token(client, owner):
    routes = _routes(owner) + [("get", "/api/boards", None), ("get", "/api/cards?assignee=me", None),
                               ("get", "/api/notifications", None), ("get", "/api/users/me", None)]
    for method, url, body in routes:
        res = _call(client, method, url, body)
        assert res.status_code == 401, (method, url)
        assert set(res.get_json()) == {"error"}


def test_non_members_get_403_everywhere_and_nothing_changes(client, owner, outsider):
    for method, url, body in _routes(owner):
        assert _call(client, method, url, body, outsider["headers"]).status_code == 403, (method, url)
    board = client.get(f"/api/boards/{owner['board']['id']}", headers=owner["headers"]).get_json()["data"]
    assert board["name"] == "Sprint 14" and len(board["columns"]) == 2
    assert board["columns"][0]["cards"][0]["title"] == "Write the brief"


ADMIN_ONLY = {("patch", "board"), ("delete", "board"), ("post", "members"), ("get", "analytics")}


def test_members_get_403_only_on_admin_routes(client, owner, member):
    for method, url, body in _routes(owner):
        kind = "members" if url.endswith("/members") else "analytics" if url.endswith("/analytics") else \
            "board" if url.rstrip("/").count("/") == 3 and "/boards/" in url else "other"
        res = _call(client, method, url, body, member["headers"])
        if (method, kind) in ADMIN_ONLY:
            assert res.status_code == 403, (method, url)
        else:
            assert res.status_code < 400, (method, url, res.get_json())
            if method == "delete":
                break   # later routes need the deleted resource


@pytest.mark.parametrize("method,url,body", [
    ("get", f"/api/boards/{UNKNOWN}", None),
    ("patch", f"/api/boards/{UNKNOWN}", {"name": "X"}),
    ("delete", f"/api/boards/{UNKNOWN}", None),
    ("post", f"/api/boards/{UNKNOWN}/columns", {"name": "X"}),
    ("patch", f"/api/columns/{UNKNOWN}", {"name": "X"}),
    ("post", f"/api/columns/{UNKNOWN}/cards", {"title": "X"}),
    ("patch", f"/api/cards/{UNKNOWN}", {"title": "X"}),
    ("delete", f"/api/cards/{UNKNOWN}", None),
    ("patch", f"/api/cards/{UNKNOWN}/position", {"column_id": UNKNOWN, "order": 1}),
    ("get", f"/api/cards/{UNKNOWN}/comments", None),
    ("patch", f"/api/comments/{UNKNOWN}", {"text": "X"}),
    ("delete", f"/api/comments/{UNKNOWN}", None),
    ("get", f"/api/boards/{UNKNOWN}/analytics", None),
    ("get", f"/api/boards/{UNKNOWN}/members", None),
    ("delete", f"/api/boards/{UNKNOWN}/members/{UNKNOWN}", None),
    ("get", "/api/boards/not-a-uuid", None),
])
def test_unknown_ids_return_404(client, owner, method, url, body):
    res = _call(client, method, url, body, owner["headers"])
    assert res.status_code == 404
    assert set(res.get_json()) == {"error"}


def test_unhandled_error_returns_500_without_stack_trace(app, client, owner, monkeypatch):
    from app.blueprints.boards import service

    def boom(*args, **kwargs):
        raise RuntimeError("secret internal detail")

    monkeypatch.setattr(service, "list_boards", boom)
    app.config["PROPAGATE_EXCEPTIONS"] = False
    res = client.get("/api/boards", headers=owner["headers"])
    assert res.status_code == 500
    assert res.get_json() == {"error": "Internal server error"}
