import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

logger = logging.getLogger("ouvidoria-arpe")


def register_middlewares(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


async def logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        duration = (time.perf_counter() - start) * 1000
        logger.exception(
            "[%s] %s %s failed after %.1fms",
            request_id,
            request.method,
            request.url.path,
            duration,
        )
        raise

    duration = (time.perf_counter() - start) * 1000
    logger.info(
        "[%s] %s %s -> %s (%.1fms)",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration,
    )
    response.headers["X-Request-ID"] = request_id
    return response
