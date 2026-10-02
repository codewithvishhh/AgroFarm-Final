import os

from dotenv import load_dotenv

load_dotenv()


def _normalize_database_url(url: str) -> str:
    if not url:
        return "sqlite:///./agrofarm.db"
    # Render and cloud providers supply postgres:// URLs, but SQLAlchemy 1.4+ and 2.0+ require postgresql://
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


class Settings:
    """Runtime configuration for AgroFarm. Env driven, no secrets in code."""

    APP_NAME: str = "AgroFarm"
    APP_TAGLINE: str = "Smart Agricultural Supply Chain Platform"

    DATABASE_URL: str = _normalize_database_url(
        os.getenv("DATABASE_URL", "sqlite:///./agrofarm.db")
    )
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,https://agro-farm-final.vercel.app",
        ).split(",")
        if o.strip()
    ]
    SIMULATOR_ENABLED: bool = os.getenv("SIMULATOR_ENABLED", "true").lower() == "true"
    SIMULATOR_TICK_SECONDS: float = float(os.getenv("SIMULATOR_TICK_SECONDS", "3"))
    # How many simulated seconds of travel each real second represents.
    SIMULATOR_SPEED_FACTOR: float = float(os.getenv("SIMULATOR_SPEED_FACTOR", "180"))
    SEED_DEMO_DATA: bool = os.getenv("SEED_DEMO_DATA", "true").lower() == "true"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    GEMINI_TIMEOUT_SECONDS: float = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))
settings = Settings()
