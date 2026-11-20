"""p95 latency check for R30.1 (non-analytics endpoints under 500 ms at the 95th percentile).

Usage:
    python scripts/latency_check.py https://YOUR-API.vercel.app [requests_per_endpoint]

It registers a throwaway user, creates one board, then times GET /api/health, GET /api/boards and
GET /api/boards/<id>. Standard library only, so it runs anywhere Python does.
"""
import json
import statistics
import sys
import time
import urllib.request
import uuid


def call(base, method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    started = time.perf_counter()
    with urllib.request.urlopen(req, timeout=30) as res:
        payload = json.loads(res.read() or b"{}")
    return (time.perf_counter() - started) * 1000, payload


def p95(samples):
    return statistics.quantiles(samples, n=100)[94]


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    base = sys.argv[1].rstrip("/")
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    email = f"latency+{uuid.uuid4().hex[:10]}@revotask.test"
    call(base, "POST", "/api/auth/register", body={"name": "Latency Check", "email": email, "password": "latency-check-123"})
    _, login = call(base, "POST", "/api/auth/login", body={"email": email, "password": "latency-check-123"})
    token = login["data"]["token"]
    _, board = call(base, "POST", "/api/boards", token, {"name": "Latency board"})
    board_id = board["data"]["id"]

    failed = False
    print(f"{'endpoint':<28}{'p50 ms':>10}{'p95 ms':>10}  result")
    for label, path in [("GET /api/health", "/api/health"), ("GET /api/boards", "/api/boards"),
                        ("GET /api/boards/<id>", f"/api/boards/{board_id}")]:
        samples = [call(base, "GET", path, token)[0] for _ in range(n)]
        p50, p95_ms = statistics.median(samples), p95(samples)
        ok = p95_ms < 500
        failed |= not ok
        print(f"{label:<28}{p50:>10.1f}{p95_ms:>10.1f}  {'PASS' if ok else 'FAIL'}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
