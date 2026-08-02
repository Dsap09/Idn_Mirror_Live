import os
import time
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="IDN Live Mirror API",
    description="Clean, proxy backend for IDN Live JKT48 streaming",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JKT48Connect API settings
JKT48_API_KEY = os.getenv("JKT48_API_KEY", "").strip()
JKT48_BASE_URL = os.getenv("JKT48_BASE_URL", "https://api.jkt48connect.my.id/api/jkt48").rstrip("/")

# In-memory cache cache_store: { key: { "timestamp": float, "data": Any } }
cache_store: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_LIVE = 15  # seconds
CACHE_TTL_CHAT = 5   # seconds

# Sample fallback / mock data for offline testing or when API key is unconfigured
MOCK_LIVE_STREAMS = [
    {
        "name": "Freya Jayawardana",
        "img": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        "room_id": "freya-jkt48",
        "streaming_url_list": [
            {
                "label": "1080p (Original)",
                "quality": 1,
                "url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            },
            {
                "label": "720p",
                "quality": 2,
                "url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            }
        ],
        "type": "idn",
        "viewers": 3420,
        "started_at": "2026-08-02T20:30:00Z"
    },
    {
        "name": "Angelina Christy",
        "img": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        "room_id": "christy-jkt48",
        "streaming_url_list": [
            {
                "label": "1080p (Original)",
                "quality": 1,
                "url": "https://playertest.longtailvideo.com/adaptive/bipbop/gear4/prog_index.m3u8"
            }
        ],
        "type": "idn",
        "viewers": 2890,
        "started_at": "2026-08-02T21:00:00Z"
    },
    {
        "name": "Fiony Alveria",
        "img": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
        "room_id": "fiony-jkt48",
        "streaming_url_list": [
            {
                "label": "1080p (Original)",
                "quality": 1,
                "url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            }
        ],
        "type": "idn",
        "viewers": 1750,
        "started_at": "2026-08-02T21:15:00Z"
    }
]

MOCK_COMMENTS = [
    {"user": "OshiFreya", "comment": "Halo kak Freya!! Semangat livenya ✨", "avatar": "", "timestamp": "21:40"},
    {"user": "WotaSejati99", "comment": "Muka nya lucu banget malam ini wkwk", "avatar": "", "timestamp": "21:41"},
    {"user": "Rizky_JKT", "comment": "Tampilan mirror ini bersih banget euy 👍", "avatar": "", "timestamp": "21:41"},
    {"user": "NabilaFans", "comment": "Jangan lupa minum kak!", "avatar": "", "timestamp": "21:42"},
    {"user": "DimasPro", "comment": "Soundnya lumayan jernih nih", "avatar": "", "timestamp": "21:42"},
    {"user": "JKT48Lover", "comment": "Semangat terus yaa idola kami ❤️", "avatar": "", "timestamp": "21:43"},
]


def get_cached(key: str, ttl: float) -> Optional[Any]:
    entry = cache_store.get(key)
    if entry and (time.time() - entry["timestamp"] < ttl):
        return entry["data"]
    return None


def set_cached(key: str, data: Any) -> None:
    cache_store[key] = {
        "timestamp": time.time(),
        "data": data
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "api_key_configured": bool(JKT48_API_KEY),
        "timestamp": int(time.time())
    }


@app.get("/api/live")
async def get_live_streams():
    cached = get_cached("live_streams", CACHE_TTL_LIVE)
    if cached is not None:
        return {"source": "cache", "data": cached}

    if not JKT48_API_KEY:
        # Fallback to mock data if key not configured
        set_cached("live_streams", MOCK_LIVE_STREAMS)
        return {"source": "mock", "data": MOCK_LIVE_STREAMS}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{JKT48_BASE_URL}/live/idn",
                params={"apikey": JKT48_API_KEY}
            )
            if resp.status_code == 200:
                data = resp.json()
                set_cached("live_streams", data)
                return {"source": "live_api", "data": data}
            else:
                # API error, fallback to mock
                set_cached("live_streams", MOCK_LIVE_STREAMS)
                return {"source": "mock_fallback_api_error", "data": MOCK_LIVE_STREAMS}
    except Exception as e:
        # Exception during fetch, fallback to mock
        set_cached("live_streams", MOCK_LIVE_STREAMS)
        return {"source": "mock_fallback_exception", "data": MOCK_LIVE_STREAMS}


@app.get("/api/live/{room_id}")
async def get_room_detail(room_id: str):
    live_resp = await get_live_streams()
    streams = live_resp.get("data", [])
    for stream in streams:
        if str(stream.get("room_id")) == str(room_id) or stream.get("room_id") == room_id:
            return {"status": "success", "data": stream}

    # If stream not found, return first available or 404
    if streams:
        return {"status": "success", "data": streams[0]}
    raise HTTPException(status_code=404, detail="Room not found")


@app.get("/api/chat/{room_id}")
async def get_chat_comments(room_id: str):
    cache_key = f"chat_{room_id}"
    cached = get_cached(cache_key, CACHE_TTL_CHAT)
    if cached is not None:
        return {"source": "cache", "data": cached}

    if not JKT48_API_KEY:
        set_cached(cache_key, MOCK_COMMENTS)
        return {"source": "mock", "data": MOCK_COMMENTS}

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                f"{JKT48_BASE_URL}/chat/idn",
                params={"apikey": JKT48_API_KEY, "room_id": room_id}
            )
            if resp.status_code == 200:
                data = resp.json()
                set_cached(cache_key, data)
                return {"source": "live_api", "data": data}
            else:
                set_cached(cache_key, MOCK_COMMENTS)
                return {"source": "mock_fallback", "data": MOCK_COMMENTS}
    except Exception:
        set_cached(cache_key, MOCK_COMMENTS)
        return {"source": "mock_fallback", "data": MOCK_COMMENTS}
