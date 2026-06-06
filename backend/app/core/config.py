"""Application settings, loaded from environment / .env file.

Every tunable lives here so nothing downstream reaches for os.environ
directly. Import `settings` anywhere you need configuration.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Database ---
    # Sync driver (psycopg2). docker-compose injects the real value.
    database_url: str = (
        "postgresql+psycopg2://bridge:bridge@localhost:5432/bridge"
    )

    # --- Auth / JWT ---
    # MUST be overridden via env in any shared/deployed environment.
    secret_key: str = "dev-secret-change-me-in-production-please-32b+"
    algorithm: str = "HS256"
    # Short-lived now that a refresh token exists.
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # --- Refresh cookie ---
    refresh_cookie_name: str = "refresh_token"
    # secure=True requires HTTPS; keep False for local http dev.
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    # --- CORS ---
    # Frontend dev origins. Override via env as a JSON array.
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8042",
        "http://127.0.0.1:5500",
        "null",  # file:// origin for direct open without a server
    ]

    # --- Password reset ---
    frontend_url: str = "http://localhost:8042"
    password_reset_expire_minutes: int = 60
    # Dev/hackathon: return reset link in API response (no SMTP). Disable in production.
    expose_password_reset_dev: bool = True

    # --- Logging ---
    # LOG_LEVEL: DEBUG | INFO | WARNING | ERROR
    log_level: str = "DEBUG"
    # JSON lines to stdout (use with Loki/Promtail).
    log_json: bool = False
    # Uvicorn per-request access lines (app middleware still logs requests).
    log_access: bool = False

    # --- AI playground (Ollama / OpenAI-compatible local) ---
    ollama_base_url: str = "http://localhost:11434"
    ai_playground_enabled: bool = True

    # --- File uploads ---
    upload_dir: str = "uploads"

    # --- Seed accounts ---
    seed_admin_email: str = "admin@bridge.local"
    seed_admin_password: str = "Admin1234!"
    seed_power_email: str = "poweruser@bridge.local"
    seed_power_password: str = "Power1234!"
    seed_demo_email: str = "jana.novakova@firma.cz"
    seed_demo_password: str = "Demo1234!"


settings = Settings()
