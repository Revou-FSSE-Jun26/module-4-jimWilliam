"""Auth (B1, B2), users (B24, B25) and health (B26)."""
from werkzeug.security import check_password_hash

from app.extensions import db
from app.models import User


def test_health_returns_ok_without_token(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json() == {"data": {"status": "ok"}}


def test_register_returns_201_without_password(client):
    res = client.post("/api/auth/register", json={"name": "Ana", "email": "Ana@Example.com", "password": "password123"})
    assert res.status_code == 201
    data = res.get_json()["data"]
    assert data["email"] == "ana@example.com"
    assert "password" not in data and "password_hash" not in data


def test_register_duplicate_email_returns_409(client, api):
    _, email, _ = api.register()
    res = client.post("/api/auth/register", json={"name": "Copy", "email": email, "password": "password123"})
    assert res.status_code == 409


def test_register_invalid_payload_returns_400(client):
    res = client.post("/api/auth/register", json={"name": "", "email": "not-an-email", "password": "short"})
    assert res.status_code == 400
    error = res.get_json()["error"]
    assert "email" in error and "password" in error and "name" in error


def test_register_non_json_body_returns_400(client):
    res = client.post("/api/auth/register", data="hello", content_type="text/plain")
    assert res.status_code == 400


def test_passwords_are_salted_hashes(app, api):
    _, email_a, _ = api.register(password="same-password")
    _, email_b, _ = api.register(password="same-password")
    a = db.session.execute(db.select(User).filter_by(email=email_a)).scalar_one()
    b = db.session.execute(db.select(User).filter_by(email=email_b)).scalar_one()
    assert a.password_hash != "same-password"
    assert a.password_hash != b.password_hash
    assert check_password_hash(a.password_hash, "same-password")


def test_login_returns_token_expiry_and_user(client, api):
    user, email, password = api.register()
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["token"] and data["expires_at"].endswith("Z")
    assert data["user"]["id"] == user["id"]


def test_login_wrong_password_and_unknown_email_give_same_401(client, api):
    _, email, _ = api.register()
    wrong = client.post("/api/auth/login", json={"email": email, "password": "wrong-password"})
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "password123"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.get_json() == unknown.get_json()


def test_protected_route_with_bad_token_returns_401(client):
    res = client.get("/api/users/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert res.status_code == 401
    assert "error" in res.get_json()


def test_me_returns_profile_without_password(client, api):
    user, headers, _ = api.user()
    res = client.get("/api/users/me", headers=headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["id"] == user["id"]
    assert "password_hash" not in res.get_json()["data"]


def test_update_me_ignores_password_field(client, api):
    _, headers, email = api.user()
    res = client.patch("/api/users/me", json={"name": "New Name", "password": "hacked-password"}, headers=headers)
    assert res.status_code == 200 and res.get_json()["data"]["name"] == "New Name"
    assert client.post("/api/auth/login", json={"email": email, "password": "password123"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": email, "password": "hacked-password"}).status_code == 401


def test_update_me_with_taken_email_returns_409(client, api):
    _, headers, _ = api.user()
    _, _, other_email = api.user("Other")
    res = client.patch("/api/users/me", json={"email": other_email}, headers=headers)
    assert res.status_code == 409


def test_unknown_route_keeps_envelope(client):
    res = client.get("/api/does-not-exist")
    assert res.status_code == 404 and res.get_json() == {"error": "Not found"}
