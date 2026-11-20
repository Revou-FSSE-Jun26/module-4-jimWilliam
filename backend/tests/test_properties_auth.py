"""Property tests for auth, users and cross-route behaviour.

Feature: revotask, Properties 1, 2, 3, 4, 5, 6, 8, 24, 25 (design "Correctness Properties").
"""
import uuid
from datetime import timedelta

from flask_jwt_extended import create_access_token
from hypothesis import given
from hypothesis import strategies as st
from werkzeug.security import check_password_hash

from app.extensions import db
from app.models import User
from tests.strategies import emails, names, passwords, unique_email


def _register(client, name, email, password):
    return client.post("/api/auth/register", json={"name": name, "email": email, "password": password})


# Feature: revotask, Property 1: Register then login round trip
@given(name=names, email=emails, password=passwords)
def test_property_1_register_then_login_round_trip(client, name, email, password):
    res = _register(client, name, email, password)
    assert res.status_code == 201
    user = res.get_json()["data"]
    assert "password" not in user and "password_hash" not in user
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    token = login.get_json()["data"]["token"]
    me = client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"}).get_json()["data"]
    assert me["id"] == user["id"] and me["name"] == name.strip()


# Feature: revotask, Property 2: Duplicate email is rejected
@given(email=emails, upper=st.booleans())
def test_property_2_duplicate_email_is_rejected(app, client, api, email, upper):
    assert _register(client, "First", email, "password123").status_code == 201
    variant = email.upper() if upper else email
    before = db.session.query(User).count()
    assert _register(client, "Second", variant, "password123").status_code == 409
    _, headers, _ = api.user("Other")
    assert client.patch("/api/users/me", json={"email": variant}, headers=headers).status_code == 409
    assert db.session.query(User).count() == before + 1  # only "Other" was added


INVALID_REGISTER = st.one_of(
    st.just({}),
    st.fixed_dictionaries({"name": st.just(""), "email": emails, "password": passwords}),
    st.fixed_dictionaries({"name": names, "email": st.text(max_size=20).filter(lambda s: "@" not in s), "password": passwords}),
    st.fixed_dictionaries({"name": names, "email": emails, "password": st.text(max_size=7)}),
    st.fixed_dictionaries({"name": st.integers(), "email": emails, "password": passwords}),
    st.lists(st.integers(), max_size=3),
)


# Feature: revotask, Property 3: Invalid payloads are rejected with 400
@given(payload=INVALID_REGISTER, board_payload=st.one_of(st.just({}), st.just({"name": "   "}), st.fixed_dictionaries({"name": st.integers()})),
       page=st.sampled_from(["page=0", "per_page=0", "page=-3", "page=x", "per_page=101"]),
       search=st.text(" \t", min_size=1, max_size=4))
def test_property_3_invalid_payloads_are_rejected(client, api, payload, board_payload, page, search):
    users = db.session.query(User).count()
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 400 and set(res.get_json()) == {"error"}
    assert db.session.query(User).count() == users
    _, headers, _ = api.user()
    res = client.post("/api/boards", json=board_payload, headers=headers)
    assert res.status_code == 400
    assert client.get("/api/boards", headers=headers).get_json()["data"] == []
    assert client.get(f"/api/notifications?{page}", headers=headers).status_code == 400
    assert client.get("/api/cards", query_string={"search": search}, headers=headers).status_code == 400


# Feature: revotask, Property 4: Wrong credentials are rejected
@given(email=emails, password=passwords, known=st.booleans())
def test_property_4_wrong_credentials_are_rejected(client, email, password, known):
    if known:
        _register(client, "Known", email, password + "x")  # same email, different password
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 401
    assert res.get_json() == {"error": "Invalid email or password"}


# Feature: revotask, Property 5: Passwords are salted hashes
@given(password=passwords)
def test_property_5_passwords_are_salted_hashes(client, password):
    a, b = unique_email(), unique_email()
    _register(client, "A", a, password)
    _register(client, "B", b, password)
    ha = db.session.query(User).filter_by(email=a).one().password_hash
    hb = db.session.query(User).filter_by(email=b).one().password_hash
    assert ha != password and hb != password
    assert ha != hb
    assert check_password_hash(ha, password)


PROTECTED = [("get", "/api/boards"), ("post", "/api/boards"), ("get", "/api/users/me"), ("patch", "/api/users/me"),
             ("get", "/api/notifications"), ("get", "/api/cards?assignee=me"),
             ("get", "/api/boards/{u}"), ("patch", "/api/columns/{u}"), ("post", "/api/columns/{u}/cards"),
             ("patch", "/api/cards/{u}/position"), ("post", "/api/cards/{u}/comments"), ("delete", "/api/comments/{u}"),
             ("get", "/api/boards/{u}/analytics"), ("post", "/api/boards/{u}/members")]


# Feature: revotask, Property 6: Protected routes require a valid JWT
@given(route=st.sampled_from(PROTECTED), kind=st.sampled_from(["missing", "garbage", "tampered", "expired", "wrong-scheme"]),
       garbage=st.text(st.characters(min_codepoint=33, max_codepoint=126), min_size=1, max_size=40))
def test_property_6_protected_routes_require_a_valid_jwt(app, client, api, route, kind, garbage):
    method, path = route
    path = path.format(u=uuid.uuid4())
    user, headers, _ = api.user()
    token = headers["Authorization"].split(" ", 1)[1]
    if kind == "missing":
        hdrs = {}
    elif kind == "garbage":
        hdrs = {"Authorization": f"Bearer {garbage}"}
    elif kind == "tampered":
        hdrs = {"Authorization": f"Bearer {token[:-2]}{'AA' if not token.endswith('AA') else 'BB'}"}
    elif kind == "expired":
        hdrs = {"Authorization": f"Bearer {create_access_token(identity=user['id'], expires_delta=timedelta(seconds=-5))}"}
    else:
        hdrs = {"Authorization": f"Token {token}"}
    res = getattr(client, method)(path, json={}, headers=hdrs)
    assert res.status_code == 401
    assert set(res.get_json()) == {"error"}


ID_ROUTES = [("get", "/api/boards/{u}"), ("patch", "/api/boards/{u}"), ("delete", "/api/boards/{u}"),
             ("post", "/api/boards/{u}/columns"), ("patch", "/api/columns/{u}"), ("delete", "/api/columns/{u}"),
             ("post", "/api/columns/{u}/cards"), ("patch", "/api/cards/{u}"), ("delete", "/api/cards/{u}"),
             ("get", "/api/cards/{u}/comments"), ("patch", "/api/comments/{u}"), ("delete", "/api/comments/{u}"),
             ("patch", "/api/notifications/{u}/read"), ("get", "/api/boards/{u}/analytics"), ("get", "/api/boards/{u}/members")]


# Feature: revotask, Property 8: Unknown identifiers return 404
@given(route=st.sampled_from(ID_ROUTES), unknown=st.uuids())
def test_property_8_unknown_identifiers_return_404(client, owner, route, unknown):
    method, path = route
    body = {"name": "x", "title": "x", "text": "x", "column_id": str(unknown), "order": 1}
    res = getattr(client, method)(path.format(u=unknown), json=body, headers=owner["headers"])
    assert res.status_code == 404
    assert set(res.get_json()) == {"error"}


# Feature: revotask, Property 24: Profile update changes only name and email
@given(name=st.one_of(st.none(), names), email=st.one_of(st.none(), emails),
       extra=st.dictionaries(st.sampled_from(["password", "password_hash", "id", "role", "is_admin"]), st.text(max_size=20), max_size=3))
def test_property_24_profile_update_changes_only_name_and_email(client, api, name, email, extra):
    user, headers, original_email = api.user("Before Name")
    before = db.session.get(User, uuid.UUID(user["id"])).password_hash
    payload = {**extra, **({"name": name} if name is not None else {}), **({"email": email} if email is not None else {})}
    res = client.patch("/api/users/me", json=payload, headers=headers)
    if name is None and email is None:
        assert res.status_code == 400
        return
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert "password" not in data and "password_hash" not in data
    assert data["id"] == user["id"]
    assert data["name"] == (name.strip() if name is not None else "Before Name")
    assert data["email"] == (email.lower() if email is not None else original_email)
    db.session.expire_all()
    assert db.session.get(User, uuid.UUID(user["id"])).password_hash == before


ANY_ROUTE = PROTECTED + ID_ROUTES + [("get", "/api/health"), ("post", "/api/auth/login"), ("post", "/api/auth/register"),
                                     ("get", "/api/nowhere"), ("put", "/api/boards")]


# Feature: revotask, Property 25: Envelope on every response
@given(route=st.sampled_from(ANY_ROUTE), body=st.one_of(st.none(), st.dictionaries(st.text(max_size=8), st.text(max_size=8), max_size=3)),
       authed=st.booleans())
def test_property_25_envelope_on_every_response(client, owner, route, body, authed):
    method, path = route
    res = getattr(client, method)(path.format(u=uuid.uuid4()), json=body, headers=owner["headers"] if authed else {})
    payload = res.get_json()
    assert isinstance(payload, dict) and len(payload) == 1 and next(iter(payload)) in {"data", "error"}
    if res.status_code >= 500:
        assert payload == {"error": "Internal server error"}
