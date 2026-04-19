"""
CostLens SDK – Drop-in middleware for automatic API usage tracking.

Install in your app to automatically capture and report API costs to CostLens.

Usage with FastAPI:
    from costlens_sdk import CostLensMiddleware

    app = FastAPI()
    app.add_middleware(
        CostLensMiddleware,
        api_key="your-costlens-api-key",
        costlens_url="https://api.costlens.io",
        tracked_hosts=["api.openai.com", "api.stripe.com"],
    )

Usage as a standalone wrapper:
    from costlens_sdk import CostLensTracker

    tracker = CostLensTracker(api_key="your-key")

    # Wrap any httpx/requests call
    with tracker.track("openai", "/v1/chat/completions", feature_tag="ai-chat"):
        response = openai.chat.completions.create(...)

    # Or manually log
    tracker.log(
        provider="openai",
        endpoint="/v1/chat/completions",
        cost=0.042,
        tokens_used=1523,
        latency_ms=890,
    )
"""

import time
import threading
import logging
from typing import Optional, List
from dataclasses import dataclass, field, asdict
from contextlib import contextmanager

import httpx

logger = logging.getLogger("costlens-sdk")


@dataclass
class UsageRecord:
    provider: str
    endpoint: str
    method: str = "POST"
    feature_tag: str = "untagged"
    request_count: int = 1
    tokens_used: int = 0
    cost: float = 0.0
    latency_ms: int = 0
    status_code: int = 200


class CostLensTracker:
    """
    Standalone tracker that batches usage records and sends them to CostLens.
    """

    def __init__(
        self,
        api_key: str,
        costlens_url: str = "https://api.costlens.io",
        batch_size: int = 50,
        flush_interval_seconds: int = 60,
    ):
        self.api_key = api_key
        self.costlens_url = costlens_url.rstrip("/")
        self.batch_size = batch_size
        self.flush_interval = flush_interval_seconds

        self._buffer: List[dict] = []
        self._lock = threading.Lock()
        self._client = httpx.Client(timeout=10)

        # Start background flush thread
        self._flush_thread = threading.Thread(target=self._periodic_flush, daemon=True)
        self._flush_thread.start()

    @contextmanager
    def track(
        self,
        provider: str,
        endpoint: str,
        feature_tag: str = "untagged",
        tokens_used: int = 0,
        cost: float = 0.0,
    ):
        """
        Context manager that tracks timing and logs the call on exit.

        Usage:
            with tracker.track("openai", "/v1/chat/completions"):
                response = client.post(...)
        """
        start = time.monotonic()
        status = 200
        try:
            yield
        except Exception as e:
            status = 500
            raise
        finally:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            self.log(
                provider=provider,
                endpoint=endpoint,
                feature_tag=feature_tag,
                tokens_used=tokens_used,
                cost=cost,
                latency_ms=elapsed_ms,
                status_code=status,
            )

    def log(
        self,
        provider: str,
        endpoint: str,
        method: str = "POST",
        feature_tag: str = "untagged",
        request_count: int = 1,
        tokens_used: int = 0,
        cost: float = 0.0,
        latency_ms: int = 0,
        status_code: int = 200,
    ):
        """Add a usage record to the buffer."""
        record = UsageRecord(
            provider=provider,
            endpoint=endpoint,
            method=method,
            feature_tag=feature_tag,
            request_count=request_count,
            tokens_used=tokens_used,
            cost=cost,
            latency_ms=latency_ms,
            status_code=status_code,
        )

        with self._lock:
            self._buffer.append(asdict(record))
            if len(self._buffer) >= self.batch_size:
                self._flush()

    def _flush(self):
        """Send buffered records to CostLens API."""
        if not self._buffer:
            return

        records = self._buffer.copy()
        self._buffer.clear()

        try:
            response = self._client.post(
                f"{self.costlens_url}/api/v1/usage/ingest",
                json={"records": records},
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            if response.status_code != 201:
                logger.warning(f"CostLens ingest failed: {response.status_code}")
            else:
                logger.debug(f"Flushed {len(records)} records to CostLens")
        except Exception as e:
            logger.error(f"CostLens flush error: {e}")
            # Re-add records to buffer on failure
            with self._lock:
                self._buffer = records + self._buffer

    def _periodic_flush(self):
        """Background thread that flushes buffer periodically."""
        while True:
            time.sleep(self.flush_interval)
            with self._lock:
                self._flush()

    def shutdown(self):
        """Flush remaining records on shutdown."""
        with self._lock:
            self._flush()
        self._client.close()


class CostLensMiddleware:
    """
    ASGI middleware for FastAPI/Starlette that intercepts outgoing requests.

    Note: This tracks inbound request patterns. For outgoing API call tracking,
    use CostLensTracker or monkey-patch httpx/requests.
    """

    def __init__(
        self,
        app,
        api_key: str,
        costlens_url: str = "https://api.costlens.io",
        tracked_paths: Optional[List[str]] = None,
        feature_tag_header: str = "X-CostLens-Feature",
    ):
        self.app = app
        self.tracker = CostLensTracker(api_key=api_key, costlens_url=costlens_url)
        self.tracked_paths = tracked_paths  # None = track all
        self.feature_tag_header = feature_tag_header

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        # Skip if path not tracked
        if self.tracked_paths and not any(path.startswith(p) for p in self.tracked_paths):
            await self.app(scope, receive, send)
            return

        start = time.monotonic()
        status_code = 200

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            elapsed = int((time.monotonic() - start) * 1000)

            # Extract feature tag from request headers
            headers = dict(scope.get("headers", []))
            feature_tag = headers.get(
                self.feature_tag_header.lower().encode(),
                b"untagged",
            ).decode()

            self.tracker.log(
                provider="self",
                endpoint=path,
                method=scope.get("method", "GET"),
                feature_tag=feature_tag,
                latency_ms=elapsed,
                status_code=status_code,
            )
