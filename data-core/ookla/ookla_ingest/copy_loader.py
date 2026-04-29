from __future__ import annotations

import json
import logging
import os
import threading
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, NamedTuple

import pyarrow as pa
import pyarrow.parquet as pq
from psycopg import Connection, sql

from .schema import EntityMap, column_for_target

log = logging.getLogger(__name__)

_BATCH_ROWS = 50_000


class TargetMeta(NamedTuple):
    udt: str          # ex.: 'text', 'inet', 'int4', 'timestamptz'
    nullable: bool    # is_nullable=='YES'


def load_file(
    conn: Connection,
    *,
    entity_map: EntityMap,
    file_path: Path | None = None,
    file_obj: Any | None = None,
    file_label: str | None = None,
) -> int:
    """Carrega parquet → tabela alvo via staging UNLOGGED + UPSERT.

    Estratégia:
      1. CREATE UNLOGGED TABLE _stg_... (LIKE target INCLUDING DEFAULTS) — vive
         em shared_buffers (sem o limite de temp_buffers que estourava antes).
      2. COPY parquet → staging (rápido, sem chunk routing do hypertable).
      3. Se o alvo tem unique index cobrindo `entity_map.key`:
            INSERT INTO target SELECT FROM staging ON CONFLICT (key) DO NOTHING
         caso contrário (sem unique):
            INSERT INTO target SELECT FROM staging
      4. DROP staging.

    Robustez:
      - Colunas extras no parquet (sem correspondência) são descartadas.
      - String "[ip1, ip2, ...]" em alvo `_inet` → literal Postgres `{ip1,ip2}`.
      - Linhas com NULL em coluna NOT NULL são descartadas (logged).
      - Listas <list> viram JSON string para colunas text.
    """
    if file_path is None and file_obj is None:
        raise ValueError("file_path ou file_obj obrigatorio")
    label = file_label or (file_path.name if file_path else "<bytesio>")
    source = file_obj if file_obj is not None else file_path
    pf = pq.ParquetFile(source)
    pq_schema = pf.schema_arrow
    pq_cols = pq_schema.names

    target_table = entity_map.table  # já vem quoted se camelCase
    target_meta = _fetch_target_meta(conn, _unquote(target_table))

    keep_src: list[str] = []
    keep_target: list[str] = []
    keep_meta: list[TargetMeta] = []
    dropped: list[str] = []

    for src_name in pq_cols:
        target_name = column_for_target(src_name, entity_map.case)
        normalized = _unquote(target_name)
        meta = target_meta.get(normalized)
        if meta is not None:
            keep_src.append(src_name)
            keep_target.append(target_name)
            keep_meta.append(meta)
        else:
            dropped.append(src_name)

    if dropped:
        log.warning(
            "%s: %d coluna(s) parquet sem correspondência em %s — descartadas: %s",
            label,
            len(dropped),
            target_table,
            ", ".join(dropped[:8]) + (" ..." if len(dropped) > 8 else ""),
        )
    if not keep_src:
        log.error("nenhuma coluna em comum entre %s e %s", label, target_table)
        return 0

    has_unique = _target_has_unique_on(
        conn, _unquote(target_table), tuple(_unquote(c) for c in entity_map.key)
    )

    stg_name = (
        f"_stg_ookla_{os.getpid()}_{threading.get_ident():x}_"
        f"{abs(hash(label)) & 0xffffffff:x}"
    )
    stg_ident = sql.Identifier(stg_name)
    target_sql = sql.SQL(target_table)
    col_idents = sql.SQL(", ").join(sql.SQL(c) for c in keep_target)

    total_in = 0
    total_staged = 0
    skipped_null = 0
    rows_inserted = 0

    with conn.cursor() as cur:
        cur.execute(sql.SQL("DROP TABLE IF EXISTS {stg}").format(stg=stg_ident))
        cur.execute(
            sql.SQL(
                "CREATE UNLOGGED TABLE {stg} (LIKE {tgt} INCLUDING DEFAULTS)"
            ).format(stg=stg_ident, tgt=target_sql)
        )

        try:
            copy_sql = sql.SQL("COPY {stg} ({cols}) FROM STDIN").format(
                stg=stg_ident, cols=col_idents
            )
            with cur.copy(copy_sql) as copy:
                for batch in pf.iter_batches(batch_size=_BATCH_ROWS, columns=keep_src):
                    py_columns = [batch.column(name).to_pylist() for name in keep_src]
                    n = batch.num_rows
                    total_in += n
                    for r in range(n):
                        row: list[Any] = []
                        drop_row = False
                        for c in range(len(keep_src)):
                            val = _coerce(py_columns[c][r], keep_meta[c])
                            if val is None and not keep_meta[c].nullable:
                                drop_row = True
                                break
                            row.append(val)
                        if drop_row:
                            skipped_null += 1
                            continue
                        copy.write_row(row)
                        total_staged += 1

            # UPSERT staging → target. ON CONFLICT DO NOTHING (sem target
            # explicito) lida com qualquer unique index que exista no alvo,
            # incluindo indices parciais (ex.: WHERE guid_result IS NOT NULL).
            if has_unique:
                cur.execute(
                    sql.SQL(
                        "INSERT INTO {tgt} ({cols}) "
                        "SELECT {cols} FROM {stg} "
                        "ON CONFLICT DO NOTHING"
                    ).format(tgt=target_sql, cols=col_idents, stg=stg_ident)
                )
            else:
                cur.execute(
                    sql.SQL(
                        "INSERT INTO {tgt} ({cols}) SELECT {cols} FROM {stg}"
                    ).format(tgt=target_sql, cols=col_idents, stg=stg_ident)
                )
            rows_inserted = cur.rowcount or 0
        finally:
            cur.execute(sql.SQL("DROP TABLE IF EXISTS {stg}").format(stg=stg_ident))

    if skipped_null:
        log.warning(
            "%s: %d linha(s) descartadas por NULL em coluna NOT NULL",
            label,
            skipped_null,
        )
    skipped_dup = total_staged - rows_inserted if has_unique else 0
    extra = f" ({skipped_dup} duplicatas pulou via ON CONFLICT)" if skipped_dup else ""
    log.info(
        "%s: parquet=%d staging=%d inseridas=%d em %s%s",
        label,
        total_in,
        total_staged,
        rows_inserted,
        target_table,
        extra,
    )
    return int(rows_inserted)


# ---------------------------------------------------------------------------
# Coerção valor parquet -> valor aceito pelo COPY
# ---------------------------------------------------------------------------


def _coerce(value: Any, meta: TargetMeta) -> Any:
    if value is None:
        return None
    if isinstance(value, list):
        return json.dumps(value, default=_json_default, ensure_ascii=False)
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and meta.udt == "_inet":
        return _str_to_pg_inet_array(value)
    if isinstance(value, str) and value == "" and meta.udt not in ("text", "varchar", "bpchar"):
        return None
    return value


def _str_to_pg_inet_array(value: str) -> str | None:
    s = value.strip()
    if not s:
        return None
    if s.startswith("[") and s.endswith("]"):
        s = s[1:-1]
    parts = [p.strip().strip('"').strip("'") for p in s.split(",")]
    parts = [p for p in parts if p]
    if not parts:
        return None
    return "{" + ",".join(parts) + "}"


def _json_default(o: Any) -> Any:
    if isinstance(o, Decimal):
        return str(o)
    if isinstance(o, datetime):
        return o.isoformat()
    if isinstance(o, bytes):
        return o.hex()
    raise TypeError(f"nao serializavel: {type(o)}")


# ---------------------------------------------------------------------------
# Metadata helpers
# ---------------------------------------------------------------------------


def _fetch_target_meta(conn: Connection, table_name: str) -> dict[str, TargetMeta]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name, udt_name, is_nullable
              FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = %s
            """,
            (table_name,),
        )
        return {
            r[0]: TargetMeta(udt=r[1], nullable=(r[2] == "YES"))
            for r in cur.fetchall()
        }


def _target_has_unique_on(
    conn: Connection, table_name: str, columns: tuple[str, ...]
) -> bool:
    """Devolve True se existir unique index/constraint cujo conjunto de colunas
    EXATO seja `columns` (ordem irrelevante)."""
    if not columns:
        return False
    want = set(columns)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT array_agg(a.attname ORDER BY a.attnum)
              FROM pg_index i
              JOIN pg_class c ON c.oid = i.indrelid
              JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
             WHERE c.relname = %s AND i.indisunique
             GROUP BY i.indexrelid
            """,
            (table_name,),
        )
        for (cols,) in cur.fetchall():
            if set(cols) == want:
                return True
    return False


def _unquote(ident: str) -> str:
    if ident.startswith('"') and ident.endswith('"'):
        return ident[1:-1]
    return ident
