"""
CostLens – Pydantic Schemas
Request / response models for the API layer.
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ═══════════════════════════════════════════════════════════════════
# Auth
# ═══════════════════════════════════════════════════════════════════

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    plan: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ═══════════════════════════════════════════════════════════════════
# API Connection
# ═══════════════════════════════════════════════════════════════════

class APIConnectionCreate(BaseModel):
    provider: str = Field(..., pattern="^(openai|aws|stripe|twilio|custom)$")
    display_name: str = ""
    api_key: str = Field(..., min_length=1)


class APIConnectionOut(BaseModel):
    id: UUID
    provider: str
    display_name: str
    is_active: bool
    last_synced_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class APIConnectionToggle(BaseModel):
    is_active: bool


# ═══════════════════════════════════════════════════════════════════
# Usage Logging (ingest)
# ═══════════════════════════════════════════════════════════════════

class UsageLogCreate(BaseModel):
    provider: str
    endpoint: str
    method: str = "POST"
    feature_tag: str = "untagged"
    request_count: int = 1
    tokens_used: int = 0
    cost: float = 0.0
    latency_ms: int = 0
    status_code: int = 200
    metadata_json: str = "{}"


class UsageLogOut(BaseModel):
    id: UUID
    provider: str
    endpoint: str
    feature_tag: str
    request_count: int
    tokens_used: int
    cost: float
    latency_ms: int
    status_code: int
    recorded_at: datetime

    class Config:
        from_attributes = True


class UsageBatchCreate(BaseModel):
    """Ingest multiple usage records at once."""
    records: List[UsageLogCreate]


# ═══════════════════════════════════════════════════════════════════
# Dashboard
# ═══════════════════════════════════════════════════════════════════

class ProviderSummary(BaseModel):
    provider: str
    total_cost: float
    total_requests: int
    avg_latency_ms: float
    change_pct: float  # vs previous period


class DailyCostPoint(BaseModel):
    date: date
    label: str
    costs: Dict[str, float]  # provider -> cost
    total: float


class DashboardSummary(BaseModel):
    today_cost: float
    yesterday_cost: float
    daily_change_pct: float
    mtd_cost: float
    monthly_budget: float
    budget_usage_pct: float
    active_connections: int
    total_connections: int
    potential_savings: float
    providers: List[ProviderSummary]
    daily_costs: List[DailyCostPoint]


# ═══════════════════════════════════════════════════════════════════
# Endpoints Breakdown
# ═══════════════════════════════════════════════════════════════════

class EndpointBreakdown(BaseModel):
    endpoint: str
    provider: str
    feature_tag: str
    total_requests: int
    total_cost: float
    avg_latency_ms: float
    prev_period_cost: float
    change_pct: float


# ═══════════════════════════════════════════════════════════════════
# Alerts
# ═══════════════════════════════════════════════════════════════════

class AlertOut(BaseModel):
    id: UUID
    alert_type: str
    severity: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AlertMarkRead(BaseModel):
    alert_ids: List[UUID]


# ═══════════════════════════════════════════════════════════════════
# Insights
# ═══════════════════════════════════════════════════════════════════

class Insight(BaseModel):
    icon: str
    title: str
    detail: str
    action: str
    estimated_savings: str
    priority: int  # 1 = highest


# ═══════════════════════════════════════════════════════════════════
# Settings
# ═══════════════════════════════════════════════════════════════════

class BudgetCreate(BaseModel):
    provider: str = "*"
    monthly_limit: float = Field(gt=0)


class BudgetOut(BaseModel):
    id: UUID
    provider: str
    monthly_limit: float

    class Config:
        from_attributes = True


class AlertSettingUpdate(BaseModel):
    spike_threshold_pct: Optional[float] = None
    budget_warning_pct: Optional[float] = None
    anomaly_detection: Optional[bool] = None
    weekly_digest: Optional[bool] = None
    digest_day: Optional[str] = None
    digest_hour: Optional[int] = None
    notification_email: Optional[bool] = None
    notification_slack_webhook: Optional[str] = None


class AlertSettingOut(BaseModel):
    spike_threshold_pct: float
    budget_warning_pct: float
    anomaly_detection: bool
    weekly_digest: bool
    digest_day: str
    digest_hour: int
    notification_email: bool
    notification_slack_webhook: str

    class Config:
        from_attributes = True
