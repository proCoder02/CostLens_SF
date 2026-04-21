"""
CostLens – Auth Routes
POST /register  – create a new user
POST /login     – authenticate and get JWT
GET  /me        – get current user profile
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User
from app.schemas import UserCreate, UserOut, TokenResponse
from app.services.user_service import (
    create_user, authenticate_user, generate_token, get_user_by_email,
)
from app.services.admin_service import get_saas_config
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    # ── SaaSConfig checks ─────────────────────────────────────────
    config = await get_saas_config(db)

    if not config.registration_enabled:
        raise HTTPException(
            status_code=403,
            detail="New registrations are currently disabled. Please contact support.",
        )

    if config.allowed_email_domains:
        allowed = [d.strip().lower() for d in config.allowed_email_domains.split(",") if d.strip()]
        if allowed:
            domain = payload.email.split("@")[-1].lower()
            if domain not in allowed:
                raise HTTPException(
                    status_code=403,
                    detail=f"Registrations are restricted to approved email domains.",
                )

    # ── Duplicate check ───────────────────────────────────────────
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = await create_user(db, payload)
    token = generate_token(user)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = generate_token(user)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
