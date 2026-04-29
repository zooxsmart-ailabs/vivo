from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from psycopg import Connection

from .api_client import OoklaApiClient
from .copy_loader import load_file
from .db import close_run, connect, open_run
from .downloader import download, local_path_for, purge
from .path_parser import TARGET_ENTITIES, parse
from .s3_uploader import S3Uploader, s3_key_for
from .schema import ENTITIES
from .settings import settings

log = logging.getLogger(__name__)

LATENCY_ENTITY = "QoELatency"


@dataclass(frozen=True, slots=True)
class CatalogRow:
    entity: str
    remote_path: str
    data_date: date | None


def run_load(
    *,
    max_days: int | None = None,
    retry_failed: bool = False,
    include_latency: bool = False,
    latency_days: int = 1,
) -> dict[str, Any]:
    """Fase 2: itera dia-a-dia.

    Para cada arquivo (em ordem por dia):
      1. Download local
      2. Upload para S3 (todos os arquivos, inclusive entidades fora do alvo)
      3. COPY para Postgres (apenas entidades alvo)
      4. Delete local

    QoELatency e opt-in (`include_latency=True`) com cap de `latency_days`
    dias — o resto das 5 entidades alvo carrega sempre.
    """
    stats: dict[str, Any] = {
        "days_processed": 0,
        "files_uploaded": 0,
        "files_loaded": 0,
        "files_failed": 0,
        "rows_loaded": 0,
        "include_latency": include_latency,
        "latency_days": latency_days if include_latency else 0,
    }

    uploader = S3Uploader()

    with connect() as conn:
        run_id = open_run(conn, phase="load")
        log.info(
            "ookla load run_id=%d iniciado (latency=%s, max_days=%s)",
            run_id,
            f"{latency_days}d" if include_latency else "off",
            max_days,
        )
        try:
            allowed_latency_days = _pick_latency_days(
                conn, latency_days if include_latency else 0
            )
            log.info("dias de QoELatency permitidos: %s", sorted(map(str, allowed_latency_days)))

            days = _pending_days(conn, retry_failed=retry_failed)
            if max_days is not None:
                days = days[:max_days]
            log.info("dias pendentes: %d", len(days))

            for day_idx, day in enumerate(days, 1):
                log.info("[dia %d/%d] %s", day_idx, len(days), day)
                files = _files_for_day(
                    conn,
                    day,
                    retry_failed=retry_failed,
                    allowed_latency_days=allowed_latency_days,
                )
                if not files:
                    continue

                downloaded = _download_day(conn, files)
                for row, local in downloaded:
                    success, rows, err = _process_one(conn, uploader, row, local)
                    if success:
                        stats["files_uploaded"] += 1
                        if row.entity in TARGET_ENTITIES and rows > 0:
                            stats["files_loaded"] += 1
                            stats["rows_loaded"] += rows
                    else:
                        stats["files_failed"] += 1
                        _mark(conn, row, status="failed", error=err)

                stats["days_processed"] += 1

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


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


def _pick_latency_days(conn: Connection, n_days: int) -> set[date]:
    """Devolve os primeiros N dias (em ordem cronologica) de QoELatency
    que ainda nao foram carregados. Usa a data_date do catalogo."""
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


def _pending_days(conn: Connection, *, retry_failed: bool) -> list[date | None]:
    """Devolve dias com arquivos pendentes. None vem por último (undated bucket)."""
    pending_statuses = (
        ("catalogued", "downloaded", "uploaded", "failed")
        if retry_failed
        else ("catalogued", "downloaded", "uploaded")
    )
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT data_date FROM ookla_catalog
             WHERE status = ANY(%s) AND attempts < %s
               AND data_date IS NOT NULL
             ORDER BY data_date
            """,
            (list(pending_statuses), settings.OOKLA_MAX_ATTEMPTS),
        )
        days: list[date | None] = [r[0] for r in cur.fetchall()]
        cur.execute(
            """
            SELECT EXISTS(
              SELECT 1 FROM ookla_catalog
               WHERE data_date IS NULL AND status = ANY(%s) AND attempts < %s
            )
            """,
            (list(pending_statuses), settings.OOKLA_MAX_ATTEMPTS),
        )
        if cur.fetchone()[0]:
            days.append(None)
        return days


def _files_for_day(
    conn: Connection,
    day: date | None,
    *,
    retry_failed: bool,
    allowed_latency_days: set[date],
) -> list[CatalogRow]:
    pending_statuses = (
        ("catalogued", "downloaded", "uploaded", "failed")
        if retry_failed
        else ("catalogued", "downloaded", "uploaded")
    )
    skip_latency = day is None or day not in allowed_latency_days
    where_date = "data_date IS NULL" if day is None else "data_date = %s"
    params: list[Any] = []
    if day is not None:
        params.append(day)
    params += [list(pending_statuses), settings.OOKLA_MAX_ATTEMPTS, skip_latency, LATENCY_ENTITY]
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT entity, remote_path, data_date
              FROM ookla_catalog
             WHERE {where_date} AND status = ANY(%s)
               AND attempts < %s
               AND (NOT %s OR entity <> %s)
             ORDER BY entity, remote_path
            """,
            params,
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


# ---------------------------------------------------------------------------
# Per-file pipeline
# ---------------------------------------------------------------------------


def _download_day(
    conn: Connection, files: list[CatalogRow]
) -> list[tuple[CatalogRow, Path]]:
    """Baixa em paralelo. Retorna apenas os que baixaram com sucesso."""
    out: list[tuple[CatalogRow, Path]] = []
    with OoklaApiClient() as api:
        with ThreadPoolExecutor(max_workers=settings.OOKLA_PARALLEL_DOWNLOADS) as pool:
            futures = {pool.submit(_download_one, api, row): row for row in files}
            for fut in as_completed(futures):
                row = futures[fut]
                try:
                    local = fut.result()
                except Exception as exc:
                    log.exception("falha no download de %s", row.remote_path)
                    _mark(conn, row, status="failed", error=f"download: {exc}")
                    continue
                _mark(conn, row, status="downloaded")
                out.append((row, local))
    return out


def _download_one(api: OoklaApiClient, row: CatalogRow) -> Path:
    with connect() as c:
        _mark(c, row, status="downloading")
    return download(api, row.remote_path)


def _process_one(
    conn: Connection,
    uploader: S3Uploader,
    row: CatalogRow,
    local: Path,
) -> tuple[bool, int, str | None]:
    """Para 1 arquivo: S3 upload -> Postgres COPY (se target) -> delete local."""
    parsed = parse(row.remote_path)
    if parsed is None:
        return False, 0, f"path nao parseavel: {row.remote_path}"

    # 1. S3 upload (sempre)
    try:
        _mark(conn, row, status="uploading")
        key = s3_key_for(row.remote_path, parsed)
        s3_uri = uploader.upload(local, key)
        _mark(conn, row, status="uploaded", s3_uri=s3_uri)
    except Exception as exc:
        log.exception("falha S3 upload: %s", row.remote_path)
        purge(row.remote_path)
        return False, 0, f"s3: {exc}"

    # 2. Postgres COPY (somente entidades alvo)
    rows_loaded = 0
    if row.entity in TARGET_ENTITIES:
        entity_map = ENTITIES.get(row.entity)
        if entity_map is None:
            log.warning("entidade alvo sem mapeamento de schema: %s", row.entity)
        else:
            try:
                _mark(conn, row, status="loading")
                rows_loaded = load_file(
                    conn, entity_map=entity_map, file_path=local
                )
                conn.commit()
                _mark(conn, row, status="loaded", rows=rows_loaded)
            except Exception as exc:
                conn.rollback()
                log.exception(
                    "falha COPY %s -> %s", local.name, entity_map.table
                )
                purge(row.remote_path)
                return False, 0, f"copy: {exc}"
    else:
        # Entidade fora do alvo: upload S3 ja conta como "loaded" para fins de
        # status (nao ha mais nada a fazer no Postgres).
        _mark(conn, row, status="loaded")

    # 3. Sempre deleta o bruto local (compromisso com a especificacao do user).
    purge(row.remote_path)
    return True, rows_loaded, None
