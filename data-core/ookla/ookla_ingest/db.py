from __future__ import annotations

import json
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg import Connection

from .settings import settings


@contextmanager
def connect() -> Iterator[Connection]:
    conn = psycopg.connect(settings.db_dsn, autocommit=False)
    try:
        # Sessions que fazem COPY de muitos milhões de linhas em hypertables
        # estouram o local buffer pool default (8MB) — Timescale abre uma
        # relação por chunk. Subir temp_buffers e work_mem pra acomodar.
        with conn.cursor() as cur:
            cur.execute("SET temp_buffers = '1GB'")
            cur.execute("SET work_mem = '256MB'")
            cur.execute("SET maintenance_work_mem = '512MB'")
        conn.commit()
        yield conn
    finally:
        conn.close()


def open_run(conn: Connection, phase: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO ookla_run (phase) VALUES (%s) RETURNING id",
            (phase,),
        )
        row = cur.fetchone()
        assert row is not None
        run_id = int(row[0])
    conn.commit()
    return run_id


def close_run(
    conn: Connection,
    run_id: int,
    *,
    status: str,
    stats: dict[str, Any] | None = None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE ookla_run
               SET finished_at = NOW(),
                   status      = %s,
                   stats_json  = %s::jsonb
             WHERE id = %s
            """,
            (status, json.dumps(stats) if stats else None, run_id),
        )
    conn.commit()
