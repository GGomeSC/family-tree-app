from __future__ import annotations

from pathlib import Path
import importlib
import sys

import pytest
from pydantic import ValidationError


def _clear_backend_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "APP_NAME",
        "ENVIRONMENT",
        "SECRET_KEY",
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "DATABASE_URL",
        "ALLOWED_ORIGINS",
        "ALLOWED_ORIGIN_REGEX",
        "EXPORT_DIR",
        "AUTH_COOKIE_NAME",
        "AUTH_COOKIE_SECURE",
        "AUTH_COOKIE_SAMESITE",
        "AUTH_COOKIE_PATH",
        "LOGIN_RATE_LIMIT_ATTEMPTS",
        "LOGIN_RATE_LIMIT_WINDOW_MINUTES",
        "BOOTSTRAP_ADMIN_EMAIL",
        "BOOTSTRAP_ADMIN_PASSWORD",
        "BOOTSTRAP_ADMIN_NAME",
    ):
        monkeypatch.delenv(key, raising=False)


def _settings_kwargs(tmp_path: Path) -> dict[str, object]:
    return {
        "_env_file": tmp_path / ".missing.env",
        "database_url": f"sqlite:///{tmp_path / 'config.sqlite'}",
    }


def test_settings_accept_valid_production_secret(tmp_path: Path):
    from app.core.config import Settings

    settings = Settings(
        environment="production",
        secret_key="a" * 32,
        **_settings_kwargs(tmp_path),
    )

    assert settings.environment == "production"
    assert settings.secret_key == "a" * 32


def test_settings_reject_short_production_secret(tmp_path: Path):
    from app.core.config import Settings

    with pytest.raises(ValidationError, match="SECRET_KEY must be at least 32 characters"):
        Settings(
            environment="production",
            secret_key="short-secret",
            **_settings_kwargs(tmp_path),
        )


def test_settings_allow_default_secret_in_development(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    from app.core.config import DEFAULT_SECRET_KEY, Settings

    _clear_backend_env(monkeypatch)
    settings = Settings(environment="development", **_settings_kwargs(tmp_path))

    assert settings.secret_key == DEFAULT_SECRET_KEY


def test_settings_reject_invalid_integer_field(tmp_path: Path):
    from app.core.config import Settings

    with pytest.raises(ValidationError) as excinfo:
        Settings(access_token_expire_minutes=0, **_settings_kwargs(tmp_path))

    assert "access_token_expire_minutes" in str(excinfo.value)


def test_settings_reject_invalid_cookie_samesite(tmp_path: Path):
    from app.core.config import Settings

    with pytest.raises(ValidationError) as excinfo:
        Settings(auth_cookie_samesite="invalid", **_settings_kwargs(tmp_path))

    assert "auth_cookie_samesite" in str(excinfo.value)


def test_settings_load_env_file_for_backend_local_runs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    from app.core.config import Settings

    _clear_backend_env(monkeypatch)
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "ENVIRONMENT=production",
                "SECRET_KEY=abcdefghijklmnopqrstuvwxyz123456",
                f"DATABASE_URL=sqlite:///{tmp_path / 'env.sqlite'}",
            ]
        ),
        encoding="utf-8",
    )

    settings = Settings(_env_file=env_file)

    assert settings.environment == "production"
    assert settings.secret_key == "abcdefghijklmnopqrstuvwxyz123456"
    assert settings.database_url.endswith("env.sqlite")


def test_load_settings_wraps_validation_error_with_actionable_message(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
):
    _clear_backend_env(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "short")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'runtime.sqlite'}")

    module_name = "app.core.config"
    sys.modules.pop(module_name, None)

    with pytest.raises(RuntimeError) as excinfo:
        importlib.import_module(module_name)

    message = str(excinfo.value)
    assert "Invalid application configuration" in message
    assert "backend/.env.example" in message
    assert "README.md" in message
    assert "SECRET_KEY must be at least 32 characters" in message

    sys.modules.pop(module_name, None)
