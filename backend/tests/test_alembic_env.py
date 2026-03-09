from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
import runpy

from alembic import context
import pytest


ALEMBIC_ENV_PATH = Path(__file__).resolve().parents[1] / "alembic" / "env.py"


class DummyConfig:
    def __init__(self) -> None:
        self.config_file_name = None
        self.config_ini_section = "alembic"
        self.options: dict[str, str] = {}

    def set_main_option(self, name: str, value: str) -> None:
        self.options[name] = value

    def get_main_option(self, name: str) -> str:
        return self.options[name]

    def get_section(self, name: str, default: dict[str, str] | None = None) -> dict[str, str]:
        return default or {}


@contextmanager
def _noop_transaction():
    yield


def _run_env(monkeypatch, *, database_url: str | None) -> DummyConfig:
    config = DummyConfig()

    monkeypatch.setattr(context, "config", config, raising=False)
    monkeypatch.setattr(context, "is_offline_mode", lambda: True)
    monkeypatch.setattr(context, "configure", lambda **kwargs: None)
    monkeypatch.setattr(context, "begin_transaction", _noop_transaction)
    monkeypatch.setattr(context, "run_migrations", lambda: None)

    if database_url is None:
        monkeypatch.delenv("DATABASE_URL", raising=False)
    else:
        monkeypatch.setenv("DATABASE_URL", database_url)

    runpy.run_path(str(ALEMBIC_ENV_PATH), run_name="__test__")
    return config


def test_alembic_env_requires_database_url(monkeypatch):
    with pytest.raises(RuntimeError) as excinfo:
        _run_env(monkeypatch, database_url=None)

    message = str(excinfo.value)
    assert "DATABASE_URL" in message
    assert "Alembic migrations require" in message
    assert "alembic upgrade head" in message
    assert "README.md" in message


def test_alembic_env_uses_explicit_database_url(monkeypatch):
    database_url = "sqlite:///./explicit-test.db"

    config = _run_env(monkeypatch, database_url=database_url)

    assert config.get_main_option("sqlalchemy.url") == database_url
