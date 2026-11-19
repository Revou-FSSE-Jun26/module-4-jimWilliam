"""Seed a local demo account with a board, so a fresh database has something to look at.

Usage (from backend/, with the virtual environment active and .env configured):
    python scripts/seed_demo.py

Test credentials for local development only (never use them on a real account):
    email:    ana.demo@revotask.test
    password: password123
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import Board, BoardMember, Card, Column, User  # noqa: E402

DEMO_EMAIL = "ana.demo@revotask.test"
DEMO_PASSWORD = "password123"


def main():
    app = create_app()
    with app.app_context():
        user = db.session.execute(select(User).where(User.email == DEMO_EMAIL)).scalar_one_or_none()
        if user is None:
            user = User(name="Ana Novak", email=DEMO_EMAIL, password_hash=generate_password_hash(DEMO_PASSWORD))
            db.session.add(user)
            db.session.flush()
        if db.session.execute(select(Board).where(Board.created_by == user.id, Board.name == "Demo board")).first():
            print("Demo data already present.")
            return
        board = Board(name="Demo board", created_by=user.id)
        db.session.add(board)
        db.session.flush()
        db.session.add(BoardMember(board_id=board.id, user_id=user.id, role="admin"))
        for i, (name, titles) in enumerate([("To do", ["Write the brief", "Book the venue"]),
                                            ("Doing", ["Design the landing page"]),
                                            ("Done", ["Pick a launch date"])]):
            column = Column(board_id=board.id, name=name, order=(i + 1) * 1024.0)
            db.session.add(column)
            db.session.flush()
            for j, title in enumerate(titles):
                db.session.add(Card(column_id=column.id, title=title, order=(j + 1) * 1024.0, assignee_id=user.id))
        db.session.commit()
        print(f"Seeded {DEMO_EMAIL} with 'Demo board'.")


if __name__ == "__main__":
    main()
