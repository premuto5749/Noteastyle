from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Note-a-Style API"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-to-a-random-secret"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://noteastyle:noteastyle@localhost:5432/noteastyle"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # AKOOL
    AKOOL_API_KEY: str = ""
    AKOOL_CLIENT_ID: str = ""

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "noteastyle-photos"
    AWS_REGION: str = "ap-northeast-2"

    # File upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
