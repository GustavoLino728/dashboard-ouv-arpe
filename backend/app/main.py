import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.exceptions import AppException
from app.core.middleware import logging_middleware, register_middlewares
from app.domain.ouvidoria.router import router as ouvidoria_router

logging.basicConfig(
    level=logging.DEBUG if settings.app_debug else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

TAGS_METADATA = [
    {"name": "Ouvidoria", "description": "Dashboard analitico de manifestacoes OUVE PE"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger = logging.getLogger("ouvidoria-arpe")
    logger.info("Dashboard Ouvidoria ARPE - API iniciada")

    from app.database.base import Base
    from app.database.session import async_session_maker, engine
    from app.domain.ouvidoria.models import (
        DimAssunto,
        DimData,
        DimOrigem,
        DimStatus,
        FatoManifestacao,
        UploadPlanilha,
    )
    from app.domain.ouvidoria.services import ensure_upload_schema

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with async_session_maker() as session:
            await ensure_upload_schema(session)
            await session.commit()
        logger.info("Tabelas verificadas/criadas com sucesso")
    except Exception as exc:
        logger.error("Erro ao inicializar tabelas do banco: %s", exc)

    yield

    logger.info("Dashboard Ouvidoria ARPE - API encerrada")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Dashboard Ouvidoria ARPE - API",
        version="1.0.0",
        debug=settings.app_debug,
        lifespan=lifespan,
        openapi_tags=TAGS_METADATA,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
    )

    register_middlewares(app)
    app.middleware("http")(logging_middleware)
    app.include_router(ouvidoria_router)

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.code,
            content={"detail": exc.message},
        )

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "ok", "env": settings.app_env}

    return app


app = create_app()
