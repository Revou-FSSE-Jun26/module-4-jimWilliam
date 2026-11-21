"""Board purpose, colour, notes, links and photos (R47, R48).

Feature: revotask, Properties 50-51 (design "Correctness Properties").
"""
from hypothesis import given
from hypothesis import strategies as st

from tests.test_media import image_bytes, upload


def test_create_board_with_purpose_and_colour(client, api):
    _, headers, _ = api.user()
    res = client.post("/api/boards", json={"name": "Launch", "purpose": "  Ship v2 by 12 Dec  ", "color_hue": 200}, headers=headers)
    assert res.status_code == 201
    data = res.get_json()["data"]
    assert (data["purpose"], data["color_hue"]) == ("Ship v2 by 12 Dec", 200)
    listed = client.get("/api/boards", headers=headers).get_json()["data"][0]
    assert (listed["purpose"], listed["color_hue"]) == ("Ship v2 by 12 Dec", 200)
    plain = api.board(headers, "Plain")
    assert plain["purpose"] is None and plain["color_hue"] is None


def test_settings_update_any_subset_and_clear(client, owner):
    url = f"/api/boards/{owner['board']['id']}"
    res = client.patch(url, json={"purpose": "Hit 1k users", "color_hue": 20}, headers=owner["headers"])
    assert res.status_code == 200
    assert res.get_json()["data"]["name"] == owner["board"]["name"]
    assert res.get_json()["data"]["purpose"] == "Hit 1k users"
    cleared = client.patch(url, json={"purpose": "", "color_hue": None}, headers=owner["headers"]).get_json()["data"]
    assert cleared["purpose"] is None and cleared["color_hue"] is None
    assert client.patch(url, json={}, headers=owner["headers"]).status_code == 400
    assert client.patch(url, json={"color_hue": 360}, headers=owner["headers"]).status_code == 400
    assert client.patch(url, json={"color_hue": "12"}, headers=owner["headers"]).status_code == 400
    assert client.patch(url, json={"purpose": "x" * 281}, headers=owner["headers"]).status_code == 400


def test_only_admins_change_settings(client, owner, member):
    url = f"/api/boards/{owner['board']['id']}"
    assert client.patch(url, json={"purpose": "mine"}, headers=member["headers"]).status_code == 403


def test_members_edit_sanitised_notes_shown_in_board_detail(client, owner, member, outsider):
    url = f"/api/boards/{owner['board']['id']}/notes"
    html = '<h2>Kick-off</h2><p onclick="x()">Agreed <strong>scope</strong></p><script>alert(1)</script>'
    res = client.patch(url, json={"notes": html}, headers=member["headers"])
    assert res.status_code == 200
    notes = res.get_json()["data"]["notes"]
    assert "<script" not in notes and "onclick" not in notes and "<strong>scope</strong>" in notes
    detail = client.get(f"/api/boards/{owner['board']['id']}", headers=owner["headers"]).get_json()["data"]
    assert detail["notes"] == notes
    assert client.patch(url, json={"notes": None}, headers=owner["headers"]).get_json()["data"]["notes"] is None
    assert client.patch(url, json={"notes": "x"}, headers=outsider["headers"]).status_code == 403
    assert client.patch(url, json={}, headers=owner["headers"]).status_code == 400


def test_links_lifecycle_and_permissions(client, owner, member, outsider):
    url = f"/api/boards/{owner['board']['id']}/links"
    res = client.post(url, json={"url": "https://meet.example.com/rec/42", "title": "Kick-off recording"}, headers=member["headers"])
    assert res.status_code == 201, res.get_json()
    link = res.get_json()["data"]
    assert link["title"] == "Kick-off recording" and link["created_by"]["id"] == member["user"]["id"]
    untitled = client.post(url, json={"url": "https://docs.example.com/notes"}, headers=owner["headers"]).get_json()["data"]
    assert untitled["title"] == "docs.example.com"
    assert [l["id"] for l in client.get(url, headers=owner["headers"]).get_json()["data"]] == [link["id"], untitled["id"]]
    assert client.get(url, headers=outsider["headers"]).status_code == 403
    assert client.delete(f"/api/boards/links/{untitled['id']}", headers=member["headers"]).status_code == 403
    assert client.delete(f"/api/boards/links/{link['id']}", headers=member["headers"]).status_code == 200
    assert client.delete(f"/api/boards/links/{untitled['id']}", headers=owner["headers"]).status_code == 200
    assert client.delete(f"/api/boards/links/{untitled['id']}", headers=owner["headers"]).status_code == 404


def test_board_photos_are_avif_and_removable(client, owner, member):
    url = f"/api/boards/{owner['board']['id']}/photos"
    res = upload(client, url, member["headers"], image_bytes("JPEG", size=(1200, 800)), "whiteboard.jpg")
    assert res.status_code == 201, res.get_json()
    photo = res.get_json()["data"]
    assert photo["board_id"] == owner["board"]["id"] and photo["card_id"] is None
    assert photo["filename"] == "whiteboard.avif"
    assert client.get(photo["url"]).headers["Content-Type"] == "image/avif"
    assert [p["id"] for p in client.get(url, headers=owner["headers"]).get_json()["data"]] == [photo["id"]]
    assert client.delete(f"/api/attachments/{photo['id']}", headers=owner["headers"]).status_code == 200   # admin
    assert client.get(url, headers=owner["headers"]).get_json()["data"] == []


def test_deleting_a_board_removes_its_links_and_photos(client, app, owner):
    from app.extensions import db
    from app.models import BoardLink, Media
    board_id = owner["board"]["id"]
    client.post(f"/api/boards/{board_id}/links", json={"url": "https://example.com"}, headers=owner["headers"])
    upload(client, f"/api/boards/{board_id}/photos", owner["headers"], image_bytes(size=(20, 20)))
    assert client.delete(f"/api/boards/{board_id}", headers=owner["headers"]).status_code == 200
    db.session.expire_all()
    assert db.session.query(BoardLink).count() == 0
    assert db.session.query(Media).filter_by(kind="board").count() == 0


SCHEMES = st.sampled_from(["http", "https", "HTTPS", "javascript", "data", "file", "ftp", "mailto", "vbscript", ""])
HOSTS = st.sampled_from(["example.com", "meet.example.com:8443", "", "localhost"])
PATHS = st.text(st.characters(min_codepoint=33, max_codepoint=126), max_size=20)


# Feature: revotask, Property 50: Board links are web links only
@given(scheme=SCHEMES, host=HOSTS, path=PATHS, space=st.booleans())
def test_property_50_board_links_are_web_links_only(client, owner, scheme, host, path, space):
    url = f"{scheme}://{host}/{path}" if scheme else f"{host}/{path}"
    if space:
        url = url.replace("/", "/ ", 1)
    res = client.post(f"/api/boards/{owner['board']['id']}/links", json={"url": url}, headers=owner["headers"])
    ok = scheme.lower() in ("http", "https") and host != "" and not space
    if ok and res.status_code == 400 and "at most" in res.get_json()["error"]:
        return   # the per-board limit across examples, not a validation failure
    assert res.status_code == (201 if ok else 400), (url, res.get_json())


# Feature: revotask, Property 51: Board colour is a hue or nothing
@given(hue=st.one_of(st.none(), st.integers(min_value=-400, max_value=800)))
def test_property_51_board_colour_is_a_hue_or_nothing(client, owner, hue):
    res = client.patch(f"/api/boards/{owner['board']['id']}", json={"color_hue": hue}, headers=owner["headers"])
    if hue is None or 0 <= hue <= 359:
        assert res.status_code == 200 and res.get_json()["data"]["color_hue"] == hue
    else:
        assert res.status_code == 400


# ----- due dates (R51) --------------------------------------------------------------------------

def test_card_and_board_due_dates(client, owner):
    card_url = f"/api/cards/{owner['card']['id']}"
    res = client.patch(card_url, json={"due_date": "2026-12-12"}, headers=owner["headers"])
    assert res.status_code == 200 and res.get_json()["data"]["due_date"] == "2026-12-12"
    board = client.get(f"/api/boards/{owner['board']['id']}", headers=owner["headers"]).get_json()["data"]
    assert board["columns"][0]["cards"][0]["due_date"] == "2026-12-12"
    assert client.patch(card_url, json={"due_date": None}, headers=owner["headers"]).get_json()["data"]["due_date"] is None
    for bad in ("12/12/2026", "2026-02-30", "tomorrow", 20261212):
        assert client.patch(card_url, json={"due_date": bad}, headers=owner["headers"]).status_code == 400
    created = client.post(f"/api/columns/{owner['todo']['id']}/cards", json={"title": "x", "due_date": "2027-01-05"}, headers=owner["headers"])
    assert created.get_json()["data"]["due_date"] == "2027-01-05"
    board_url = f"/api/boards/{owner['board']['id']}"
    assert client.patch(board_url, json={"due_date": "2026-12-31"}, headers=owner["headers"]).get_json()["data"]["due_date"] == "2026-12-31"
    listed = client.get("/api/boards", headers=owner["headers"]).get_json()["data"][0]
    assert listed["due_date"] == "2026-12-31"


# Feature: revotask, Property 53: Due dates round trip as calendar dates
@given(day=st.dates(), board=st.booleans())
def test_property_53_due_dates_round_trip(client, owner, day, board):
    url = f"/api/boards/{owner['board']['id']}" if board else f"/api/cards/{owner['card']['id']}"
    res = client.patch(url, json={"due_date": day.isoformat()}, headers=owner["headers"])
    assert res.status_code == 200 and res.get_json()["data"]["due_date"] == day.isoformat()
