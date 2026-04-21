"""
CostLens - SQLAlchemy Models
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Date,
    ForeignKey, Text, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


def utcnow():
    return datetime.now(timezone.utc)

def new_uuid():
    return uuid.uuid4()


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="")
    company_name = Column(String(255), default="")
    plan = Column(String(50), default="free")
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    stripe_customer_id = Column(String(255), nullable=True)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    onboarded = Column(Boolean, default=False)
    notes = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    api_connections = relationship("APIConnection", back_populates="user", cascade="all, delete-orphan")
    usage_logs = relationship("UsageLog", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    alert_settings = relationship("AlertSetting", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")


class APIConnection(Base):
    __tablename__ = "api_connections"
    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)
    display_name = Column(String(100), default="")
    api_key_encrypted = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    user = relationship("User", back_populates="api_connections")
    usage_logs = relationship("UsageLog", back_populates="connection", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_user_provider"),)


class UsageLog(Base):
    __tablename__ = "usage_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("api_connections.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False, index=True)
    endpoint = Column(String(500), nullable=False)
    method = Column(String(10), default="POST")
    feature_tag = Column(String(100), default="untagged")
    request_count = Column(Integer, default=1)
    tokens_used = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    latency_ms = Column(Integer, default=0)
    status_code = Column(Integer, default=200)
    metadata_json = Column(Text, default="{}")
    recorded_at = Column(DateTime(timezone=True), default=utcnow)
    user = relationship("User", back_populates="usage_logs")
    connection = relationship("APIConnection", back_populates="usage_logs")
    __table_args__ = (
        Index("ix_usage_user_date", "user_id", "recorded_at"),
        Index("ix_usage_provider_endpoint", "provider", "endpoint"),
    )


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


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), default="info")
    title = Column(String(255), default="")
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    user = relationship("User", back_populates="alerts")
    __table_args__ = (Index("ix_alert_user_unread", "user_id", "is_read"),)


class Budget(Base):
    __tablename__ = "budgets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), default="*")
    monthly_limit = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    user = relationship("User", back_populates="budgets")
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_budget_provider"),)


class AlertSetting(Base):
    __tablename__ = "alert_settings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    spike_threshold_pct = Column(Float, default=40.0)
    budget_warning_pct = Column(Float, default=80.0)
    anomaly_detection = Column(Boolean, default=True)
    weekly_digest = Column(Boolean, default=True)
    digest_day = Column(String(10), default="monday")
    digest_hour = Column(Integer, default=9)
    notification_email = Column(Boolean, default=True)
    notification_slack_webhook = Column(String(500), default="")
    user = relationship("User", back_populates="alert_settings")


class Payment(Base):
    __tablename__ = "payments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stripe_payment_id = Column(String(255), default="")
    stripe_invoice_id = Column(String(255), default="")
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="usd")
    status = Column(String(50), default="pending")
    plan = Column(String(50), default="free")
    description = Column(Text, default="")
    payment_method = Column(String(50), default="card")
    card_last4 = Column(String(4), default="")
    card_brand = Column(String(20), default="")
    receipt_url = Column(String(500), default="")
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    user = relationship("User", back_populates="payments")
    __table_args__ = (
        Index("ix_payment_user", "user_id"),
        Index("ix_payment_status", "status"),
        Index("ix_payment_date", "created_at"),
    )


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    stripe_subscription_id = Column(String(255), default="")
    plan = Column(String(50), default="free")
    status = Column(String(50), default="active")
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    user = relationship("User", back_populates="subscription")


class SaaSConfig(Base):
    """Singleton settings table. Admin configures onboarding, plans, features."""
    __tablename__ = "saas_config"
    id = Column(Integer, primary_key=True, default=1)
    app_name = Column(String(100), default="CostLens")
    support_email = Column(String(255), default="support@costlens.io")
    support_url = Column(String(500), default="")
    logo_url = Column(String(500), default="")
    welcome_email_enabled = Column(Boolean, default=True)
    welcome_email_subject = Column(String(255), default="Welcome to CostLens!")
    welcome_email_body = Column(Text, default="Thanks for signing up! Get started by connecting your first API.")
    require_email_verification = Column(Boolean, default=False)
    default_plan = Column(String(50), default="free")
    trial_days = Column(Integer, default=0)
    trial_plan = Column(String(50), default="startup")
    registration_enabled = Column(Boolean, default=True)
    allowed_email_domains = Column(Text, default="")
    max_users = Column(Integer, default=0)
    free_max_connections = Column(Integer, default=1)
    free_history_days = Column(Integer, default=7)
    free_alerts_enabled = Column(Boolean, default=False)
    free_insights_enabled = Column(Boolean, default=False)
    free_max_team_seats = Column(Integer, default=1)
    startup_max_connections = Column(Integer, default=10)
    startup_history_days = Column(Integer, default=90)
    startup_alerts_enabled = Column(Boolean, default=True)
    startup_insights_enabled = Column(Boolean, default=True)
    startup_max_team_seats = Column(Integer, default=3)
    business_max_connections = Column(Integer, default=50)
    business_history_days = Column(Integer, default=365)
    business_alerts_enabled = Column(Boolean, default=True)
    business_insights_enabled = Column(Boolean, default=True)
    business_max_team_seats = Column(Integer, default=0)
    startup_price = Column(Float, default=29.0)
    business_price = Column(Float, default=99.0)
    stripe_startup_price_id = Column(String(255), default="")
    stripe_business_price_id = Column(String(255), default="")
    maintenance_mode = Column(Boolean, default=False)
    maintenance_message = Column(Text, default="We are currently undergoing maintenance. Please check back soon.")
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class AuditLog(Base):
    """Tracks admin actions."""
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50), default="")
    target_id = Column(String(255), default="")
    details = Column(Text, default="{}")
    ip_address = Column(String(50), default="")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (
        Index("ix_audit_admin", "admin_id"),
        Index("ix_audit_date", "created_at"),
    )
