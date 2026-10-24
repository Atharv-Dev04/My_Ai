"""
Database session and connection management via SQLAlchemy 2.x.
"""
from __future__ import annotations

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from api.config import get_settings

cfg = get_settings()

# Connect_args needed for SQLite in multithreaded test environments
connect_args = {"check_same_thread": False} if cfg.database_url.startswith("sqlite") else {}

engine = create_engine(
    cfg.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and guarantees closure."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
