from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    # ------------------------------------------------------------------ Ookla
    OOKLA_USERNAME: str
    OOKLA_PASSWORD: str
    OOKLA_API_URL: str = "https://intelligence.speedtest.net/extracts"

    OOKLA_PARALLEL_DOWNLOADS: int = 4
    OOKLA_MAX_ATTEMPTS: int = 5
    OOKLA_RAW_DIR: str = "/data/ookla/raw"

    # --------------------------------------------------------------------- S3
    OOKLA_S3_BUCKET: str = "zoox-vivo-raw"
    OOKLA_S3_PREFIX: str = "ookla"
    AWS_REGION: str = "us-east-1"

    # ---------------------------------------------------------------- Postgres
    DB_HOST: str
    DB_PORT: int = 5432
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    @property
    def db_dsn(self) -> str:
        return (
            f"host={self.DB_HOST} port={self.DB_PORT} dbname={self.DB_NAME} "
            f"user={self.DB_USER} password={self.DB_PASSWORD}"
        )


settings = Settings()  # type: ignore[call-arg]
