"""Shared pytest fixtures: an app on an in-memory database, a client, and API helpers."""
import itertools

import pytest

from app import create_app
from app.config import TestConfig
from app.extensions import db

_counter = itertools.count()


@pytest.fixture()
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()   # tests only; real databases use migrations (DB-05)
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


class Api:
    """Small helper so tests read like the API calls they make."""

    def __init__(self, client):
        self.client = client

    def register(self, name="Ana Novak", email=None, password="password123"):
        email = email or f"user{next(_counter)}@example.com"
        res = self.client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
        assert res.status_code == 201, res.get_json()
        return res.get_json()["data"], email, password

    def login_headers(self, email, password="password123"):
        res = self.client.post("/api/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200, res.get_json()
        return {"Authorization": f"Bearer {res.get_json()['data']['token']}"}

    def user(self, name="Ana Novak"):
        """Register a user and return (user_dict, auth_headers, email)."""
        user, email, password = self.register(name=name)
        return user, self.login_headers(email, password), email

    def board(self, headers, name="Sprint 14"):
        res = self.client.post("/api/boards", json={"name": name}, headers=headers)
        assert res.status_code == 201, res.get_json()
        return res.get_json()["data"]

    def column(self, headers, board_id, name="To do"):
        res = self.client.post(f"/api/boards/{board_id}/columns", json={"name": name}, headers=headers)
        assert res.status_code == 201, res.get_json()
        return res.get_json()["data"]

    def card(self, headers, column_id, title="Write the brief", **extra):
        res = self.client.post(f"/api/columns/{column_id}/cards", json={"title": title, **extra}, headers=headers)
        assert res.status_code == 201, res.get_json()
        return res.get_json()["data"]

    def add_member(self, headers, board_id, email, role="member"):
        res = self.client.post(f"/api/boards/{board_id}/members", json={"email": email, "role": role}, headers=headers)
        assert res.status_code == 201, res.get_json()
        return res.get_json()["data"]


@pytest.fixture()
def api(client):
    return Api(client)


@pytest.fixture()
def owner(api):
    """An admin with a board, two columns and one card."""
    user, headers, email = api.user("Ana Novak")
    board = api.board(headers)
    todo = api.column(headers, board["id"], "To do")
    done = api.column(headers, board["id"], "Done")
    card = api.card(headers, todo["id"])
    return {"user": user, "headers": headers, "email": email, "board": board, "todo": todo, "done": done, "card": card}


@pytest.fixture()
def outsider(api):
    user, headers, email = api.user("Omar Outsider")
    return {"user": user, "headers": headers, "email": email}


@pytest.fixture()
def member(api, owner):
    """A second user who is a plain member of the owner's board."""
    user, headers, email = api.user("Mia Member")
    api.add_member(owner["headers"], owner["board"]["id"], email)
    return {"user": user, "headers": headers, "email": email}
