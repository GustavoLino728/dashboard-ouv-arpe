import uuid

import pytest
from fastapi import HTTPException

from app.core.security import decode_access_token, decode_refresh_token
from app.domain.auth.services import authenticate, refresh_session, register_user
from tests.factories import make_user


async def test_authenticate_sucesso(db_session):
    user = await make_user(db_session, email="login@teste.com", password="senha123")

    returned_user, access, refresh = await authenticate(
        db_session, "login@teste.com", "senha123"
    )

    assert returned_user.id == user.id

    access_payload = decode_access_token(access)
    assert access_payload is not None
    assert access_payload["sub"] == str(user.id)
    assert access_payload["type"] == "access"
    assert access_payload["role"] == user.role

    refresh_payload = decode_refresh_token(refresh)
    assert refresh_payload is not None
    assert refresh_payload["sub"] == str(user.id)
    assert refresh_payload["type"] == "refresh"


async def test_authenticate_email_case_insensitive(db_session):
    await make_user(db_session, email="case@teste.com", password="senha123")

    user, _, _ = await authenticate(db_session, "CASE@teste.com", "senha123")
    assert user.email == "case@teste.com"


async def test_authenticate_senha_errada(db_session):
    await make_user(db_session, email="x@teste.com", password="senha123")

    with pytest.raises(HTTPException) as exc:
        await authenticate(db_session, "x@teste.com", "errada")
    assert exc.value.status_code == 401


async def test_authenticate_usuario_inexistente(db_session):
    with pytest.raises(HTTPException) as exc:
        await authenticate(db_session, "naoexiste@teste.com", "senha123")
    assert exc.value.status_code == 401


async def test_authenticate_usuario_inativo(db_session):
    await make_user(
        db_session,
        email="inativo@teste.com",
        password="senha123",
        is_active=False,
    )

    with pytest.raises(HTTPException) as exc:
        await authenticate(db_session, "inativo@teste.com", "senha123")
    assert exc.value.status_code == 403


async def test_refresh_session_sucesso(db_session):
    user = await make_user(db_session, email="refresh@teste.com", password="senha123")
    _, _, refresh = await authenticate(db_session, user.email, "senha123")

    new_access, new_refresh = await refresh_session(db_session, refresh)

    access_payload = decode_access_token(new_access)
    refresh_payload = decode_refresh_token(new_refresh)
    assert access_payload["sub"] == str(user.id)
    assert refresh_payload["sub"] == str(user.id)


async def test_refresh_session_token_invalido(db_session):
    with pytest.raises(HTTPException) as exc:
        await refresh_session(db_session, "nao-e-um-token")
    assert exc.value.status_code == 401


async def test_refresh_session_token_de_acesso_recusado(db_session):
    """Um access token não pode ser usado para refresh."""
    user = await make_user(db_session, email="x@teste.com", password="senha123")
    _, access, _ = await authenticate(db_session, user.email, "senha123")

    with pytest.raises(HTTPException) as exc:
        await refresh_session(db_session, access)
    assert exc.value.status_code == 401


async def test_refresh_session_usuario_removido(db_session):
    user = await make_user(db_session, email="gone@teste.com", password="senha123")
    _, _, refresh = await authenticate(db_session, user.email, "senha123")

    # Remove o usuário, mas mantém o refresh token válido
    await db_session.delete(user)
    await db_session.flush()

    with pytest.raises(HTTPException) as exc:
        await refresh_session(db_session, refresh)
    assert exc.value.status_code == 401


async def test_register_user_delega_para_create_user(db_session):
    user = await register_user(
        db_session,
        name="Novo",
        email="novo@teste.com",
        password="senha123",
    )

    assert user.id is not None
    assert user.email == "novo@teste.com"
    assert user.role == "servidor"  # default do register


async def test_register_user_email_duplicado(db_session):
    from app.core.exceptions import ConflictError

    await make_user(db_session, email="dup@teste.com")

    with pytest.raises(ConflictError):
        await register_user(
            db_session,
            name="Outro",
            email="dup@teste.com",
            password="senha123",
        )