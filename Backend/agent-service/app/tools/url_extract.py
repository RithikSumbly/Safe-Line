from __future__ import annotations

import re
from urllib.parse import urlparse

URL_RE = re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)


def extract_urls(text: str, explicit_url: str | None = None) -> list[str]:
    urls = list(URL_RE.findall(text))
    if explicit_url:
        urls.insert(0, explicit_url.strip())
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def domain_from_url(url: str) -> str:
    try:
        host = urlparse(url).netloc.lower()
        return host[4:] if host.startswith("www.") else host
    except Exception:
        return ""
