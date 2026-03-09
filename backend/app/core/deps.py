from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole


def _extract_bearer_token(auth_header: str | None) -> str | None:
    if not auth_header:
        return None
    scheme, _, value = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not value:
        return None
    return value.strip()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = _extract_bearer_token(request.headers.get("Authorization")) or request.cookies.get(
        settings.auth_cookie_name
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
            options={"verify_exp": False},
        )
        user_id = payload.get("sub")
        exp = payload.get("exp")
        if user_id is None:
            raise credentials_exception
        if exp is None:
            raise credentials_exception
        exp_ts = float(exp)
        if exp_ts <= datetime.now(timezone.utc).timestamp():
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    except (TypeError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id), User.is_active.is_(True)).first()
    if user is None:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin role required")
    return current_user
