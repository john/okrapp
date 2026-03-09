from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://rokr:secret@db:5432/rokr"

    # Auth0
    auth0_domain: str = ""
    auth0_api_audience: str = ""
    auth0_algorithms: list[str] = ["RS256"]

    # App
    admin_emails: list[str] = ["jmcgrath@rmi.org", "cblock@rmi.org", "rhall@rmi.org"]
    cors_origins: list[str] = ["http://localhost:5173"]

    # Celery
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
