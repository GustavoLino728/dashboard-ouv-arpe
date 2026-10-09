from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select

from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, verify_password, create_refresh_token,decode_refresh_token, hash_password

from app.domain.users.models import User
from app.domain.users.schemas import UserCreate
from app.domain.users.services import create_user, get_user_by_email


async def authenticate(
    db: AsyncSession, email: str, password: str
) -> tuple[User, str, str]:
    """Autentica e retorna (user, access_token, refresh_token)."""
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo.",
        )

    subject = str(user.id)
    access = create_access_token(subject, user.role)
    refresh = create_refresh_token(subject, user.role)
    return user, access, refresh


async def refresh_session(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
    """Valida o refresh token e emite um novo par."""
    payload = decode_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado.",
        )

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido.",
        )

    try:
        user_id = UUID(subject)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido.",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou inativo.",
        )

    subject_str = str(user.id)
    return (
        create_access_token(subject_str, user.role),
        create_refresh_token(subject_str, user.role),
    )


async def register_user(db: AsyncSession, name: str, email: str, password: str) -> User:
    """
    Cria um novo usuário via fluxo de registro.
    Delega para create_user — conflito de e-mail lança ConflictError automaticamente.
    """
    data = UserCreate(name=name, email=email, password=password, role="servidor")
    return await create_user(db, data)