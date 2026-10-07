from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, verify_password
from app.domain.users.models import User
from app.domain.users.schemas import UserCreate
from app.domain.users.services import create_user, get_user_by_email


async def authenticate(db: AsyncSession, email: str, password: str) -> tuple[User, str]:
    """
    Valida credenciais e retorna (user, token).
    Lança UnauthorizedError em qualquer falha — sem revelar se o e-mail existe.
    """
    user = await get_user_by_email(db, email)

    if not user or not user.is_active or not verify_password(password, user.password_hash):
        raise UnauthorizedError("Credenciais inválidas.")

    token = create_access_token(subject=str(user.id), role=user.role)
    return user, token


async def register_user(db: AsyncSession, name: str, email: str, password: str) -> User:
    """
    Cria um novo usuário via fluxo de registro.
    Delega para create_user — conflito de e-mail lança ConflictError automaticamente.
    """
    data = UserCreate(name=name, email=email, password=password, role="servidor")
    return await create_user(db, data)