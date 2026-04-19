"""
CostLens – Integration Example
Shows how to integrate the CostLens SDK into your existing FastAPI application.

This file is NOT part of the CostLens server — it demonstrates what
your application code would look like after adding CostLens tracking.
"""

from fastapi import FastAPI
import openai
import httpx

# ── 1. Import the SDK ─────────────────────────────────────────────
from costlens_sdk import CostLensTracker, CostLensMiddleware


app = FastAPI(title="My Startup App")

# ── 2. Initialize the tracker ────────────────────────────────────
tracker = CostLensTracker(
    api_key="cl_your_costlens_api_key_here",
    costlens_url="http://localhost:8000",  # or https://api.costlens.io
    batch_size=20,                          # flush every 20 records
    flush_interval_seconds=30,              # or every 30 seconds
)

# ── 3. (Optional) Add ASGI middleware for inbound request tracking
app.add_middleware(
    CostLensMiddleware,
    api_key="cl_your_costlens_api_key_here",
    costlens_url="http://localhost:8000",
    tracked_paths=["/api/"],
)


# ═══════════════════════════════════════════════════════════════════
# Example: Tracking OpenAI calls with the context manager
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/chat")
async def chat_endpoint(message: str):
    """
    The `tracker.track()` context manager automatically:
    - Measures latency
    - Records success/failure
    - Batches and sends to CostLens
    """
    client = openai.OpenAI()

    with tracker.track(
        provider="openai",
        endpoint="/v1/chat/completions",
        feature_tag="ai-chat",        # group costs by feature
    ):
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": message}],
        )

    # After the context manager exits, CostLens has the latency + status
    # To also track cost and tokens, log manually:
    usage = response.usage
    tracker.log(
        provider="openai",
        endpoint="/v1/chat/completions",
        feature_tag="ai-chat",
        tokens_used=usage.total_tokens,
        cost=(usage.prompt_tokens * 0.03 + usage.completion_tokens * 0.06) / 1000,
    )

    return {"reply": response.choices[0].message.content}


# ═══════════════════════════════════════════════════════════════════
# Example: Tracking AWS S3 uploads
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/upload")
async def upload_file(filename: str):
    with tracker.track(
        provider="aws",
        endpoint="/s3/put-object",
        feature_tag="file-upload",
    ):
        # Your S3 upload logic here
        pass

    return {"uploaded": filename}


# ═══════════════════════════════════════════════════════════════════
# Example: Tracking Twilio SMS
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/notify")
async def send_notification(phone: str, message: str):
    tracker.log(
        provider="twilio",
        endpoint="/messages",
        feature_tag="sms-alerts",
        request_count=1,
        cost=0.0079,  # Twilio SMS rate
    )

    # Your Twilio send logic here
    return {"sent": True}


# ═══════════════════════════════════════════════════════════════════
# Example: Using the webhook approach instead of SDK
# ═══════════════════════════════════════════════════════════════════
"""
Alternative: Instead of the SDK, configure your API gateway (Kong, AWS API
Gateway, Cloudflare Workers) to forward request metadata to CostLens:

    POST http://localhost:8000/api/v1/usage/webhook/openai
    Authorization: Bearer <your-costlens-token>
    Content-Type: application/json

    {
        "endpoint": "/v1/chat/completions",
        "feature_tag": "ai-chat",
        "tokens_used": 1523,
        "cost": 0.042,
        "latency_ms": 890,
        "status_code": 200
    }
"""


# ── Shutdown hook ─────────────────────────────────────────────────
@app.on_event("shutdown")
def shutdown():
    tracker.shutdown()  # Flush any remaining buffered records
