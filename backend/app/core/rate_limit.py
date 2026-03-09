import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


def _default_retry_after_seconds() -> int:
    return max(settings.login_rate_limit_window_minutes * 60, 1)


def _resolve_retry_after(exc: RateLimitExceeded) -> int:
    headers = getattr(exc, "headers", None) or {}
    header_value = headers.get("Retry-After")
    if header_value and str(header_value).isdigit():
        return max(int(header_value), 1)
    return _default_retry_after_seconds()


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = _resolve_retry_after(exc)
    client_ip = request.client.host if request.client else "unknown"
    logger.warning(
        "rate_limit_exceeded ip=%s path=%s retry_after=%s",
        client_ip,
        request.url.path,
        retry_after,
    )
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": f"Too many login attempts. Try again in {retry_after} seconds."},
        headers={"Retry-After": str(retry_after)},
    )
