import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Runtime configuration for AgroFarm. Env driven, no secrets in code."""

    APP_NAME: str = "AgroFarm"
    APP_TAGLINE: str = "Smart Agricultural Supply Chain Platform"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agrofarm.db")
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if o.strip()
    ]
    SIMULATOR_ENABLED: bool = os.getenv("SIMULATOR_ENABLED", "true").lower() == "true"
    SIMULATOR_TICK_SECONDS: float = float(os.getenv("SIMULATOR_TICK_SECONDS", "3"))
    # How many simulated seconds of travel each real second represents.
    SIMULATOR_SPEED_FACTOR: float = float(os.getenv("SIMULATOR_SPEED_FACTOR", "180"))
    SEED_DEMO_DATA: bool = os.getenv("SEED_DEMO_DATA", "true").lower() == "true"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()


settings = Settings()
