from __future__ import annotations

import io
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date
from typing import Any

from psycopg import Connection

from .api_client import OoklaApiClient
from .copy_loader import load_file
from .db import close_run, connect, open_run
from .path_parser import TARGET_ENTITIES, parse
from .s3_uploader import IterStream, S3Uploader, s3_key_for
from .schema import ENTITIES
from .settings import settings

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
            cur.execute("SET temp_buffers = '1GB'")
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
) -> dict[str, Any]:
    if target_only and non_target_only:
        raise ValueError("--target-only e --non-target-only são mutuamente exclusivos")
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
        "rows_loaded": 0,
        "phases": {},
        "include_latency": include_latency,
        "latency_days": latency_days if include_latency else 0,
    }

    with connect() as conn:
        run_id = open_run(conn, phase="load")
        log.info(
            "ookla load run_id=%d iniciado (latency=%s, max_days=%s, target_only=%s, parallelism=%d)",
            run_id,
            f"{latency_days}d" if include_latency else "off",
            max_days,
            target_only,
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
                )
                stats["phases"]["target"] = phase1
                _accumulate(stats, phase1)

            if not target_only:
                log.info("=== FASE 2/2: entidades nao-target (so S3) ===")
                phase2 = _run_phase(
                    conn,
                    target_only_files=False,
                    allowed_latency_days=allowed_latency_days,
                    retry_failed=retry_failed,
                    max_days=max_days,
                )
                stats["phases"]["non_target"] = phase2
                _accumulate(stats, phase2)

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
    for k in ("files_uploaded", "files_loaded", "files_failed", "rows_loaded"):
        total[k] += phase.get(k, 0)


def _run_phase(
    main_conn: Connection,
    *,
    target_only_files: bool,
    allowed_latency_days: set[date],
    retry_failed: bool,
    max_days: int | None,
) -> dict[str, Any]:
    phase_stats: dict[str, Any] = {
        "days_processed": 0,
        "files_uploaded": 0,
        "files_loaded": 0,
        "files_failed": 0,
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

        with ThreadPoolExecutor(
            max_workers=settings.OOKLA_PARALLEL_DOWNLOADS,
            thread_name_prefix="ookla",
        ) as pool:
            futures = {pool.submit(_process_file, row): row for row in files}
            for fut in as_completed(futures):
                row = futures[fut]
                try:
                    rows_loaded, was_target = fut.result()
                    phase_stats["files_uploaded"] += 1
                    if was_target:
                        phase_stats["files_loaded"] += 1
                        phase_stats["rows_loaded"] += rows_loaded
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


def _process_file(row: CatalogRow) -> tuple[int, bool]:
    """Pipeline de 1 arquivo, sem disco.

    - Target: Ookla → BytesIO → (S3 // COPY) em paralelo no mesmo worker.
    - Não-target: Ookla → S3 streaming direto (sem buffer).

    Retorna (rows_loaded, was_target).
    """
    parsed = parse(row.remote_path)
    if parsed is None:
        raise RuntimeError(f"path nao parseavel: {row.remote_path}")

    is_target = row.entity in TARGET_ENTITIES
    conn = _conn()
    api = _api()
    s3 = _s3()
    key = s3_key_for(row.remote_path, parsed)

    _mark(conn, row, status="downloading")
    url = api.resolve_file_url(row.remote_path)

    if not is_target:
        # Stream Ookla → S3, sem qualquer buffer adicional.
        try:
            with api.stream_download(url) as resp:
                resp.raise_for_status()
                _mark(conn, row, status="uploading")
                fileobj = IterStream(resp.iter_bytes(1 << 16))  # 64KB chunks
                s3_uri = s3.upload_fileobj(fileobj, key, skip_if_exists=False)
        except Exception as exc:
            _mark(conn, row, status="failed", error=f"stream: {exc}")
            raise
        _mark(conn, row, status="loaded", s3_uri=s3_uri)
        return 0, False

    # Target: precisamos do parquet em memória pra alimentar pyarrow + S3.
    try:
        buf = io.BytesIO()
        with api.stream_download(url) as resp:
            resp.raise_for_status()
            for chunk in resp.iter_bytes(1 << 20):  # 1MB chunks
                buf.write(chunk)
        size = buf.tell()
    except Exception as exc:
        _mark(conn, row, status="failed", error=f"download: {exc}")
        raise

    _mark(conn, row, status="uploading")
    entity_map = ENTITIES[row.entity]
    payload = buf.getvalue()  # imutable bytes; cada thread cria seu BytesIO

    s3_uri_box: list[str | None] = [None]
    rows_box: list[int] = [0]
    err_box: list[BaseException | None] = [None, None]

    def _do_s3() -> None:
        try:
            s3_uri_box[0] = s3.upload_fileobj(
                io.BytesIO(payload),
                key,
                expected_size=size,
                skip_if_exists=True,
            )
        except BaseException as e:
            err_box[0] = e

    def _do_copy() -> None:
        try:
            rows_box[0] = load_file(
                conn,
                entity_map=entity_map,
                file_obj=io.BytesIO(payload),
                file_label=row.remote_path.rsplit("/", 1)[-1],
            )
            conn.commit()
        except BaseException as e:
            try:
                conn.rollback()
            except BaseException:
                pass
            err_box[1] = e

    t_s3 = threading.Thread(target=_do_s3, name="s3")
    t_copy = threading.Thread(target=_do_copy, name="copy")
    t_s3.start()
    t_copy.start()
    t_s3.join()
    t_copy.join()

    if err_box[0] is not None:
        _mark(conn, row, status="failed", error=f"s3: {err_box[0]}")
        raise err_box[0]
    if err_box[1] is not None:
        _mark(conn, row, status="failed", error=f"copy: {err_box[1]}")
        raise err_box[1]

    _mark(
        conn,
        row,
        status="loaded",
        rows=rows_box[0],
        s3_uri=s3_uri_box[0],
    )
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
        cur.execute(
            f"""
            SELECT entity, remote_path, data_date
              FROM ookla_catalog
             WHERE {where_date} AND status = ANY(%s)
               AND attempts < %s
               AND (NOT %s OR entity <> %s)
               AND {clause}
             ORDER BY entity, remote_path
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
