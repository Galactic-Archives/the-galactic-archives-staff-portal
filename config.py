from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Database (Used by database.py via os.getenv, but good to have here)
    DATABASE_URL: Optional[str] = None

    # Security (Used by security.py)
    JWT_SECRET: str = "change_this_secret_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # THE FIX: Annotated with Optional[str]
    cors_env: Optional[str] = None 

    class Config:
        env_file = ".env"
        extra = "ignore"  # Prevents errors if .env has extra variables

settings = Settings()
