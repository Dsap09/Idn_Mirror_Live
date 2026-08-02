import httpx
import re
import json

url = "https://www.idn.app/idnlinks/live-room-175ikv"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

try:
    resp = httpx.get(url, headers=headers, follow_redirects=True, timeout=10.0)
    print("STATUS CODE:", resp.status_code)
    print("FINAL URL:", resp.url)

    m3u8_links = re.findall(r'https?://[^\s"\'<>]+?\.m3u8[^\s"\'<>]*', resp.text)
    print("FOUND M3U8 LINKS:", m3u8_links)

    # Search for NEXT_DATA
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
    if match:
        data = json.loads(match.group(1))
        print("NEXT DATA KEYS:", data.keys())
        props = data.get("props", {}).get("pageProps", {})
        print("PAGE PROPS KEYS:", props.keys())
        # Inspect live data
        print("PROPS DUMP SNIPPET:", str(props)[:1000])
    else:
        print("NO __NEXT_DATA__ FOUND IN HTML")
except Exception as e:
    print("EXCEPTION:", e)
