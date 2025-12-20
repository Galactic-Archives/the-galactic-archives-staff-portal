import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import List

load_dotenv()


class Settings(BaseSettings):
    """Application settings from environment variables"""

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost/galactic_support",
    )

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]
    if cors_env := os.getenv("CORS_ORIGINS"):
        CORS_ORIGINS = cors_env.split(",")

    # Server
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    STAFF_BACKEND_URL: str = os.getenv(
        "STAFF_BACKEND_URL", "http://localhost:8001"
    )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
