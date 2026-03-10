from pathlib import Path
from typing import Literal

from pydantic import Field, ValidationError, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET_KEY = "change-this-secret"
BACKEND_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = Field(default="Family Tree API", validation_alias="APP_NAME")
    environment: Literal["development", "test", "staging", "production"] = Field(
        default="development",
        validation_alias="ENVIRONMENT",
    )
    secret_key: str = Field(default=DEFAULT_SECRET_KEY, validation_alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=720, ge=1, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    database_url: str = Field(default="sqlite:///./family_tree.db", validation_alias="DATABASE_URL")
    allowed_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        validation_alias="ALLOWED_ORIGINS",
    )
    allowed_origin_regex: str = Field(
        default=r"http://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+):5173",
        validation_alias="ALLOWED_ORIGIN_REGEX",
    )
    export_dir: str = Field(default="./exports", validation_alias="EXPORT_DIR")
    auth_cookie_name: str = Field(default="access_token", validation_alias="AUTH_COOKIE_NAME")
    auth_cookie_secure: bool = Field(default=True, validation_alias="AUTH_COOKIE_SECURE")
    auth_cookie_samesite: Literal["lax", "strict", "none"] = Field(
        default="strict",
        validation_alias="AUTH_COOKIE_SAMESITE",
    )
    auth_cookie_path: str = Field(default="/", min_length=1, validation_alias="AUTH_COOKIE_PATH")
    login_rate_limit_attempts: int = Field(default=5, ge=1, validation_alias="LOGIN_RATE_LIMIT_ATTEMPTS")
    login_rate_limit_window_minutes: int = Field(
        default=15,
        ge=1,
        validation_alias="LOGIN_RATE_LIMIT_WINDOW_MINUTES",
    )
    bootstrap_admin_email: str = Field(default="", validation_alias="BOOTSTRAP_ADMIN_EMAIL")
    bootstrap_admin_password: str = Field(default="", validation_alias="BOOTSTRAP_ADMIN_PASSWORD")
    bootstrap_admin_name: str = Field(default="", validation_alias="BOOTSTRAP_ADMIN_NAME")

    @model_validator(mode="after")
    def validate_secret_key_for_environment(self) -> "Settings":
        if self.environment in {"development", "test"}:
            return self
        if len(self.secret_key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters outside development/test.")
        return self


def load_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as exc:
        raise RuntimeError(
            "Invalid application configuration. Check backend/.env.example for backend-local runs or "
            ".env.example and README.md for Docker Compose setup.\n"
            f"{exc}"
        ) from exc


settings = load_settings()
