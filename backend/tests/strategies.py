"""Hypothesis strategies shared by the property tests."""
import uuid

from hypothesis import strategies as st

# Printable ASCII keeps the reference models comparable with SQLite's ASCII-only lower().
PRINTABLE = st.characters(min_codepoint=32, max_codepoint=126)

names = st.text(PRINTABLE, min_size=1, max_size=40).filter(lambda s: s.strip() != "")
passwords = st.text(PRINTABLE, min_size=8, max_size=40)
# The database is shared across examples and Hypothesis replays values, so every email gets a
# fresh random suffix at generation time to stay unique.
emails = st.builds(lambda local: f"{local}.{uuid.uuid4().hex[:12]}@example.com",
                   st.text(st.sampled_from("abcdefghijklmnopqrstuvwxyz0123456789"), min_size=1, max_size=12))
positive_floats = st.floats(min_value=0.001, max_value=1e9, allow_nan=False, allow_infinity=False)


def unique_email() -> str:
    return f"user.{uuid.uuid4().hex[:16]}@example.com"
