from __future__ import annotations

import logging
from typing import Any

from psycopg import Connection

from .api_client import FileEntry, OoklaApiClient
from .db import close_run, connect, open_run
from .path_parser import TARGET_ENTITIES, parse

log = logging.getLogger(__name__)


def run_catalog() -> dict[str, Any]:
    """Fase 1: caminha pela API e popula `ookla_catalog`. Não baixa nada.

    Cataloga TODAS as entidades expostas pela API (não só Performance/ConsumerQoE),
    para que o uploader S3 envie tudo. O loader Postgres filtra para as
    entidades alvo.
    """
    stats: dict[str, Any] = {
        "scanned": 0,
        "ignored": 0,
        "by_entity": {},
        "inserted": 0,
        "updated": 0,
    }

    with connect() as conn:
        run_id = open_run(conn, phase="catalog")
        log.info("ookla catalog run_id=%d iniciado", run_id)
        try:
            with OoklaApiClient() as api:
                # Sem prefixes => percorre tudo a partir da raiz
                for entry in api.walk():
                    stats["scanned"] += 1
                    parsed = parse(entry.remote_path)
                    if parsed is None:
                        stats["ignored"] += 1
                        continue
                    by_entity = stats["by_entity"].setdefault(
                        parsed.entity,
                        {"files": 0, "min_date": None, "max_date": None, "target": parsed.entity in TARGET_ENTITIES},
                    )
                    by_entity["files"] += 1
                    if parsed.data_date is not None:
                        iso = parsed.data_date.isoformat()
                        if by_entity["min_date"] is None or iso < by_entity["min_date"]:
                            by_entity["min_date"] = iso
                        if by_entity["max_date"] is None or iso > by_entity["max_date"]:
                            by_entity["max_date"] = iso

                    inserted = _upsert_entry(conn, entry, parsed)
                    if inserted:
                        stats["inserted"] += 1
                    else:
                        stats["updated"] += 1

                    if stats["scanned"] % 500 == 0:
                        conn.commit()
                        log.info(
                            "  catalogados=%d (com data=%d)",
                            stats["scanned"],
                            stats["scanned"] - stats["ignored"],
                        )

            conn.commit()
            close_run(conn, run_id, status="ok", stats=stats)
            log.info("ookla catalog run_id=%d concluido: %s", run_id, _summary(stats))
        except Exception as exc:
            conn.rollback()
            close_run(
                conn,
                run_id,
                status="failed",
                stats={**stats, "error": str(exc)},
            )
            raise

    return stats


def _upsert_entry(conn: Connection, entry: FileEntry, parsed: Any) -> bool:
    """UPSERT no ookla_catalog. Retorna True se inseriu (linha nova)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ookla_catalog (
                entity, data_date, remote_path, file_name,
                file_size, remote_mtime, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'catalogued')
            ON CONFLICT (entity, remote_path) DO UPDATE
               SET file_size    = EXCLUDED.file_size,
                   remote_mtime = EXCLUDED.remote_mtime,
                   status       = CASE
                                    WHEN ookla_catalog.status
                                       IN ('loaded','loading','uploaded','uploading',
                                           'downloaded','downloading')
                                    THEN ookla_catalog.status
                                    ELSE 'catalogued'
                                  END
             RETURNING (xmax = 0) AS inserted
            """,
            (
                parsed.entity,
                parsed.data_date,
                entry.remote_path,
                entry.name,
                entry.size,
                entry.mtime,
            ),
        )
        row = cur.fetchone()
        return bool(row and row[0])


def _summary(stats: dict[str, Any]) -> str:
    parts = [
        f"scanned={stats['scanned']}",
        f"ignored={stats['ignored']}",
        f"inserted={stats['inserted']}",
        f"updated={stats['updated']}",
    ]
    for ent in sorted(stats["by_entity"].keys()):
        info = stats["by_entity"][ent]
        flag = "*" if info.get("target") else " "
        if info["min_date"]:
            parts.append(
                f"{flag}{ent}={info['files']}({info['min_date']}->{info['max_date']})"
            )
        else:
            parts.append(f"{flag}{ent}={info['files']}")
    return " ".join(parts)


def print_status() -> None:
    """Imprime visão consolidada do estado do catálogo."""
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT entity, status, COUNT(*) AS n,
                   MIN(data_date) AS min_d, MAX(data_date) AS max_d,
                   SUM(rows_loaded) AS rows
              FROM ookla_catalog
             GROUP BY entity, status
             ORDER BY entity, status
            """
        )
        rows = cur.fetchall()

    if not rows:
        print("ookla_catalog vazio. Rode `catalog` primeiro.")
        return

    by_entity: dict[str, list[tuple]] = {}
    for entity, status, n, min_d, max_d, rows_loaded in rows:
        by_entity.setdefault(entity, []).append(
            (status, n, min_d, max_d, rows_loaded)
        )

    for entity, lines in by_entity.items():
        total = sum(c for _, c, *_ in lines)
        print(f"\n{entity}  (total={total})")
        for status, n, min_d, max_d, rows_loaded in lines:
            extra = f" rows_loaded={rows_loaded}" if rows_loaded else ""
            print(f"  {status:12s} {n:8d}  {min_d}..{max_d}{extra}")

    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, phase, started_at, finished_at, status, stats_json"
            " FROM ookla_run ORDER BY started_at DESC LIMIT 5"
        )
        runs = cur.fetchall()
    if runs:
        print("\nUltimas 5 execucoes:")
        for r in runs:
            print(
                f"  #{r[0]:5d} {r[1]:7s} {r[2]} -> {r[3] or 'em andamento':>26} "
                f"status={r[4]}"
            )
