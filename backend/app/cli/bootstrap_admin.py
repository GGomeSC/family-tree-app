from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass

from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.database import Base, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole


@dataclass
class BootstrapResult:
    action: str
    email: str
    password_reset: bool


def _required_env(name: str, value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"Missing required environment variable: {name}")
    return normalized


def bootstrap_admin(
    *,
    reset_password: bool,
    session_factory: sessionmaker[Session],
    db_engine: Engine,
) -> BootstrapResult:
    email = _required_env("BOOTSTRAP_ADMIN_EMAIL", settings.bootstrap_admin_email)
    password = _required_env("BOOTSTRAP_ADMIN_PASSWORD", settings.bootstrap_admin_password)
    fallback_name = settings.bootstrap_admin_name.strip() or "Local Admin"

    Base.metadata.create_all(bind=db_engine)

    db = session_factory()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                name=fallback_name,
                email=email,
                password_hash=get_password_hash(password),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(user)
            action = "created"
            password_reset = True
        else:
            user.role = UserRole.ADMIN
            user.is_active = True
            if reset_password:
                user.password_hash = get_password_hash(password)
            action = "updated"
            password_reset = reset_password

        db.commit()
        return BootstrapResult(action=action, email=email, password_reset=password_reset)
    finally:
        db.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create or promote a local admin user.")
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Reset the existing admin password to BOOTSTRAP_ADMIN_PASSWORD.",
    )
    args = parser.parse_args(argv)

    try:
        result = bootstrap_admin(
            reset_password=args.reset_password,
            session_factory=sessionmaker(bind=engine),
            db_engine=engine,
        )
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if result.action == "created":
        print(f"Created local admin user: {result.email}")
    else:
        suffix = " and reset password" if result.password_reset else ""
        print(f"Updated existing user to admin: {result.email}{suffix}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
