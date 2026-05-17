from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "VissaAssist API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "vissaassist"

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000"
    ]

    # Azure OpenAI Configuration
    AZURE_OPENAI_ENDPOINT: str = os.getenv(
        "AZURE_OPENAI_ENDPOINT",
        "https://your-endpoint.services.ai.azure.com/openai/v1/"
    )

    AZURE_OPENAI_API_KEY: str = os.getenv(
        "AZURE_OPENAI_API_KEY",
        ""
    )

    AZURE_OPENAI_DEPLOYMENT_NAME: str = "Llama-3.3-70B-Instruct"
    AZURE_OPENAI_MODEL_NAME: str = "Llama-3.3-70B-Instruct"

    # Auth
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "change-this-super-secret-key-in-production"
    )

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Azure Communication Services Email
    COMMUNICATION_SERVICES_CONNECTION_STRING: str = os.getenv(
        "COMMUNICATION_SERVICES_CONNECTION_STRING",
        ""
    )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()