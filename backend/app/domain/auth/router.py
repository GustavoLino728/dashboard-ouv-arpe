from fastapi import APIRouter, status

from app.dependencies import CurrentUser, DBSession
from app.domain.auth.schemas import (
    LoginIn,
    RefreshIn,
    RegisterIn,
    RegisterOut,
    TokenOut,
)
from app.domain.auth.services import authenticate, refresh_session, register_user
from app.domain.users.schemas import UserOut

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post("/login", response_model=TokenOut, summary="Autenticar usuário")
async def login(payload: LoginIn, db: DBSession):
    _, access_token, refresh_token = await authenticate(db, payload.email, payload.password)
    return TokenOut(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenOut, summary="Renovar tokens")
async def refresh(payload: RefreshIn, db: DBSession):
    access_token, refresh_token = await refresh_session(db, payload.refresh_token)
    return TokenOut(access_token=access_token, refresh_token=refresh_token)


@router.post("/register", response_model=RegisterOut, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterIn, db: DBSession):
    await register_user(db, name=payload.name, email=payload.email, password=payload.password)
    return RegisterOut()


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    pass


@router.get("/me", response_model=UserOut, summary="Usuário da sessão atual")
async def me(current_user: CurrentUser):
    return current_user