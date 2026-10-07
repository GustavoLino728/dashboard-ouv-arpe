import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.database.base import Base
from app.database.session import engine, get_db
from app.domain.users.models import User


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    import os
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")

    async for session in get_db():
        result = await session.execute(
            select(User).filter(User.email == admin_email)
        )
        if result.scalars().first():
            print(f"⚠️  Usuário admin '{admin_email}' já existe. Nenhuma ação tomada.")
            return

        admin = User(
            name="Administrador",
            email=admin_email,
            password_hash=hash_password(admin_password),
            role="admin",
            department="CTI",
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        print("✅ Usuário admin criado.")
        print(f"   Email : {admin_email}")
        print(f"   Senha : {admin_password}")
        print("   ⚠️  Troque a senha após o primeiro login!")


if __name__ == "__main__":
    asyncio.run(main())