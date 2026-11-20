"""Card descriptions are rich text (R40). Every description is sanitised here before it is stored.

The editor sends HTML. nh3 (the Rust `ammonia` sanitiser) keeps only the formatting tags the toolbar
can produce, drops every attribute except a link's href, only allows http, https and mailto links,
and forces safe `rel` and `target` values on links. Scripts, event handlers, styles and iframes never
reach the database, so the frontend can render the stored HTML.

Plain text (older cards, or API clients such as Postman) is escaped and turned into paragraphs, one
per line. A plain-text copy (`description_text`) is stored alongside for search and previews.
"""
import html
import re

import nh3

ALLOWED_TAGS = {"p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre", "blockquote",
                "ul", "ol", "li", "h2", "h3", "a", "hr"}
ALLOWED_ATTRIBUTES = {"a": {"href"}}
URL_SCHEMES = {"http", "https", "mailto"}
MAX_TEXT_LENGTH = 5000

_LOOKS_LIKE_HTML = re.compile(r"<[a-zA-Z/!?]")
_BLOCK_END = re.compile(r"</(?:p|li|h2|h3|blockquote|pre)>|<br\s*/?>|<hr\s*/?>", re.IGNORECASE)


def _plain_to_html(text: str) -> str:
    return "".join(f"<p>{html.escape(line, quote=False)}</p>" for line in text.splitlines() if line.strip())


def _sanitise(markup: str) -> str:
    return nh3.clean(
        markup,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes=URL_SCHEMES,
        link_rel="noopener noreferrer nofollow",
        set_tag_attribute_values={"a": {"target": "_blank"}},
        strip_comments=True,
    ).strip()


def html_to_text(markup: str) -> str:
    """Plain text of sanitised HTML: one line per block, entities decoded."""
    stripped = nh3.clean(_BLOCK_END.sub("\n", markup), tags=set(), attributes={})
    lines = (line.strip() for line in html.unescape(stripped).splitlines())
    return "\n".join(line for line in lines if line)


def clean_description(raw: str | None) -> tuple[str | None, str | None]:
    """Return (safe_html, plain_text) for a submitted description; (None, None) when it is empty."""
    if raw is None:
        return None, None
    if _LOOKS_LIKE_HTML.search(raw):
        safe = _sanitise(raw)
        text = html_to_text(safe)
        if not _LOOKS_LIKE_HTML.search(safe):   # only bare text survived: store it as paragraphs too
            safe = _sanitise(_plain_to_html(text))
    else:
        text = raw.strip()
        safe = _sanitise(_plain_to_html(raw))
    if not text:
        return None, None
    return safe, text
