"""The response envelope (BE-04): {"data": ...} on success, {"error": "..."} on failure."""
from flask import jsonify


def ok(data, status: int = 200):
    return jsonify({"data": data}), status


def fail(message: str, status: int):
    return jsonify({"error": message}), status
