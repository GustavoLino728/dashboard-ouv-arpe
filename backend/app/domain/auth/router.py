from fastapi import APIRouter, status

from app.config import settings
from app.dependencies import CurrentUser, DBSession
from app.domain.auth.schemas import LoginIn, RegisterIn, RegisterOut, TokenOut
from app.domain.auth.services import authenticate, register_user
from app.domain.users.schemas import UserOut

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post(
    "/login",
    response_model=TokenOut,
    summary="Autenticar usuário",
)
async def login(payload: LoginIn, db: DBSession):
    """
    Autentica com e-mail e senha.
    Retorna o token de acesso no corpo da resposta.
    """
    _, token = await authenticate(db, payload.email, payload.password)
    return TokenOut(access_token=token)


@router.post(
    "/register",
    response_model=RegisterOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar novo usuário",
)
async def register(
    payload: RegisterIn,
    db: DBSession,
):
    """
    Cria um novo usuário no sistema.
    Restrito a administradores autenticados.
    """
    await register_user(
        db,
        name=payload.name,
        email=payload.email,
        password=payload.password,
    )
    return RegisterOut()


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Encerrar sessão",
)
async def logout():
    """Encerra a sessão (o cliente deve descartar o token)."""
    pass


@router.get(
    "/me",
    response_model=UserOut,
    summary="Usuário da sessão atual",
)
async def me(current_user: CurrentUser):
    """Retorna os dados do usuário autenticado."""
    return current_user