from __future__ import annotations

from typing import Literal

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

    # Quando true, pula upload S3 em todas as fases. Util pra acelerar
    # backfill quando a copia em S3 ja' foi feita anteriormente ou nao
    # eh' requisito. Pode ser sobrescrito via flag --skip-s3.
    OOKLA_SKIP_S3: bool = False
    # Concorrência do multipart upload do boto3 dentro de CADA worker.
    # Total de conexões simultâneas pro S3 ≈ OOKLA_PARALLEL_DOWNLOADS *
    # OOKLA_S3_MAX_CONCURRENCY. Cuidado pra não estourar RAM/network.
    OOKLA_S3_MAX_CONCURRENCY: int = 4

    # Modo de conflito no INSERT...ON CONFLICT do load. Default 'do_nothing':
    # re-runs sao idempotentes sem atualizar colunas existentes (~free).
    # 'do_update' atualiza todas as colunas, util pra preencher novas colunas
    # em re-load mas custoso em tabelas largas (qoe_latency tem 138 cols).
    OOKLA_UPSERT_MODE: Literal["do_nothing", "do_update"] = "do_nothing"

    # Formato do COPY para staging. 'text' e' o default seguro: psycopg 3.2
    # nao registra binary dumper para inet[] (presente em file_transfer,
    # video, web_browsing) — usar 'binary' nessas tabelas corrompe o stream.
    # 'binary' permanece como opt-in para schemas sem array types: ~3-10x
    # mais rapido em tabelas largas como qoe_latency (138 cols).
    OOKLA_COPY_FORMAT: Literal["binary", "text"] = "text"

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

    # ----------------------------------------------------------- Observability
    # OTEL: traces + metrics via OTLP gRPC. Endpoint default aponta para o
    # collector SigNoz que ja' roda no docker-compose do data-core.
    OTEL_ENABLED: bool = False
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://signoz-otel-collector:4317"
    OTEL_SERVICE_NAME: str = "ookla-ingest"
    # Logs em JSON: facilita ingestao em CW/Loki/SigNoz e correlacao por run_id.
    LOG_JSON: bool = False


settings = Settings()  # type: ignore[call-arg]
