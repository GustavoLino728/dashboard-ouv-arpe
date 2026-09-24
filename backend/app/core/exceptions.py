from fastapi import status


class AppException(Exception):
    """Excecao base de dominio."""

    def __init__(self, message: str, code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.code = code
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, message: str = "Recurso nao encontrado"):
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class ConflictError(AppException):
    def __init__(self, message: str = "Conflito com recurso existente"):
        super().__init__(message, status.HTTP_409_CONFLICT)
