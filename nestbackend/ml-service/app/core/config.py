from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    ML_SERVICE_HOST: str = "0.0.0.0"
    ML_SERVICE_PORT: int = 8000
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    MODEL_PATH: str = "./models"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:4200"]
    API_KEY: str = "your-secret-api-key-here"
    CACHE_TTL: int = 3600
    
    SKILL_WEIGHT: float = 0.35
    QUALIFICATION_WEIGHT: float = 0.25
    LOCATION_WEIGHT: float = 0.15
    SECTOR_WEIGHT: float = 0.15
    DIVERSITY_WEIGHT: float = 0.10
    
    MAX_MATCHES_PER_STUDENT: int = 10
    MIN_MATCH_SCORE: float = 0.5
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
