#!/usr/bin/env python3
"""Meesho product media downloader - CLI"""
import sys
import re
import json
import requests
from pathlib import Path

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
}

MEDIA_RE = re.compile(
    r'https?:\\?/\\?/[\s"\'<>\\]+?\.(?:jpg|jpeg|png|webp|avif|mp4)(?:\?[^\s"\'<>\\]*)?',
    re.I,
)

def clean(u):
    return u.replace("\\/", "/").replace("\\u002F", "/").replace("\\", "")

def find_media(html):
    urls = set()
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>', html)
    if m:
        try:
            blob = json.dumps(json.loads(m.group(1)))
            for u in MEDIA_RE.findall(blob):
                urls.add(clean(u))
        except Exception:
            pass
    for u in MEDIA_RE.findall(html):
        urls.add(clean(u))
    return [u for u in urls if u.startswith("http")]

def main():
    if len(sys.argv) < 2:
        print("Usage: python meesho_downloader.py <meesho-product-url>")
        sys.exit(1)
    url = sys.argv[1]
    print("Fetching...", url)
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    media = find_media(r.text)
    print(f"Found {len(media)} media")
    out = Path("meesho_downloads")
    out.mkdir(exist_ok=True)
    for i, u in enumerate(media, 1):
        ext = "mp4" if ".mp4" in u else "jpg"
        path = out / f"media_{i}.{ext}"
        try:
            data = requests.get(u, headers=HEADERS, timeout=30).content
            path.write_bytes(data)
            print("Saved", path)
        except Exception as e:
            print("Fail", u, e)

if __name__ == "__main__":
    main()
