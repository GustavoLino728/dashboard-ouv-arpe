import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.domain.users.models import User


async def make_user(
    db: AsyncSession,
    *,
    email: str | None = None,
    password: str = "senha123",
    role: str = "servidor",
    name: str = "Usuário Teste",
    is_active: bool = True,
    department: str | None = None,
) -> User:
    user = User(
        id=uuid.uuid4(),
        name=name,
        email=email or f"{uuid.uuid4().hex[:8]}@teste.com",
        password_hash=hash_password(password),
        role=role,
        is_active=is_active,
        department=department,
    )
    db.add(user)
    await db.flush()
    return user