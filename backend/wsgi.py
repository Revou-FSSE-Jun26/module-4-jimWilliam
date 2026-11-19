"""Entry point for Gunicorn (`gunicorn wsgi:app`) and the Flask CLI (`flask --app wsgi ...`)."""
from app import create_app

app = create_app()
