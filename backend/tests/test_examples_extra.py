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


def test_engine_options_for_render_and_serverless_hosts():
    from sqlalchemy.pool import NullPool

    from app.config import _database_url, engine_options

    pooled = engine_options(_database_url("postgresql://postgres.ref:pw@aws-0-x.pooler.supabase.com:6543/postgres?sslmode=require"))
    assert pooled == {"poolclass": NullPool, "connect_args": {"prepare_threshold": None}}
    # Render: a long-running Gunicorn server keeps a small, checked, recycled pool (session pooler).
    session = engine_options(_database_url("postgres://postgres.ref:pw@aws-0-x.pooler.supabase.com:5432/postgres"))
    assert session == {"pool_pre_ping": True, "pool_size": 3, "max_overflow": 2, "pool_recycle": 300, "pool_timeout": 10}
    assert engine_options("sqlite:///revotask.sqlite3") == {"pool_pre_ping": True}


def test_gunicorn_config_binds_render_port(monkeypatch):
    import importlib.util
    from pathlib import Path

    monkeypatch.setenv("PORT", "12345")
    monkeypatch.setenv("WEB_CONCURRENCY", "3")
    spec = importlib.util.spec_from_file_location("gunicorn_conf", Path(__file__).resolve().parents[1] / "gunicorn.conf.py")
    conf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(conf)
    assert conf.bind == "0.0.0.0:12345" and conf.workers == 3
    assert conf.worker_class == "gthread" and conf.timeout >= 30


def test_untouched_env_example_values_fail_fast():
    from app import create_app
    from app.config import TestConfig

    class PlaceholderConfig(TestConfig):
        SQLALCHEMY_DATABASE_URI = "postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE"

    with pytest.raises(RuntimeError, match="example values"):
        create_app(PlaceholderConfig)


# Feature: revotask, Property 48: Board progress counts the last column
def test_board_list_reports_done_count_from_the_last_column(client, api):
    _, headers, _ = api.user()
    board = api.board(headers, "Progress")
    listed = lambda: next(b for b in client.get("/api/boards", headers=headers).get_json()["data"] if b["id"] == board["id"])
    assert listed()["done_count"] is None                     # no columns yet
    todo = api.column(headers, board["id"], "To do")
    api.card(headers, todo["id"], "a")
    assert listed()["done_count"] is None                     # one column: no "done" stage
    done = api.column(headers, board["id"], "Done")
    api.card(headers, done["id"], "b")
    moved = api.card(headers, todo["id"], "c")
    client.patch(f"/api/cards/{moved['id']}/position", json={"column_id": done["id"], "order": 5000}, headers=headers)
    deleted = api.card(headers, done["id"], "gone")
    client.delete(f"/api/cards/{deleted['id']}", headers=headers)
    data = listed()
    assert (data["card_count"], data["done_count"]) == (3, 2)


def test_order_values_must_be_json_numbers(client, owner):
    """Found by Property 13: numeric strings, booleans and NaN were accepted as order values."""
    url = f"/api/cards/{owner['card']['id']}/position"
    for bad in ("1", True, None, "NaN"):
        res = client.patch(url, json={"column_id": owner["done"]["id"], "order": bad}, headers=owner["headers"])
        assert res.status_code == 400, bad
    assert client.patch(url, json={"column_id": owner["done"]["id"], "order": 1}, headers=owner["headers"]).status_code == 200
    reorder = f"/api/boards/{owner['board']['id']}/columns/reorder"
    assert client.patch(reorder, json={"columns": [{"id": owner["todo"]["id"], "order": "5"}]}, headers=owner["headers"]).status_code == 400
    assert client.patch(reorder, data='{"columns": [{"id": "%s", "order": NaN}]}' % owner["todo"]["id"],
                        content_type="application/json", headers=owner["headers"]).status_code == 400


def test_missing_settings_explain_how_to_fix_them_on_render(monkeypatch):
    import pytest

    from app import create_app
    from app.config import TestConfig

    class NoSecret(TestConfig):
        JWT_SECRET_KEY = ""

    with pytest.raises(RuntimeError, match="On Render: open the service > Environment"):
        create_app(NoSecret)

    class Deployed(TestConfig):
        TESTING = False

    monkeypatch.setenv("RENDER", "true")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL is not set on Render"):
        create_app(Deployed)
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@h:5432/d")
    create_app(Deployed)   # configured: starts normally


def test_frontend_origin_with_trailing_slash_still_allows_cors(monkeypatch):
    import importlib

    import app.config as config

    monkeypatch.setenv("FRONTEND_ORIGIN", "https://jwrevotask.vercel.app/, http://localhost:3000")
    reloaded = importlib.reload(config)
    try:
        assert reloaded.Config.FRONTEND_ORIGINS == ["https://jwrevotask.vercel.app", "http://localhost:3000"]
    finally:
        monkeypatch.delenv("FRONTEND_ORIGIN")
        importlib.reload(config)
