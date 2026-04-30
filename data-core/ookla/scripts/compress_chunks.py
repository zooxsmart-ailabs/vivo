"""Comprime chunks pre-cutoff em hypertables que JA TEM compression habilitada.

Importante: NAO faz ALTER TABLE. ALTER pega AccessExclusiveLock e fica em
fila atras de qualquer INSERT em andamento — em pipeline de ingest continuo
trava por horas. Habilitacao deve ser feita em janela de manutencao.

Cada chunk tem `compress_chunk()` independente; usamos lock_timeout pra que
um chunk com tx em andamento nao bloqueie a fila inteira.
"""
import os
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import psycopg

WORKERS = 4
CUTOFF = "2026-03-15"
LOCK_TIMEOUT_MS = 30_000  # 30s — chunk pre-cutoff nao deveria estar em INSERT
STATEMENT_TIMEOUT_MS = 30 * 60 * 1000  # 30min p/ chunks grandes
TARGETS = ["file_transfer", "video"]


def dsn() -> str:
    return (
        f'host={os.environ["DB_HOST"]} port={os.environ.get("DB_PORT",5432)} '
        f'dbname={os.environ["DB_NAME"]} user={os.environ["DB_USER"]} '
        f'password={os.environ["DB_PASSWORD"]}'
    )


def list_eligible(conn: psycopg.Connection, tbl: str, cutoff: str) -> list[tuple[str, str, int]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT chunk_schema, chunk_name,
                   pg_total_relation_size((quote_ident(chunk_schema)||'.'||quote_ident(chunk_name))::regclass)
              FROM timescaledb_information.chunks
             WHERE hypertable_name = %s
               AND NOT is_compressed
               AND range_end <= %s::timestamptz
             ORDER BY range_start
            """,
            (tbl, cutoff),
        )
        return cur.fetchall()


def compress_one(schema: str, name: str, size_b: int) -> tuple[str, float, int, str]:
    full = f"{schema}.{name}"
    t0 = time.monotonic()
    try:
        with psycopg.connect(dsn(), autocommit=True) as c, c.cursor() as cur:
            cur.execute(f"SET lock_timeout = '{LOCK_TIMEOUT_MS}ms'")
            cur.execute(f"SET statement_timeout = '{STATEMENT_TIMEOUT_MS}ms'")
            cur.execute("SELECT compress_chunk(%s)", (full,))
            cur.fetchone()
        return (full, time.monotonic() - t0, size_b, "OK")
    except Exception as e:
        return (full, time.monotonic() - t0, size_b, f"FAIL: {type(e).__name__}: {e}")


def main() -> None:
    print(f"compress: cutoff={CUTOFF}, targets={TARGETS}, workers={WORKERS}", flush=True)
    setup = psycopg.connect(dsn(), autocommit=True)

    queue: list[tuple[str, str, int]] = []
    total_bytes = 0
    for tbl in TARGETS:
        items = list_eligible(setup, tbl, CUTOFF)
        sz = sum(b for _, _, b in items)
        total_bytes += sz
        print(f"[{tbl}] {len(items)} chunks elegiveis ({sz/1024**3:.2f} GB)", flush=True)
        queue.extend(items)
    setup.close()

    if not queue:
        print("nada pra comprimir.", flush=True)
        return

    print(
        f"\nIniciando: {len(queue)} chunks, {total_bytes/1024**3:.2f} GB brutos, "
        f"{WORKERS} workers em paralelo",
        flush=True,
    )
    t0 = time.monotonic()
    done_bytes = 0
    done_lock = threading.Lock()

    with ThreadPoolExecutor(max_workers=WORKERS, thread_name_prefix="cmp") as pool:
        futs = [pool.submit(compress_one, s, n, b) for s, n, b in queue]
        for fut in as_completed(futs):
            full, dur, sz, status = fut.result()
            with done_lock:
                done_bytes += sz
                pct = done_bytes / total_bytes * 100
            print(
                f"[{status[:40]}] {full:55} {dur:6.1f}s  "
                f"({sz/1024**2:>7.0f} MB raw)  prog={pct:5.1f}%",
                flush=True,
            )

    elapsed = time.monotonic() - t0
    print(f"\nFIM: {len(queue)} chunks em {elapsed:.0f}s ({elapsed/60:.1f}min)", flush=True)


if __name__ == "__main__":
    main()
