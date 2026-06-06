"""Database wiring: one engine, one session factory, one Base.

`get_db` is the FastAPI dependency every route uses to get a session.
`init_db` creates tables from the ORM metadata at startup (create_all).
"""
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# pool_pre_ping avoids handing out a dead connection after Postgres
# restarts or idle timeouts -- cheap insurance under load.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
    pool_recycle=1800,
)

SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, class_=Session
)


class Base(DeclarativeBase):
    """Declarative base. All ORM models inherit from this."""


def get_db() -> Generator[Session, None, None]:
    """Yield a session, guaranteeing it's closed even if the route raises."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_column(conn, table: str, column: str, ddl_type: str) -> None:
    """Add `column` to `table` if it's missing.

    create_all never ALTERs existing tables, so additive schema changes on a
    live DB (no Alembic here) need a lightweight idempotent guard. Works on
    both Postgres and SQLite, which accept plain `ALTER TABLE ... ADD COLUMN`.
    """
    existing = {c["name"] for c in inspect(conn).get_columns(table)}
    if column in existing:
        return
    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
    logger.info("event=db_column_added table=%s column=%s", table, column)


def init_db() -> None:
    """Create any tables that don't exist yet, then apply additive guards.

    Importing app.models registers every model on Base.metadata before
    create_all runs -- without this import the metadata is empty.
    """
    import app.models  # noqa: F401  (registers models on Base.metadata)

    table_names = sorted(Base.metadata.tables.keys())
    logger.info(
        "event=db_init_start dialect=%s tables_registered=%s",
        engine.dialect.name,
        len(table_names),
    )
    Base.metadata.create_all(bind=engine)

    # Additive migrations for columns introduced after a table first shipped.
    with engine.begin() as conn:
        _ensure_column(conn, "users", "last_active", "TIMESTAMP")

    logger.info(
        "event=db_init_complete dialect=%s tables=%s",
        engine.dialect.name,
        ",".join(table_names) if table_names else "none",
    )

