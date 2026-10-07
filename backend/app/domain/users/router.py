import uuid

from fastapi import APIRouter, status

from app.dependencies import AdminUser, CurrentUser, DBSession
from app.domain.users.schemas import UserCreate, UserOut, UserUpdate
from app.domain.users.services import (
    create_user,
    delete_user,
    get_user_by_id,
    list_users,
    update_user,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create(
    data: UserCreate,
    db: DBSession,
    _: AdminUser,
):
    return await create_user(db, data)


@router.get("", response_model=list[UserOut])
async def list_all(
    db: DBSession,
    _: AdminUser,
):
    return await list_users(db)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: CurrentUser):
    return current_user


@router.get("/{user_id}", response_model=UserOut)
async def get_one(
    user_id: uuid.UUID,
    db: DBSession,
    _: AdminUser,
):
    return await get_user_by_id(db, user_id)


@router.patch("/{user_id}", response_model=UserOut)
async def update(
    user_id: uuid.UUID,
    data: UserUpdate,
    db: DBSession,
    _: AdminUser,
):
    return await update_user(db, user_id, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    user_id: uuid.UUID,
    db: DBSession,
    _: AdminUser,
):
    await delete_user(db, user_id)