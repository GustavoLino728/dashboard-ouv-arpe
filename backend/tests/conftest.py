from typing import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config import settings
from app.database.base import Base
from app.database.session import get_db


@pytest.fixture(scope="session")
def database_url() -> str:
    url = settings.test_database_url
    if not url:
        raise RuntimeError("TEST_DATABASE_URL não configurada no .env.")
    if "arpe_test" not in url:
        raise RuntimeError(f"TEST_DATABASE_URL suspeita: {url}")
    return url


@pytest_asyncio.fixture(scope="session")
async def engine(database_url: str):
    eng = create_async_engine(database_url, echo=False, future=True, poolclass=NullPool)

    async with eng.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.run_sync(Base.metadata.create_all)

    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncIterator[AsyncSession]:
    """
    Sessão isolada por teste. `join_transaction_mode="create_savepoint"`
    faz os `commit()` dos services virarem `RELEASE SAVEPOINT`, mantendo
    a transação externa viva para o rollback final.
    """
    connection = await engine.connect()
    transaction = await connection.begin()

    SessionLocal = async_sessionmaker(
        bind=connection,
        expire_on_commit=False,
        class_=AsyncSession,
        join_transaction_mode="create_savepoint",
    )
    session = SessionLocal()

    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()
        await connection.close()