"""
CostLens – SQLAlchemy Models
All database tables for users, providers, usage logs, alerts, and budgets.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Date,
    ForeignKey, Text, Enum, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return uuid.uuid4()


# ═══════════════════════════════════════════════════════════════════
# User & Team
# ═══════════════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="")
    plan = Column(String(50), default="free")  # free | startup | business
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # relationships
    api_connections = relationship("APIConnection", back_populates="user", cascade="all, delete-orphan")
    usage_logs = relationship("UsageLog", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    alert_settings = relationship("AlertSetting", back_populates="user", cascade="all, delete-orphan")


# ═══════════════════════════════════════════════════════════════════
# API Connection (provider credentials)
# ═══════════════════════════════════════════════════════════════════

class APIConnection(Base):
    __tablename__ = "api_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)          # openai | aws | stripe | twilio | custom
    display_name = Column(String(100), default="")
    api_key_encrypted = Column(Text, default="")           # encrypted at rest
    is_active = Column(Boolean, default=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="api_connections")
    usage_logs = relationship("UsageLog", back_populates="connection", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_provider"),
    )


# ═══════════════════════════════════════════════════════════════════
# Usage Log (one row per API call or aggregated batch)
# ═══════════════════════════════════════════════════════════════════

class UsageLog(Base):
    __tablename__ = "usage_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("api_connections.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False, index=True)
    endpoint = Column(String(500), nullable=False)
    method = Column(String(10), default="POST")
    feature_tag = Column(String(100), default="untagged")  # user-defined grouping
    request_count = Column(Integer, default=1)
    tokens_used = Column(Integer, default=0)                # for LLM providers
    cost = Column(Float, default=0.0)
    latency_ms = Column(Integer, default=0)
    status_code = Column(Integer, default=200)
    metadata_json = Column(Text, default="{}")              # extra provider-specific data
    recorded_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="usage_logs")
    connection = relationship("APIConnection", back_populates="usage_logs")

    __table_args__ = (
        Index("ix_usage_user_date", "user_id", "recorded_at"),
        Index("ix_usage_provider_endpoint", "provider", "endpoint"),
    )


# ═══════════════════════════════════════════════════════════════════
# Daily Cost Aggregate (materialized for fast dashboard queries)
# ═══════════════════════════════════════════════════════════════════

class DailyCost(Base):
    __tablename__ = "daily_costs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)
    endpoint = Column(String(500), default="*")
    feature_tag = Column(String(100), default="all")
    date = Column(Date, nullable=False)
    total_requests = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)
    avg_latency_ms = Column(Float, default=0.0)

    __table_args__ = (
        UniqueConstraint("user_id", "provider", "endpoint", "feature_tag", "date", name="uq_daily_agg"),
        Index("ix_daily_user_date", "user_id", "date"),
    )


# ═══════════════════════════════════════════════════════════════════
# Alert
# ═══════════════════════════════════════════════════════════════════

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String(50), nullable=False)        # spike | budget | anomaly | optimization
    severity = Column(String(20), default="info")          # critical | warning | info | success
    title = Column(String(255), default="")
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="alerts")

    __table_args__ = (
        Index("ix_alert_user_unread", "user_id", "is_read"),
    )


# ═══════════════════════════════════════════════════════════════════
# Budget
# ═══════════════════════════════════════════════════════════════════

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), default="*")             # * = total across all
    monthly_limit = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="budgets")

    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_budget_provider"),
    )


# ═══════════════════════════════════════════════════════════════════
# Alert Settings
# ═══════════════════════════════════════════════════════════════════

class AlertSetting(Base):
    __tablename__ = "alert_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    spike_threshold_pct = Column(Float, default=40.0)      # alert when daily spend > X% above average
    budget_warning_pct = Column(Float, default=80.0)       # alert at X% of monthly budget
    anomaly_detection = Column(Boolean, default=True)
    weekly_digest = Column(Boolean, default=True)
    digest_day = Column(String(10), default="monday")
    digest_hour = Column(Integer, default=9)
    notification_email = Column(Boolean, default=True)
    notification_slack_webhook = Column(String(500), default="")

    user = relationship("User", back_populates="alert_settings")
