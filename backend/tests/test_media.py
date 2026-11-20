"""Avatars, card attachments, signed image URLs and rich-text descriptions (R40-R43).

Feature: revotask, Properties 41-44 (design "Correctness Properties").
"""
import io
import uuid

from hypothesis import given, settings
from hypothesis import strategies as st
from PIL import Image
from sqlalchemy import func, select

from app.common import media_urls
from app.common.richtext import clean_description
from app.extensions import db
from app.models import Media


def image_bytes(fmt="PNG", size=(800, 600), color=(30, 120, 110), exif=None) -> bytes:
    out = io.BytesIO()
    image = Image.new("RGBA" if fmt == "PNG" else "RGB", size, color)
    image.save(out, format=fmt, **({"exif": exif} if exif else {}))
    return out.getvalue()


def upload(client, url, headers, data: bytes, name="photo.png"):
    return client.post(url, data={"file": (io.BytesIO(data), name)}, headers=headers,
                       content_type="multipart/form-data")


def fetch(client, path):
    return client.get(path)   # signed URLs need no Authorization header


def is_avif(data: bytes) -> bool:
    return data[4:12] in (b"ftypavif", b"ftypavis")


# ----- avatars ---------------------------------------------------------------------------------

def test_avatar_upload_is_converted_to_a_square_avif(client, owner):
    res = upload(client, "/api/users/me/avatar", owner["headers"], image_bytes(size=(900, 600)))
    assert res.status_code == 200, res.get_json()
    url = res.get_json()["data"]["avatar_url"]
    assert url.startswith("/api/media/")
    image = fetch(client, url)
    assert image.status_code == 200
    assert image.headers["Content-Type"] == "image/avif"
    assert image.headers["Content-Disposition"] == "inline"
    assert is_avif(image.data)
    decoded = Image.open(io.BytesIO(image.data))
    assert decoded.size == (512, 512)
    me = client.get("/api/users/me", headers=owner["headers"]).get_json()["data"]
    assert me["avatar_url"] == url


def test_replacing_an_avatar_deletes_the_previous_one(client, owner):
    first = upload(client, "/api/users/me/avatar", owner["headers"], image_bytes()).get_json()["data"]["avatar_url"]
    second = upload(client, "/api/users/me/avatar", owner["headers"], image_bytes(color=(200, 10, 10))).get_json()["data"]["avatar_url"]
    assert first != second
    assert fetch(client, first).status_code == 404
    assert fetch(client, second).status_code == 200
    user_id = uuid.UUID(owner["user"]["id"])
    count = db.session.execute(select(func.count(Media.id)).where(Media.owner_id == user_id, Media.kind == "avatar")).scalar()
    assert count == 1


def test_removing_an_avatar(client, owner):
    url = upload(client, "/api/users/me/avatar", owner["headers"], image_bytes()).get_json()["data"]["avatar_url"]
    res = client.delete("/api/users/me/avatar", headers=owner["headers"])
    assert res.status_code == 200 and res.get_json()["data"]["avatar_url"] is None
    assert fetch(client, url).status_code == 404
    assert db.session.execute(select(func.count(Media.id))).scalar() == 0


def test_avatar_shows_on_cards_comments_and_members(client, owner):
    url = upload(client, "/api/users/me/avatar", owner["headers"], image_bytes()).get_json()["data"]["avatar_url"]
    card_url = f"/api/cards/{owner['card']['id']}"
    card = client.patch(card_url, json={"assignee_id": owner["user"]["id"]}, headers=owner["headers"]).get_json()["data"]
    assert card["assignee"]["avatar_url"] == url
    comment = client.post(f"{card_url}/comments", json={"text": "hi"}, headers=owner["headers"]).get_json()["data"]
    assert comment["author"]["avatar_url"] == url
    members = client.get(f"/api/boards/{owner['board']['id']}/members", headers=owner["headers"]).get_json()["data"]
    assert members[0]["avatar_url"] == url


def test_exif_metadata_is_stripped(client, owner):
    exif = Image.Exif()
    exif[0x010F] = "SecretCamera"          # Make
    exif[0x8825] = {2: (1.0, 2.0, 3.0)}    # GPS IFD
    res = upload(client, "/api/users/me/avatar", owner["headers"], image_bytes("JPEG", exif=exif), "p.jpg")
    data = fetch(client, res.get_json()["data"]["avatar_url"]).data
    decoded = Image.open(io.BytesIO(data))
    assert not decoded.getexif()
    assert b"SecretCamera" not in data


def test_rejects_files_that_are_not_images(client, owner):
    res = upload(client, "/api/users/me/avatar", owner["headers"], b"<svg onload=alert(1)>", "x.svg")
    assert res.status_code == 400 and "supported image" in res.get_json()["error"]
    res = client.post("/api/users/me/avatar", data={}, headers=owner["headers"], content_type="multipart/form-data")
    assert res.status_code == 400
    assert db.session.execute(select(func.count(Media.id))).scalar() == 0


def test_rejects_uploads_over_4_mb(client, owner):
    res = upload(client, "/api/users/me/avatar", owner["headers"], b"\0" * (4 * 1024 * 1024 + 1))
    assert res.status_code == 413 and res.get_json() == {"error": "The file is too large. Images can be up to 4 MB."}


def test_avatar_needs_a_token(client):
    assert client.post("/api/users/me/avatar").status_code == 401
    assert client.delete("/api/users/me/avatar").status_code == 401


# ----- signed URLs -----------------------------------------------------------------------------

def test_signed_url_rejects_tampering_and_expiry(client, owner):
    url = upload(client, "/api/users/me/avatar", owner["headers"], image_bytes()).get_json()["data"]["avatar_url"]
    path, query = url.split("?")
    params = dict(part.split("=") for part in query.split("&"))
    bad_sig = params["sig"][:-1] + ("0" if params["sig"][-1] != "0" else "1")
    assert fetch(client, f"{path}?v=full&exp={params['exp']}&sig={bad_sig}").status_code == 403
    assert fetch(client, f"{path}?v=full&exp={int(params['exp']) + 3600}&sig={params['sig']}").status_code == 403
    assert fetch(client, f"{path}?v=thumb&exp={params['exp']}&sig={params['sig']}").status_code == 403
    assert fetch(client, path).status_code == 403
    media_id = uuid.UUID(path.rsplit("/", 1)[1])
    assert media_urls.verify(media_id, "full", params["exp"], params["sig"]) > 0
    assert media_urls.verify(media_id, "full", params["exp"], params["sig"], now=int(params["exp"])) == 0


# ----- attachments -----------------------------------------------------------------------------

def test_attachment_lifecycle_and_permissions(client, api, owner):
    card_url = f"/api/cards/{owner['card']['id']}/attachments"
    member, member_headers, member_email = api.user("Member")
    api.add_member(owner["headers"], owner["board"]["id"], member_email)
    _, outsider_headers, _ = api.user("Outsider")

    res = upload(client, card_url, member_headers, image_bytes("JPEG", size=(3000, 1500)), "Board photo.JPG")
    assert res.status_code == 201, res.get_json()
    att = res.get_json()["data"]
    assert att["filename"] == "Board photo.avif" and att["content_type"] == "image/avif"
    assert (att["width"], att["height"]) == (2048, 1024)
    assert att["uploaded_by"]["id"] == member["id"]
    full, thumb = fetch(client, att["url"]), fetch(client, att["thumb_url"])
    assert full.status_code == thumb.status_code == 200
    assert is_avif(full.data) and is_avif(thumb.data) and len(thumb.data) < len(full.data)
    assert max(Image.open(io.BytesIO(thumb.data)).size) == 480

    listed = client.get(card_url, headers=owner["headers"]).get_json()["data"]
    assert [a["id"] for a in listed] == [att["id"]]
    board = client.get(f"/api/boards/{owner['board']['id']}", headers=owner["headers"]).get_json()["data"]
    assert board["columns"][0]["cards"][0]["attachment_count"] == 1

    assert client.get(card_url, headers=outsider_headers).status_code == 403
    assert upload(client, card_url, outsider_headers, image_bytes()).status_code == 403

    mine = upload(client, card_url, owner["headers"], image_bytes()).get_json()["data"]
    assert client.delete(f"/api/attachments/{mine['id']}", headers=member_headers).status_code == 403
    assert client.delete(f"/api/attachments/{att['id']}", headers=member_headers).status_code == 200   # uploader
    assert client.delete(f"/api/attachments/{mine['id']}", headers=owner["headers"]).status_code == 200  # admin
    assert client.delete(f"/api/attachments/{mine['id']}", headers=owner["headers"]).status_code == 404
    assert fetch(client, att["url"]).status_code == 404


def test_attachment_limit_and_deleted_cards(client, owner):
    card_url = f"/api/cards/{owner['card']['id']}/attachments"
    small = image_bytes(size=(16, 16))
    for _ in range(10):
        assert upload(client, card_url, owner["headers"], small).status_code == 201
    res = upload(client, card_url, owner["headers"], small)
    assert res.status_code == 400 and "at most 10" in res.get_json()["error"]
    client.delete(f"/api/cards/{owner['card']['id']}", headers=owner["headers"])
    assert client.get(card_url, headers=owner["headers"]).status_code == 404
    assert upload(client, card_url, owner["headers"], small).status_code == 404


# ----- rich-text descriptions ------------------------------------------------------------------

def test_description_is_sanitised_and_searchable_as_text(client, owner):
    dirty = ('<h2>Plan</h2><p onclick="steal()">Use <strong>bold</strong> <u>and</u> '
             '<a href="javascript:alert(1)">bad</a> <a href="https://revou.co" style="color:red">good</a></p>'
             '<script>alert(1)</script><img src=x onerror=alert(1)><iframe src="https://evil.test"></iframe>')
    res = client.patch(f"/api/cards/{owner['card']['id']}", json={"description": dirty}, headers=owner["headers"])
    assert res.status_code == 200
    html = res.get_json()["data"]["description"]
    for banned in ("script", "onclick", "onerror", "javascript:", "<img", "<iframe", "style="):
        assert banned not in html
    assert "<h2>Plan</h2>" in html and "<strong>bold</strong>" in html and "<u>and</u>" in html
    assert 'href="https://revou.co"' in html and 'rel="noopener noreferrer nofollow"' in html
    found = client.get("/api/cards", query_string={"search": "bold and"}, headers=owner["headers"]).get_json()["data"]
    assert [c["id"] for c in found] == [owner["card"]["id"]]
    assert client.get("/api/cards", query_string={"search": "strong"}, headers=owner["headers"]).get_json()["data"] == []


def test_plain_text_descriptions_become_paragraphs(client, owner):
    res = client.patch(f"/api/cards/{owner['card']['id']}", json={"description": "line 1 < 2\nline 2"}, headers=owner["headers"])
    assert res.get_json()["data"]["description"] == "<p>line 1 &lt; 2</p><p>line 2</p>"
    res = client.patch(f"/api/cards/{owner['card']['id']}", json={"description": "<p>  </p>"}, headers=owner["headers"])
    assert res.get_json()["data"]["description"] is None


def test_description_text_limit(client, owner):
    long_text = "<p>" + "a" * 5001 + "</p>"
    res = client.patch(f"/api/cards/{owner['card']['id']}", json={"description": long_text}, headers=owner["headers"])
    assert res.status_code == 400 and "5000" in res.get_json()["error"]


# ----- properties ------------------------------------------------------------------------------

TAGS = st.sampled_from(["p", "b", "u", "a", "script", "img", "iframe", "style", "svg", "h2", "li", "object"])
ATTRS = st.sampled_from(['onclick="x()"', 'href="javascript:alert(1)"', 'href="https://ok.test"',
                         'style="color:red"', 'src="x"', "onerror=alert(1)", 'href="data:text/html,x"'])
fragments = st.lists(st.one_of(
    st.builds(lambda t, a, body: f"<{t} {a}>{body}</{t}>", TAGS, ATTRS, st.text(max_size=8)),
    st.text(st.characters(min_codepoint=32, max_codepoint=126), max_size=12),
), max_size=8).map("".join)


# Feature: revotask, Property 41: Stored descriptions contain only allowed markup
@given(raw=fragments)
def test_property_41_descriptions_contain_only_allowed_markup(raw):
    safe, text = clean_description(raw)
    if safe is None:
        assert text is None
        return
    lowered = safe.lower()
    for banned in ("<script", "<img", "<iframe", "<style", "<svg", "<object", " on", "javascript:", "data:", "style=", "src="):
        assert banned not in lowered
    assert "<" not in text or "&lt;" in safe   # text never carries markup that survived as tags
    assert clean_description(safe)[0] == safe  # sanitising is idempotent


# Feature: revotask, Property 42: Signed image URLs verify only unchanged and unexpired
@given(variant=st.sampled_from(["full", "thumb"]), now=st.integers(min_value=1_700_000_000, max_value=2_000_000_000),
       position=st.integers(min_value=0, max_value=31))
def test_property_42_signed_urls_verify_only_unchanged_and_unexpired(app, variant, now, position):
    media_id = uuid.uuid4()
    url = media_urls.signed_url(media_id, variant, now=now)
    params = dict(part.split("=") for part in url.split("?")[1].split("&"))
    assert params["v"] == variant and 3600 < int(params["exp"]) - now <= 7200
    assert media_urls.verify(media_id, variant, params["exp"], params["sig"], now=now) == int(params["exp"])
    sig = params["sig"]
    flipped = sig[:position] + ("a" if sig[position] != "a" else "b") + sig[position + 1:]
    assert media_urls.verify(media_id, variant, params["exp"], flipped, now=now) == 0
    assert media_urls.verify(uuid.uuid4(), variant, params["exp"], sig, now=now) == 0
    assert media_urls.verify(media_id, variant, params["exp"], sig, now=int(params["exp"])) == 0


# Feature: revotask, Property 43: Every stored image is an AVIF within its size limit
@settings(max_examples=12)
@given(width=st.integers(min_value=1, max_value=2600), height=st.integers(min_value=1, max_value=2600),
       fmt=st.sampled_from(["PNG", "JPEG", "WEBP", "GIF"]), kind=st.sampled_from(["avatar", "attachment"]))
def test_property_43_every_stored_image_is_avif_within_limits(client, owner, width, height, fmt, kind):
    url = "/api/users/me/avatar" if kind == "avatar" else f"/api/cards/{owner['card']['id']}/attachments"
    res = upload(client, url, owner["headers"], image_bytes(fmt, size=(width, height)), f"x.{fmt.lower()}")
    if kind == "attachment" and res.status_code == 400:   # the 10-image limit across examples
        for media in db.session.execute(select(Media).where(Media.kind == "attachment")).scalars():
            db.session.delete(media)
        db.session.commit()
        res = upload(client, url, owner["headers"], image_bytes(fmt, size=(width, height)), f"x.{fmt.lower()}")
    assert res.status_code in (200, 201), res.get_json()
    data = res.get_json()["data"]
    image = fetch(client, data["avatar_url"] if kind == "avatar" else data["url"]).data
    assert is_avif(image)
    w, h = Image.open(io.BytesIO(image)).size
    if kind == "avatar":
        assert w == h == min(512, width, height)
    else:
        scale = min(1, 2048 / max(width, height))
        assert max(w, h) <= 2048 and abs(w - width * scale) <= 1 and abs(h - height * scale) <= 1


# Feature: revotask, Property 44: Only the uploader or a board admin removes an attachment
@settings(max_examples=15)
@given(uploader=st.sampled_from(["admin", "member"]), remover=st.sampled_from(["admin", "member", "other_member", "outsider"]))
def test_property_44_only_uploader_or_admin_removes_attachment(client, api, uploader, remover):
    _, admin_h, _ = api.user("Admin")
    board = api.board(admin_h)
    card = api.card(admin_h, api.column(admin_h, board["id"])["id"])
    people = {"admin": admin_h}
    for name in ("member", "other_member"):
        _, h, email = api.user(name)
        api.add_member(admin_h, board["id"], email)
        people[name] = h
    people["outsider"] = api.user("Outsider")[1]
    att = upload(client, f"/api/cards/{card['id']}/attachments", people[uploader], image_bytes(size=(8, 8))).get_json()["data"]
    res = client.delete(f"/api/attachments/{att['id']}", headers=people[remover])
    allowed = remover == "admin" or remover == uploader
    assert res.status_code == (200 if allowed else 403)
