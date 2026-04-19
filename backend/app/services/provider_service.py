"""
CostLens – Provider Polling Service
Fetches usage / billing data from each supported provider's API.
Each provider returns normalized UsageLogCreate records.
"""

from datetime import date, datetime, timezone
from typing import List, Optional
import json
import httpx

from app.schemas import UsageLogCreate
from app.core.config import settings


class ProviderPoller:
    """Base class for provider-specific usage polling."""

    async def poll(self, api_key: str, since: date) -> List[UsageLogCreate]:
        raise NotImplementedError


class OpenAIPoller(ProviderPoller):
    """
    Polls OpenAI /v1/usage endpoint for token consumption and costs.
    Requires an organization-level API key with usage:read scope.
    """

    BASE_URL = "https://api.openai.com/v1"

    async def poll(self, api_key: str, since: date) -> List[UsageLogCreate]:
        records = []
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            # Poll usage data (simplified – real implementation paginates)
            try:
                response = await client.get(
                    f"{self.BASE_URL}/usage",
                    headers=headers,
                    params={"date": since.isoformat()},
                )
                if response.status_code == 200:
                    data = response.json()
                    for bucket in data.get("data", []):
                        records.append(UsageLogCreate(
                            provider="openai",
                            endpoint=f"/v1/{bucket.get('snapshot_id', 'unknown')}",
                            feature_tag=bucket.get("snapshot_id", "untagged"),
                            request_count=bucket.get("n_requests", 0),
                            tokens_used=(
                                bucket.get("n_context_tokens_total", 0)
                                + bucket.get("n_generated_tokens_total", 0)
                            ),
                            cost=_estimate_openai_cost(bucket),
                        ))
            except httpx.RequestError:
                pass  # log and retry via scheduler

        return records


class AWSPoller(ProviderPoller):
    """
    Polls AWS Cost Explorer for service-level cost breakdowns.
    Requires ce:GetCostAndUsage permission.
    """

    async def poll(self, api_key: str, since: date) -> List[UsageLogCreate]:
        records = []

        try:
            import boto3

            client = boto3.client(
                "ce",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )

            response = client.get_cost_and_usage(
                TimePeriod={
                    "Start": since.isoformat(),
                    "End": date.today().isoformat(),
                },
                Granularity="DAILY",
                Metrics=["UnblendedCost", "UsageQuantity"],
                GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
            )

            for result_by_time in response.get("ResultsByTime", []):
                for group in result_by_time.get("Groups", []):
                    service_name = group["Keys"][0]
                    cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
                    usage = float(group["Metrics"]["UsageQuantity"]["Amount"])

                    records.append(UsageLogCreate(
                        provider="aws",
                        endpoint=f"/{_normalize_aws_service(service_name)}",
                        feature_tag=_normalize_aws_service(service_name),
                        request_count=int(usage),
                        cost=cost,
                    ))

        except Exception:
            pass

        return records


class StripePoller(ProviderPoller):
    """
    Polls Stripe /v1/balance_transactions for API usage costs.
    Stripe doesn't charge per API call, so we track call volume.
    """

    async def poll(self, api_key: str, since: date) -> List[UsageLogCreate]:
        records = []

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                since_ts = int(datetime.combine(since, datetime.min.time()).replace(
                    tzinfo=timezone.utc).timestamp())

                response = await client.get(
                    "https://api.stripe.com/v1/events",
                    headers={"Authorization": f"Bearer {api_key}"},
                    params={"created[gte]": since_ts, "limit": 100},
                )

                if response.status_code == 200:
                    events = response.json().get("data", [])
                    # Group by event type
                    event_counts: dict[str, int] = {}
                    for event in events:
                        etype = event.get("type", "unknown")
                        event_counts[etype] = event_counts.get(etype, 0) + 1

                    for etype, count in event_counts.items():
                        records.append(UsageLogCreate(
                            provider="stripe",
                            endpoint=f"/v1/{etype.replace('.', '/')}",
                            feature_tag=etype.split(".")[0],
                            request_count=count,
                            cost=0.0,  # Stripe doesn't charge per API call
                        ))

            except httpx.RequestError:
                pass

        return records


class TwilioPoller(ProviderPoller):
    """
    Polls Twilio usage records for messaging and voice costs.
    """

    async def poll(self, api_key: str, since: date) -> List[UsageLogCreate]:
        records = []

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.get(
                    f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}"
                    f"/Usage/Records/Daily.json",
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                    params={"StartDate": since.isoformat()},
                )

                if response.status_code == 200:
                    for record in response.json().get("usage_records", []):
                        records.append(UsageLogCreate(
                            provider="twilio",
                            endpoint=f"/{record.get('category', 'unknown')}",
                            feature_tag=record.get("category", "untagged"),
                            request_count=int(record.get("count", 0)),
                            cost=float(record.get("price", 0)),
                        ))

            except httpx.RequestError:
                pass

        return records


# ─── Helpers ──────────────────────────────────────────────────────

def _estimate_openai_cost(bucket: dict) -> float:
    """Rough cost estimate based on token counts and model pricing."""
    context_tokens = bucket.get("n_context_tokens_total", 0)
    generated_tokens = bucket.get("n_generated_tokens_total", 0)
    model = bucket.get("snapshot_id", "")

    # Simplified pricing (per 1K tokens)
    prices = {
        "gpt-4": (0.03, 0.06),
        "gpt-4-turbo": (0.01, 0.03),
        "gpt-3.5-turbo": (0.0005, 0.0015),
        "text-embedding": (0.0001, 0.0),
    }

    input_price, output_price = (0.01, 0.03)  # default
    for key, (ip, op) in prices.items():
        if key in model.lower():
            input_price, output_price = ip, op
            break

    return (context_tokens / 1000 * input_price) + (generated_tokens / 1000 * output_price)


def _normalize_aws_service(service: str) -> str:
    """Convert AWS service names to short slugs."""
    mapping = {
        "Amazon Simple Storage Service": "s3",
        "AWS Lambda": "lambda",
        "Amazon Simple Email Service": "ses",
        "Amazon DynamoDB": "dynamodb",
        "Amazon CloudFront": "cloudfront",
        "Amazon EC2": "ec2",
    }
    return mapping.get(service, service.lower().replace(" ", "-"))


# ─── Registry ────────────────────────────────────────────────────

POLLERS: dict[str, ProviderPoller] = {
    "openai": OpenAIPoller(),
    "aws": AWSPoller(),
    "stripe": StripePoller(),
    "twilio": TwilioPoller(),
}


async def poll_provider(provider: str, api_key: str, since: date) -> List[UsageLogCreate]:
    """Poll a single provider and return normalized usage records."""
    poller = POLLERS.get(provider)
    if not poller:
        return []
    return await poller.poll(api_key, since)
