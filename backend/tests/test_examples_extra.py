"""Example tests for structure and health (task 4.7) and notification hooks (task 10.6)."""
from pathlib import Path

import pytest

BLUEPRINTS = ["auth", "boards", "columns", "cards", "comments", "notifications", "analytics", "users"]
ROOT = Path(__file__).resolve().parent.parent / "app" / "blueprints"


@pytest.mark.parametrize("name", BLUEPRINTS)
def test_each_blueprint_has_routes_service_and_schema(name):
    folder = ROOT / name
    assert folder.is_dir(), f"app/blueprints/{name} is missing"
    for file in ("routes.py", "service.py", "schema.py"):
        assert (folder / file).is_file(), f"app/blueprints/{name}/{file} is missing"


def test_all_eight_blueprints_are_registered(app):
    assert set(BLUEPRINTS) <= set(app.blueprints)


def test_health_needs_no_token_and_uses_the_envelope(client):
    res = client.get("/api/health")
    assert res.status_code == 200 and res.get_json() == {"data": {"status": "ok"}}


def _messages(client, headers):
    return [n["message"] for n in client.get("/api/notifications?per_page=100", headers=headers).get_json()["data"]["items"]]


def test_adding_a_member_notifies_them(client, api, owner):
    _, headers, email = api.user("Newcomer")
    api.add_member(owner["headers"], owner["board"]["id"], email)
    assert _messages(client, headers) == ["You were added to Sprint 14"]


def test_assigning_a_card_notifies_the_assignee_once(client, owner, member):
    url = f"/api/cards/{owner['card']['id']}"
    client.patch(url, json={"assignee_id": member["user"]["id"]}, headers=owner["headers"])
    client.patch(url, json={"title": "Still assigned"}, headers=owner["headers"])  # no re-notify without a change
    assert _messages(client, member["headers"]).count("You were assigned Write the brief") == 1


def test_creating_an_assigned_card_notifies_the_assignee(client, api, owner, member):
    api.card(owner["headers"], owner["todo"]["id"], "Born assigned", assignee_id=member["user"]["id"])
    assert "You were assigned Born assigned" in _messages(client, member["headers"])


def test_self_assignment_and_own_comments_do_not_notify(client, owner):
    url = f"/api/cards/{owner['card']['id']}"
    client.patch(url, json={"assignee_id": owner["user"]["id"]}, headers=owner["headers"])
    client.post(f"{url}/comments", json={"text": "note to self"}, headers=owner["headers"])
    assert _messages(client, owner["headers"]) == []


def test_comment_on_assigned_card_notifies_assignee_only(client, owner, member):
    url = f"/api/cards/{owner['card']['id']}"
    client.patch(url, json={"assignee_id": member["user"]["id"]}, headers=owner["headers"])
    client.post(f"{url}/comments", json={"text": "update"}, headers=owner["headers"])
    assert "New comment on Write the brief" in _messages(client, member["headers"])
    assert "New comment on Write the brief" not in _messages(client, owner["headers"])


def test_supabase_transaction_pooler_disables_prepared_statements_and_pooling():
    from sqlalchemy.pool import NullPool

    from app.config import _database_url, engine_options

    pooled = engine_options(_database_url("postgresql://postgres.ref:pw@aws-0-x.pooler.supabase.com:6543/postgres?sslmode=require"))
    assert pooled == {"poolclass": NullPool, "connect_args": {"prepare_threshold": None}}
    direct = engine_options(_database_url("postgres://postgres.ref:pw@aws-0-x.pooler.supabase.com:5432/postgres"))
    assert direct == {"pool_pre_ping": True}
