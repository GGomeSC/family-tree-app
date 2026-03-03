from dataclasses import dataclass
import os


@dataclass
class Settings:
    app_name: str = os.getenv("APP_NAME", "Family Tree API")
    environment: str = os.getenv("ENVIRONMENT", "development")
    secret_key: str = os.getenv("SECRET_KEY", "change-this-secret")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./family_tree.db",
    )
    allowed_origins: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    allowed_origin_regex: str = os.getenv("ALLOWED_ORIGIN_REGEX", r"http://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+):5173")
    export_dir: str = os.getenv("EXPORT_DIR", "./exports")


settings = Settings()
