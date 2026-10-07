from pydantic import BaseModel, EmailStr


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    ok: bool = True
    message: str = "Login realizado com sucesso."


class RegisterOut(BaseModel):
    ok: bool = True
    message: str = "Usuário registrado com sucesso."