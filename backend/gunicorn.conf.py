"""Gunicorn settings for production (R27.1): `gunicorn wsgi:app --config gunicorn.conf.py`.

Render routes traffic to the port in $PORT. Threaded workers suit this API: most of a request is
spent waiting on PostgreSQL, while image uploads spend a moment in Pillow (which releases the GIL).
Every value can be overridden with an environment variable, so no code change is needed to tune it.
"""
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
worker_class = "gthread"
threads = int(os.environ.get("GUNICORN_THREADS", "4"))

# Encoding a large photo to AVIF can take a few seconds on a small instance.
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "60"))
graceful_timeout = 30
keepalive = 5

# Restart workers now and then, so a slow leak can never grow without limit.
max_requests = 1000
max_requests_jitter = 100

# Render's proxy terminates TLS and sets X-Forwarded-*.
forwarded_allow_ips = "*"

accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
