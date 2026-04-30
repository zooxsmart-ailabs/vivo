"""OTEL traces + metrics + JSON structured logging para o pipeline Ookla.

Ativado por OTEL_ENABLED=true (default off). Exporta via OTLP gRPC para o
collector SigNoz que roda no compose do data-core. Quando desativado, os
helpers viram no-op para nao acoplar o pipeline a OTEL em dev local.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from contextlib import contextmanager, nullcontext
from typing import Any, Iterator

from .settings import settings

_log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Estado global do telemetry — preenchido por setup_telemetry() se habilitado.
# ---------------------------------------------------------------------------

_TRACER: Any = None
_METER: Any = None


class _NoopInstrument:
    def add(self, *_: Any, **__: Any) -> None:
        pass

    def record(self, *_: Any, **__: Any) -> None:
        pass


# Metrics — instrumentos viram reais em setup_telemetry() se OTEL_ENABLED.
# Por default sao no-op para que importacao de loader/copy_loader em testes
# nao precise inicializar OTEL.
files_total: Any = _NoopInstrument()
rows_loaded_total: Any = _NoopInstrument()
bytes_downloaded_total: Any = _NoopInstrument()
deadlock_retries_total: Any = _NoopInstrument()
file_duration_ms: Any = _NoopInstrument()
download_duration_ms: Any = _NoopInstrument()
copy_duration_ms: Any = _NoopInstrument()
s3_upload_duration_ms: Any = _NoopInstrument()


def setup_telemetry() -> None:
    """Inicializa traces + metrics se OTEL_ENABLED=true. Idempotente."""
    global _TRACER, _METER
    global files_total, rows_loaded_total, bytes_downloaded_total
    global deadlock_retries_total, file_duration_ms, download_duration_ms
    global copy_duration_ms, s3_upload_duration_ms

    _setup_logging()

    if not settings.OTEL_ENABLED:
        # Mantem os no-op instalados em import-time. Sem trace provider.
        return

    if _TRACER is not None:
        return  # ja' inicializado

    # Imports caros — so' carrega se habilitado.
    from opentelemetry import metrics, trace
    from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import (
        OTLPMetricExporter,
    )
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
        OTLPSpanExporter,
    )
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create(
        {
            "service.name": settings.OTEL_SERVICE_NAME,
            "service.namespace": "data-core",
            "deployment.environment": os.environ.get("DEPLOY_ENV", "dev"),
        }
    )

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT, insecure=True)
        )
    )
    trace.set_tracer_provider(tracer_provider)
    _TRACER = trace.get_tracer("ookla_ingest")

    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(
            endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT, insecure=True
        ),
        export_interval_millis=15000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)
    _METER = metrics.get_meter("ookla_ingest")

    files_total = _METER.create_counter(
        "ookla.files",
        unit="1",
        description="Arquivos processados por status/entidade",
    )
    rows_loaded_total = _METER.create_counter(
        "ookla.rows.loaded", unit="1", description="Linhas inseridas em target"
    )
    bytes_downloaded_total = _METER.create_counter(
        "ookla.bytes.downloaded", unit="By", description="Bytes baixados da Ookla"
    )
    deadlock_retries_total = _METER.create_counter(
        "ookla.deadlock.retries",
        unit="1",
        description="Retries por deadlock no INSERT...SELECT",
    )
    file_duration_ms = _METER.create_histogram(
        "ookla.file.duration",
        unit="ms",
        description="Duracao end-to-end por arquivo",
    )
    download_duration_ms = _METER.create_histogram(
        "ookla.download.duration", unit="ms", description="Duracao do download Ookla"
    )
    copy_duration_ms = _METER.create_histogram(
        "ookla.copy.duration",
        unit="ms",
        description="Duracao do COPY+INSERT staging->target",
    )
    s3_upload_duration_ms = _METER.create_histogram(
        "ookla.s3_upload.duration", unit="ms", description="Duracao do upload S3"
    )

    _log.info(
        "OTEL habilitado endpoint=%s service=%s",
        settings.OTEL_EXPORTER_OTLP_ENDPOINT,
        settings.OTEL_SERVICE_NAME,
    )


# ---------------------------------------------------------------------------
# Spans — context manager que vira no-op se OTEL desabilitado.
# ---------------------------------------------------------------------------


@contextmanager
def span(name: str, **attributes: Any) -> Iterator[Any]:
    if _TRACER is None:
        yield None
        return
    with _TRACER.start_as_current_span(name) as sp:
        for k, v in attributes.items():
            if v is not None:
                sp.set_attribute(k, v)
        try:
            yield sp
        except BaseException as exc:
            sp.record_exception(exc)
            from opentelemetry.trace import Status, StatusCode

            sp.set_status(Status(StatusCode.ERROR, str(exc)))
            raise


def set_span_attribute(key: str, value: Any) -> None:
    if _TRACER is None:
        return
    from opentelemetry.trace import get_current_span

    sp = get_current_span()
    if sp is not None and value is not None:
        sp.set_attribute(key, value)


# ---------------------------------------------------------------------------
# JSON structured logging.
# ---------------------------------------------------------------------------


class _JsonFormatter(logging.Formatter):
    """Formatter minimalista — sem deps externas. Inclui run_id/file_id se
    presentes via LogRecord extras (logger.info("...", extra={"run_id": ...}))
    ou via filtros que setam atributos no record."""

    _SKIP = {
        "name",
        "msg",
        "args",
        "levelname",
        "levelno",
        "pathname",
        "filename",
        "module",
        "exc_info",
        "exc_text",
        "stack_info",
        "lineno",
        "funcName",
        "created",
        "msecs",
        "relativeCreated",
        "thread",
        "threadName",
        "processName",
        "process",
        "taskName",
        "message",
        "asctime",
    }

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%fZ"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        # Extras do record (run_id, file_id, entity, etc.) — preserva tudo
        # que nao seja atributo padrao do logging.
        for k, v in record.__dict__.items():
            if k in self._SKIP:
                continue
            try:
                json.dumps(v)
                payload[k] = v
            except (TypeError, ValueError):
                payload[k] = repr(v)
        return json.dumps(payload, ensure_ascii=False)


def _setup_logging() -> None:
    root = logging.getLogger()
    if root.handlers:
        # Ja' configurado (ex.: testes); nao mexe.
        return
    handler = logging.StreamHandler(sys.stdout)
    if settings.LOG_JSON:
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )
    root.addHandler(handler)
    root.setLevel(logging.INFO)


# Re-export para uso conveniente em fluxos onde o tracer pode estar desligado.
__all__ = [
    "setup_telemetry",
    "span",
    "set_span_attribute",
    "files_total",
    "rows_loaded_total",
    "bytes_downloaded_total",
    "deadlock_retries_total",
    "file_duration_ms",
    "download_duration_ms",
    "copy_duration_ms",
    "s3_upload_duration_ms",
    "nullcontext",
]
