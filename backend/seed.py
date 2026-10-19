import asyncio
import logging
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.domain.users.models import User

logger = logging.getLogger("ouvidoria-arpe.seed")


async def seed_admin(session: AsyncSession) -> bool:
    """
    Garante que existe um usuário admin, criando-o se ADMIN_EMAIL e
    ADMIN_PASSWORD estiverem definidos e o usuário ainda não existir.

    Idempotente: pode ser chamada em todo startup da API sem duplicar.
    Retorna True se criou, False se já existia ou se as envs estão ausentes.
    """
    admin_email = os.getenv("ADMIN_EMAIL", "").strip()
    admin_password = os.getenv("ADMIN_PASSWORD", "")

    if not admin_email or not admin_password:
        logger.info("Seed ignorado: ADMIN_EMAIL e/ou ADMIN_PASSWORD não configurados.")
        return False

    result = await session.execute(
        select(User).filter(User.email == admin_email.lower())
    )
    if result.scalars().first():
        logger.info("Seed ignorado: usuário admin '%s' já existe.", admin_email)
        return False

    admin = User(
        name="Administrador",
        email=admin_email.lower(),
        password_hash=hash_password(admin_password),
        role="admin",
        department="CTI",
        is_active=True,
    )
    session.add(admin)
    await session.flush()
    logger.info("Usuário admin '%s' criado com sucesso.", admin_email)
    return True


async def _run_standalone() -> None:
    """Executa o seed em uma sessão própria (para `python seed.py`)."""
    from app.database.base import Base
    from app.database.session import async_session_maker, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as session:
        created = await seed_admin(session)
        await session.commit()

    if created:
        print("✅ Usuário admin criado.")
        print(f"   Email : {os.getenv('ADMIN_EMAIL')}")
        print("   ⚠️  Troque a senha após o primeiro login!")
    else:
        print("ℹ️  Nenhuma ação tomada (seed já aplicado ou envs ausentes).")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    asyncio.run(_run_standalone())