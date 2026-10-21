"""
VectorMind API — configuration.

All tuneable values are read from environment variables so secrets
never appear in source code. A ``.env`` file is supported via
``python-dotenv`` if installed; otherwise os.environ is used directly.

Variables (with defaults):
    OLLAMA_HOST          127.0.0.1
    OLLAMA_PORT          11434
    OLLAMA_EMBED_MODEL   nomic-embed-text
    OLLAMA_GEN_MODEL     llama3.2
    VECTOR_DIMS          16          (demo index dimensionality)
    CORS_ORIGINS         http://localhost:5173,http://localhost:3000
    APP_ENV              development
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Ollama ───────────────────────────────────────────────────────────
    ollama_host: str = "127.0.0.1"
    ollama_port: int = 11434
    ollama_embed_model: str = "nomic-embed-text"
    ollama_gen_model: str = "llama3.2"

    # ── Demo vector index ────────────────────────────────────────────────
    vector_dims: int = 16

    # ── CORS — comma-separated list of allowed origins ───────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # ── Environment label ────────────────────────────────────────────────
    app_env: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS_ORIGINS into a Python list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the singleton Settings instance (cached after first call)."""
    return Settings()
