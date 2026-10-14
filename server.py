"""Private image bridge. Configure the provider only in the hosting environment."""
import base64
import os
import threading
import time
from collections import deque
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title='Jewelry Story Kit Image Studio')
app.add_middleware(CORSMiddleware, allow_origins=['https://forgedlogics.github.io', 'http://localhost:4173', 'http://127.0.0.1:4173'], allow_methods=['POST', 'GET'], allow_headers=['Content-Type'])
lock = threading.Lock()
recent = deque()

class ImageBrief(BaseModel):
    prompt: str = Field(min_length=20, max_length=6000)

def configured():
    return bool(os.getenv('IMAGE_API_KEY') and os.getenv('IMAGE_API_BASE_URL') and os.getenv('IMAGE_MODEL'))

@app.get('/health')
def health():
    return {'ready': configured()}

@app.post('/generate-image')
def generate(brief: ImageBrief):
    if not configured():
        raise HTTPException(503, 'Image generation has not been connected yet.')
    # Global hourly cap limits this personal demo's usage, across all visitors.
    # Run one worker; use a durable gateway limit before scaling to more instances.
    with lock:
        now = time.monotonic()
        while recent and now - recent[0] > 3600:
            recent.popleft()
        if len(recent) >= int(os.getenv('IMAGE_HOURLY_LIMIT', '10')):
            raise HTTPException(429, 'The image studio has reached its hourly limit. Try again later.')
        recent.append(now)
    base = os.environ['IMAGE_API_BASE_URL'].rstrip('/')
    if not base.startswith('https://'):
        raise HTTPException(503, 'The image provider connection needs configuration.')
    try:
        with httpx.Client(timeout=210) as client:
            response = client.post(base + '/images/generations', headers={'Authorization': 'Bearer ' + os.environ['IMAGE_API_KEY']}, json={'model': os.environ['IMAGE_MODEL'], 'prompt': brief.prompt, 'n': 1, 'size': '1024x1024'})
            response.raise_for_status()
            data = response.json()['data'][0]
            encoded = data.get('b64_json')
            if encoded:
                raw = base64.b64decode(encoded, validate=True)
                mime = 'image/png' if raw.startswith(b'\x89PNG') else 'image/jpeg' if raw.startswith(b'\xff\xd8') else 'image/webp' if raw.startswith(b'RIFF') else None
                if not mime:
                    raise ValueError('Unsupported image encoding')
                return {'image_data_url': f'data:{mime};base64,{encoded}'}
            # URL-only providers need a provider-specific, allowlisted download adapter.
            raise HTTPException(502, 'This provider needs an image response adapter. Contact the site owner.')
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(502, 'The image provider could not complete this request. Try again later.') from None
