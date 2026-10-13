import uuid

import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.domain.users.schemas import UserCreate, UserUpdate
from app.domain.users.services import (
    create_user,
    delete_user,
    get_user_by_id,
    list_users,
    update_user,
)
from tests.factories import make_user


async def test_create_user_sucesso(db_session):
    data = UserCreate(
        name="Fulano",
        email="fulano@teste.com",
        password="senha123",
        role="servidor",
        department="Ouvidoria",
    )

    user = await create_user(db_session, data)

    assert user.id is not None
    assert user.email == "fulano@teste.com"
    assert user.name == "Fulano"
    assert user.role == "servidor"
    assert user.department == "Ouvidoria"
    assert user.password_hash != "senha123"  # senha precisa estar hasheada


async def test_create_user_email_duplicado(db_session):
    await make_user(db_session, email="dup@teste.com")

    data = UserCreate(
        name="Outro",
        email="dup@teste.com",
        password="senha123",
        role="servidor",
    )

    with pytest.raises(ConflictError):
        await create_user(db_session, data)


async def test_get_user_by_id_encontrado(db_session):
    user = await make_user(db_session)

    found = await get_user_by_id(db_session, user.id)

    assert found.id == user.id
    assert found.email == user.email


async def test_get_user_by_id_nao_encontrado(db_session):
    with pytest.raises(NotFoundError):
        await get_user_by_id(db_session, uuid.uuid4())


async def test_list_users_retorna_todos_os_usuarios(db_session):
    u1 = await make_user(db_session, email="a@teste.com", name="A")
    u2 = await make_user(db_session, email="b@teste.com", name="B")
    u3 = await make_user(db_session, email="c@teste.com", name="C")

    users = await list_users(db_session)

    assert len(users) == 3
    ids = {u.id for u in users}
    assert ids == {u1.id, u2.id, u3.id}


async def test_update_user_altera_apenas_campos_enviados(db_session):
    user = await make_user(db_session, name="Antigo", role="servidor")
    original_email = user.email

    data = UserUpdate(name="Novo")
    updated = await update_user(db_session, user.id, data)

    assert updated.name == "Novo"
    assert updated.email == original_email  # não foi tocado
    assert updated.role == "servidor"        # não foi tocado


async def test_update_user_nao_encontrado(db_session):
    data = UserUpdate(name="Qualquer")
    with pytest.raises(NotFoundError):
        await update_user(db_session, uuid.uuid4(), data)


async def test_delete_user(db_session):
    user = await make_user(db_session)

    await delete_user(db_session, user.id)

    with pytest.raises(NotFoundError):
        await get_user_by_id(db_session, user.id)


async def test_delete_user_nao_encontrado(db_session):
    with pytest.raises(NotFoundError):
        await delete_user(db_session, uuid.uuid4())