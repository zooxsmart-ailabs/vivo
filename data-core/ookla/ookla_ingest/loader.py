from __future__ import annotations

import io
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextvars import ContextVar
from dataclasses import dataclass
from datetime import date
from typing import Any

from psycopg import Connection

from . import telemetry
from .api_client import OoklaApiClient, OoklaFileExpired
from .copy_loader import load_file
from .db import close_run, connect, open_run
from .path_parser import TARGET_ENTITIES, parse
from .s3_uploader import IterStream, S3Uploader, s3_key_for
from .schema import ENTITIES
from .settings import settings

# Correlation: cada run/arquivo aparece nos logs JSON via LogRecord extras.
_run_id_var: ContextVar[int | None] = ContextVar("ookla_run_id", default=None)
_file_label_var: ContextVar[str | None] = ContextVar("ookla_file", default=None)


class _ContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        rid = _run_id_var.get()
        fl = _file_label_var.get()
        if rid is not None:
            record.run_id = rid
        if fl is not None:
            record.file = fl
        return True


logging.getLogger().addFilter(_ContextFilter())

log = logging.getLogger(__name__)

LATENCY_ENTITY = "QoELatency"


@dataclass(frozen=True, slots=True)
class CatalogRow:
    entity: str
    remote_path: str
    data_date: date | None


# Recursos thread-local: cada worker thread mantem seu cliente httpx + boto3 +
# conexao Postgres. httpx.Client e psycopg.Connection nao sao thread-safe
# (boto3 client e' thread-safe mas mantemos consistencia).
_local = threading.local()

# Lock por (entidade, data_date): serializa o INSERT...SELECT staging->target
# dentro do mesmo chunk Timescale. Como chunks sao particionados por
# periodDate, dois workers em DIAS distintos da MESMA entidade nao colidem em
# chunk lock — entao podem rodar em paralelo. Granularidade fina libera muito
# paralelismo em backfills (5 entidades x N dias) sem reintroduzir o deadlock
# que motivou o lock original.
_ENTITY_LOCKS_GUARD = threading.Lock()
_ENTITY_LOCKS: dict[tuple[str, date | None], threading.Lock] = {}


def _entity_lock(entity: str, data_date: date | None) -> threading.Lock:
    key = (entity, data_date)
    with _ENTITY_LOCKS_GUARD:
        lock = _ENTITY_LOCKS.get(key)
        if lock is None:
            lock = threading.Lock()
            _ENTITY_LOCKS[key] = lock
        return lock


def _api() -> OoklaApiClient:
    if not hasattr(_local, "api"):
        _local.api = OoklaApiClient()
    return _local.api


def _s3() -> S3Uploader:
    if not hasattr(_local, "s3"):
        _local.s3 = S3Uploader()
    return _local.s3


def _conn() -> Connection:
    if not hasattr(_local, "conn") or _local.conn.closed:
        import psycopg

        c = psycopg.connect(settings.db_dsn, autocommit=False)
        with c.cursor() as cur:
            # temp_buffers nao se aplica: staging e' UNLOGGED (shared_buffers),
            # nao TEMP. Mantemos work_mem/maintenance_work_mem pra ajudar o
            # INSERT...SELECT staging->target e eventual sort de unique check.
            cur.execute("SET work_mem = '256MB'")
            cur.execute("SET maintenance_work_mem = '512MB'")
        c.commit()
        _local.conn = c
    return _local.conn


def run_load(
    *,
    max_days: int | None = None,
    retry_failed: bool = False,
    include_latency: bool = False,
    latency_days: int = 1,
    target_only: bool = False,
    non_target_only: bool = False,
    skip_s3: bool | None = None,
) -> dict[str, Any]:
    if target_only and non_target_only:
        raise ValueError("--target-only e --non-target-only são mutuamente exclusivos")
    # `skip_s3=None` → respeita OOKLA_SKIP_S3. Flag explicita sobrescreve.
    skip_s3 = settings.OOKLA_SKIP_S3 if skip_s3 is None else skip_s3
    # Skip S3 + non_target_only e' inutil — non-target so' faz S3.
    if skip_s3 and non_target_only:
        raise ValueError("--skip-s3 com --non-target-only nao faz nada (non-target e' so' S3)")
    """Carga em 2 fases (target → não-target), streaming end-to-end.

    Sub-fase 1 — entidades alvo:
      Ookla → BytesIO (memória, sem disco) → S3 + COPY Postgres em PARALELO
      dentro do mesmo worker → catálogo marcado como `loaded`.

    Sub-fase 2 — entidades não-alvo:
      Ookla → S3 direto via streaming (httpx.iter_bytes() → boto3 multipart),
      sem buffer intermediário. Catálogo marcado `loaded`. Pulada com `target_only`.

    Cada arquivo é processado por um worker; até `OOKLA_PARALLEL_DOWNLOADS`
    arquivos em flight por dia.
    """
    stats: dict[str, Any] = {
        "files_uploaded": 0,
        "files_loaded": 0,
        "files_failed": 0,
        "files_skipped": 0,
        "rows_loaded": 0,
        "phases": {},
        "include_latency": include_latency,
        "latency_days": latency_days if include_latency else 0,
        "skip_s3": skip_s3,
    }

    with connect() as conn:
        run_id = open_run(conn, phase="load")
        _run_id_var.set(run_id)
        log.info(
            "ookla load run_id=%d iniciado (latency=%s, max_days=%s, target_only=%s, skip_s3=%s, parallelism=%d)",
            run_id,
            f"{latency_days}d" if include_latency else "off",
            max_days,
            target_only,
            skip_s3,
            settings.OOKLA_PARALLEL_DOWNLOADS,
        )
        try:
            allowed_latency_days = _pick_latency_days(
                conn, latency_days if include_latency else 0
            )

            if not non_target_only:
                log.info("=== FASE 1/2: entidades target ===")
                phase1 = _run_phase(
                    conn,
                    target_only_files=True,
                    allowed_latency_days=allowed_latency_days,
                    retry_failed=retry_failed,
                    max_days=max_days,
                    skip_s3=skip_s3,
                )
                stats["phases"]["target"] = phase1
                _accumulate(stats, phase1)

            # Fase 2 (non-target) so' faz S3. Se skip_s3, pula inteira.
            if not target_only and not skip_s3:
                log.info("=== FASE 2/2: entidades nao-target (so S3) ===")
                phase2 = _run_phase(
                    conn,
                    target_only_files=False,
                    allowed_latency_days=allowed_latency_days,
                    retry_failed=retry_failed,
                    max_days=max_days,
                    skip_s3=skip_s3,
                )
                stats["phases"]["non_target"] = phase2
                _accumulate(stats, phase2)
            elif skip_s3 and not target_only:
                log.info("Fase 2/2 (non-target/S3) pulada: --skip-s3")

            close_run(conn, run_id, status="ok", stats=stats)
            log.info("ookla load run_id=%d concluido: %s", run_id, stats)
        except Exception as exc:
            close_run(
                conn,
                run_id,
                status="failed",
                stats={**stats, "error": str(exc)},
            )
            raise

    return stats


def _accumulate(total: dict[str, Any], phase: dict[str, Any]) -> None:
    for k in ("files_uploaded", "files_loaded", "files_failed", "files_skipped", "rows_loaded"):
        total.setdefault(k, 0)
        total[k] += phase.get(k, 0)


def _run_phase(
    main_conn: Connection,
    *,
    target_only_files: bool,
    allowed_latency_days: set[date],
    retry_failed: bool,
    max_days: int | None,
    skip_s3: bool = False,
) -> dict[str, Any]:
    phase_stats: dict[str, Any] = {
        "days_processed": 0,
        "files_uploaded": 0,
        "files_loaded": 0,
        "files_failed": 0,
        "files_skipped": 0,
        "rows_loaded": 0,
    }

    days = _pending_days(
        main_conn,
        retry_failed=retry_failed,
        target_only_files=target_only_files,
    )
    if max_days is not None:
        days = days[:max_days]
    log.info("dias pendentes nesta fase: %d", len(days))

    label = "target" if target_only_files else "non-target"

    for day_idx, day in enumerate(days, 1):
        log.info("[fase %s | dia %d/%d] %s", label, day_idx, len(days), day)
        files = _files_for_day(
            main_conn,
            day,
            retry_failed=retry_failed,
            target_only_files=target_only_files,
            allowed_latency_days=allowed_latency_days,
        )
        if not files:
            continue

        day_span = telemetry.span(
            "ookla.day",
            phase=label,
            day=str(day) if day else "<undated>",
            files=len(files),
        )
        with day_span, ThreadPoolExecutor(
            max_workers=settings.OOKLA_PARALLEL_DOWNLOADS,
            thread_name_prefix="ookla",
        ) as pool:
            futures = {pool.submit(_process_file, row, skip_s3): row for row in files}
            for fut in as_completed(futures):
                row = futures[fut]
                try:
                    rows_loaded, was_target = fut.result()
                    phase_stats["files_uploaded"] += 1
                    if was_target:
                        phase_stats["files_loaded"] += 1
                        phase_stats["rows_loaded"] += rows_loaded
                except OoklaFileExpired:
                    # Arquivo sumiu da API; ja foi marcado skipped em _process_file.
                    phase_stats["files_skipped"] += 1
                except Exception:
                    log.exception("worker falha em %s", row.remote_path)
                    phase_stats["files_failed"] += 1

        phase_stats["days_processed"] += 1
        log.info(
            "[fase %s | dia %d/%d] %s — completo (uploaded=%d loaded=%d failed=%d)",
            label,
            day_idx,
            len(days),
            day,
            phase_stats["files_uploaded"],
            phase_stats["files_loaded"],
            phase_stats["files_failed"],
        )

    return phase_stats


# ---------------------------------------------------------------------------
# Per-file pipeline (streaming, executa em worker thread)
# ---------------------------------------------------------------------------


def _process_file(row: CatalogRow, skip_s3: bool = False) -> tuple[int, bool]:
    """Pipeline de 1 arquivo, sem disco.

    - Target: Ookla → BytesIO → (S3 // COPY) em paralelo no mesmo worker
      (S3 pulado quando `skip_s3=True`; so' faz download + COPY).
    - Não-target: Ookla → S3 streaming direto (sem buffer).

    Retorna (rows_loaded, was_target).
    """
    parsed = parse(row.remote_path)
    if parsed is None:
        raise RuntimeError(f"path nao parseavel: {row.remote_path}")

    is_target = row.entity in TARGET_ENTITIES
    file_label = row.remote_path.rsplit("/", 1)[-1]
    _file_label_var.set(file_label)
    attrs = {"entity": row.entity, "target": is_target}

    file_t0 = time.monotonic()
    with telemetry.span("ookla.process_file", **attrs):
        try:
            return _process_file_inner(row, parsed, is_target, file_label, skip_s3)
        finally:
            telemetry.file_duration_ms.record(
                (time.monotonic() - file_t0) * 1000,
                {"entity": row.entity, "target": is_target},
            )


def _process_file_inner(
    row: CatalogRow,
    parsed: Any,
    is_target: bool,
    file_label: str,
    skip_s3: bool = False,
) -> tuple[int, bool]:
    conn = _conn()
    api = _api()
    s3 = _s3()
    key = s3_key_for(row.remote_path, parsed)

    _mark(conn, row, status="downloading")
    with telemetry.span("ookla.resolve_url", entity=row.entity):
        try:
            url = api.resolve_file_url(row.remote_path)
        except OoklaFileExpired as exc:
            _mark(conn, row, status="skipped", error=f"expired: {exc}")
            telemetry.files_total.add(
                1, {"entity": row.entity, "status": "skipped"}
            )
            log.info("expirado da API: %s", row.remote_path)
            raise

    if not is_target:
        if skip_s3:
            # Defesa em profundidade — run_load ja' pula a fase non-target
            # quando skip_s3=True, mas se chegou aqui, nada a fazer.
            _mark(conn, row, status="skipped", error="skip_s3 enabled")
            telemetry.files_total.add(1, {"entity": row.entity, "status": "skipped"})
            return 0, False
        try:
            t0 = time.monotonic()
            with api.stream_download(url) as resp:
                resp.raise_for_status()
                _mark(conn, row, status="uploading")
                fileobj = IterStream(resp.iter_bytes(1 << 16))
                with telemetry.span(
                    "ookla.s3_upload", entity=row.entity, streaming=True
                ):
                    s3_uri = s3.upload_fileobj(fileobj, key, skip_if_exists=False)
            telemetry.s3_upload_duration_ms.record(
                (time.monotonic() - t0) * 1000,
                {"entity": row.entity, "streaming": True},
            )
        except Exception as exc:
            _mark(conn, row, status="failed", error=f"stream: {exc}")
            telemetry.files_total.add(
                1, {"entity": row.entity, "status": "failed"}
            )
            raise
        _mark(conn, row, status="loaded", s3_uri=s3_uri)
        telemetry.files_total.add(1, {"entity": row.entity, "status": "loaded"})
        return 0, False

    # Target: precisamos do parquet em memoria pra alimentar pyarrow (footer
    # exige acesso aleatorio, COPY so' arranca apos download completo).
    # Mantemos S3 em paralelo com COPY pra ocultar o tempo de upload atras
    # do tempo de COPY (que e' o gargalo dominante em qoe_latency).
    #
    # Otimizacao de RAM: acumula chunks numa lista e faz um unico b"".join
    # antes de COPY/S3, evitando o pico 2N do antigo `BytesIO + getvalue()`.
    # Pico fica ~1N (lista) durante download; ~2N brevemente durante o join;
    # ~1N (payload bytes) durante COPY+S3 paralelos.
    chunks: list[bytes] = []
    size = 0
    try:
        d0 = time.monotonic()
        with telemetry.span("ookla.download", entity=row.entity) as sp:
            with api.stream_download(url) as resp:
                resp.raise_for_status()
                for chunk in resp.iter_bytes(1 << 20):
                    chunks.append(chunk)
                    size += len(chunk)
            if sp is not None:
                sp.set_attribute("bytes", size)
        telemetry.download_duration_ms.record(
            (time.monotonic() - d0) * 1000, {"entity": row.entity}
        )
        telemetry.bytes_downloaded_total.add(size, {"entity": row.entity})
    except Exception as exc:
        _mark(conn, row, status="failed", error=f"download: {exc}")
        telemetry.files_total.add(1, {"entity": row.entity, "status": "failed"})
        raise

    _mark(conn, row, status="uploading")
    entity_map = ENTITIES[row.entity]
    payload = b"".join(chunks)
    chunks.clear()

    s3_uri_box: list[str | None] = [None]
    rows_box: list[int] = [0]
    err_box: list[BaseException | None] = [None, None]

    def _do_s3() -> None:
        try:
            s3_t0 = time.monotonic()
            with telemetry.span(
                "ookla.s3_upload", entity=row.entity, bytes=size
            ):
                s3_uri_box[0] = s3.upload_fileobj(
                    io.BytesIO(payload),
                    key,
                    expected_size=size,
                    skip_if_exists=True,
                )
            telemetry.s3_upload_duration_ms.record(
                (time.monotonic() - s3_t0) * 1000,
                {"entity": row.entity, "streaming": False},
            )
        except BaseException as e:
            err_box[0] = e

    def _do_copy() -> None:
        try:
            copy_t0 = time.monotonic()
            with telemetry.span("ookla.copy_load", entity=row.entity) as sp:
                # A lock per (entity, data_date) e' aplicada DENTRO de
                # load_file, ao redor so' do INSERT staging->target. Isso
                # permite que CREATE/COPY/DROP de N workers no mesmo dia
                # rodem em paralelo (cada worker tem staging table com
                # nome unico), serializando apenas o passo que de fato
                # toma chunk lock no hypertable.
                rows_box[0] = load_file(
                    conn,
                    entity_map=entity_map,
                    file_obj=io.BytesIO(payload),
                    file_label=file_label,
                    insert_lock=_entity_lock(row.entity, row.data_date),
                )
                if sp is not None:
                    sp.set_attribute("rows", rows_box[0])
            # load_file ja' commitou INSERT (sob a lock) e DROP (fora).
            # Esta chamada e' no-op mas mantemos como invariante explicita.
            conn.commit()
            telemetry.copy_duration_ms.record(
                (time.monotonic() - copy_t0) * 1000,
                {"entity": row.entity},
            )
        except BaseException as e:
            try:
                conn.rollback()
            except BaseException:
                pass
            err_box[1] = e

    if skip_s3:
        # So' COPY — sem thread S3. Mantemos `_do_copy` em thread pra
        # preservar simetria de erro-handling, mas e' efetivamente sequencial.
        _do_copy()
    else:
        t_s3 = threading.Thread(target=_do_s3, name="s3")
        t_copy = threading.Thread(target=_do_copy, name="copy")
        t_s3.start()
        t_copy.start()
        t_s3.join()
        t_copy.join()

    if not skip_s3 and err_box[0] is not None:
        _mark(conn, row, status="failed", error=f"s3: {err_box[0]}")
        telemetry.files_total.add(1, {"entity": row.entity, "status": "failed"})
        raise err_box[0]
    if err_box[1] is not None:
        _mark(conn, row, status="failed", error=f"copy: {err_box[1]}")
        telemetry.files_total.add(1, {"entity": row.entity, "status": "failed"})
        raise err_box[1]

    _mark(
        conn,
        row,
        status="loaded",
        rows=rows_box[0],
        s3_uri=s3_uri_box[0],
    )
    telemetry.files_total.add(1, {"entity": row.entity, "status": "loaded"})
    telemetry.rows_loaded_total.add(rows_box[0], {"entity": row.entity})
    return rows_box[0], True


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


def _pick_latency_days(conn: Connection, n_days: int) -> set[date]:
    if n_days <= 0:
        return set()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT data_date FROM ookla_catalog
             WHERE entity = %s AND data_date IS NOT NULL
               AND status NOT IN ('loaded')
             ORDER BY data_date
             LIMIT %s
            """,
            (LATENCY_ENTITY, n_days),
        )
        return {r[0] for r in cur.fetchall()}


def _pending_statuses(retry_failed: bool) -> tuple[str, ...]:
    if retry_failed:
        return (
            "catalogued",
            "downloading",
            "downloaded",
            "uploading",
            "uploaded",
            "loading",
            "failed",
        )
    return ("catalogued", "downloaded", "uploaded")


def _entity_filter_clause(target_only_files: bool) -> tuple[str, list[Any]]:
    placeholders = ",".join(["%s"] * len(TARGET_ENTITIES))
    op = "IN" if target_only_files else "NOT IN"
    return f"entity {op} ({placeholders})", list(TARGET_ENTITIES)


def _pending_days(
    conn: Connection, *, retry_failed: bool, target_only_files: bool
) -> list[date | None]:
    statuses = _pending_statuses(retry_failed)
    clause, params = _entity_filter_clause(target_only_files)
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT DISTINCT data_date FROM ookla_catalog
             WHERE status = ANY(%s) AND attempts < %s
               AND data_date IS NOT NULL
               AND {clause}
             ORDER BY data_date
            """,
            [list(statuses), settings.OOKLA_MAX_ATTEMPTS, *params],
        )
        days: list[date | None] = [r[0] for r in cur.fetchall()]
        cur.execute(
            f"""
            SELECT EXISTS(
              SELECT 1 FROM ookla_catalog
               WHERE data_date IS NULL AND status = ANY(%s) AND attempts < %s
                 AND {clause}
            )
            """,
            [list(statuses), settings.OOKLA_MAX_ATTEMPTS, *params],
        )
        if cur.fetchone()[0]:
            days.append(None)
        return days


def _files_for_day(
    conn: Connection,
    day: date | None,
    *,
    retry_failed: bool,
    target_only_files: bool,
    allowed_latency_days: set[date],
) -> list[CatalogRow]:
    statuses = _pending_statuses(retry_failed)
    clause, params = _entity_filter_clause(target_only_files)
    skip_latency = day is None or day not in allowed_latency_days
    where_date = "data_date IS NULL" if day is None else "data_date = %s"
    sql_params: list[Any] = []
    if day is not None:
        sql_params.append(day)
    sql_params += [
        list(statuses),
        settings.OOKLA_MAX_ATTEMPTS,
        skip_latency,
        LATENCY_ENTITY,
        *params,
    ]
    with conn.cursor() as cur:
        # Interleave por entidade (round-robin): primeiro arquivo de cada
        # entidade, depois segundo, etc. Garante que os N workers cobrem as 5
        # entidades em paralelo desde o inicio, em vez de drenar uma entidade
        # por completo antes da proxima — o lock per (entity, data_date) faz
        # workers da MESMA entidade serializarem no INSERT, entao manter so' 1
        # worker em flight por entidade nao desacelera.
        cur.execute(
            f"""
            SELECT entity, remote_path, data_date
              FROM (
                SELECT entity, remote_path, data_date,
                       row_number() OVER (PARTITION BY entity ORDER BY remote_path) AS rn
                  FROM ookla_catalog
                 WHERE {where_date} AND status = ANY(%s)
                   AND attempts < %s
                   AND (NOT %s OR entity <> %s)
                   AND {clause}
              ) t
             ORDER BY rn, entity
            """,
            sql_params,
        )
        return [
            CatalogRow(entity=r[0], remote_path=r[1], data_date=r[2])
            for r in cur.fetchall()
        ]


def _mark(
    conn: Connection,
    row: CatalogRow,
    *,
    status: str,
    error: str | None = None,
    rows: int | None = None,
    s3_uri: str | None = None,
) -> None:
    err_trunc = error[:2000] if error else None
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE ookla_catalog
               SET status        = %s::ookla_file_status,
                   error_message = %s,
                   rows_loaded   = COALESCE(%s, rows_loaded),
                   s3_uri        = COALESCE(%s, s3_uri),
                   uploaded_at   = CASE WHEN %s = 'uploaded' THEN NOW() ELSE uploaded_at END,
                   loaded_at     = CASE WHEN %s = 'loaded'   THEN NOW() ELSE loaded_at   END,
                   attempts      = attempts + CASE WHEN %s = 'failed' THEN 1 ELSE 0 END
             WHERE entity = %s AND remote_path = %s
            """,
            (
                status,
                err_trunc,
                rows,
                s3_uri,
                status,
                status,
                status,
                row.entity,
                row.remote_path,
            ),
        )
    conn.commit()
