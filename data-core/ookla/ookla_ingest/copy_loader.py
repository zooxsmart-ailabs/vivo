from __future__ import annotations

import json
import logging
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
    file_path: Path,
) -> int:
    """Carrega parquet -> tabela alvo via COPY direto.

    Robustez:
      - Colunas extras no parquet (sem correspondência) são descartadas.
      - String "[ip1, ip2, ...]" é convertida pra primeiro IP quando target é inet.
      - Linhas com NULL em coluna NOT NULL são descartadas (logged).
      - Listas <list> viram JSON string.
    """
    pf = pq.ParquetFile(file_path)
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
            file_path.name,
            len(dropped),
            target_table,
            ", ".join(dropped[:8]) + (" ..." if len(dropped) > 8 else ""),
        )
    if not keep_src:
        log.error("nenhuma coluna em comum entre %s e %s", file_path.name, target_table)
        return 0

    col_idents = sql.SQL(", ").join(sql.SQL(c) for c in keep_target)
    copy_sql = sql.SQL("COPY {tgt} ({cols}) FROM STDIN").format(
        tgt=sql.SQL(target_table), cols=col_idents
    )

    total_in = 0
    total_out = 0
    skipped_null = 0
    with conn.cursor() as cur, cur.copy(copy_sql) as copy:
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
                total_out += 1

    if skipped_null:
        log.warning(
            "%s: %d linha(s) descartadas por NULL em coluna NOT NULL",
            file_path.name,
            skipped_null,
        )
    log.info(
        "%s: %d/%d linhas inseridas em %s",
        file_path.name,
        total_out,
        total_in,
        target_table,
    )
    return int(total_out)


# ---------------------------------------------------------------------------
# Coerção valor parquet -> valor aceito pelo COPY
# ---------------------------------------------------------------------------


def _coerce(value: Any, meta: TargetMeta) -> Any:
    if value is None:
        return None
    # listas (parquet list<>) → JSON string (cabe em text/varchar)
    if isinstance(value, list):
        return json.dumps(value, default=_json_default, ensure_ascii=False)
    # timestamps sem tz vêm como datetime naive — interpretamos UTC
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    # `_inet` = inet[] no Postgres. Ookla manda string "[ip1, ip2]"
    # — convertemos pro array literal do Postgres "{ip1,ip2}".
    if isinstance(value, str) and meta.udt == "_inet":
        return _str_to_pg_inet_array(value)
    # String vazia em coluna não-text vira NULL (Postgres rejeita "" em datas/numbers).
    if isinstance(value, str) and value == "" and meta.udt not in ("text", "varchar", "bpchar"):
        return None
    return value


def _str_to_pg_inet_array(value: str) -> str | None:
    """Converte "[ip1, ip2]" (formato Ookla) em "{ip1,ip2}" (literal Postgres
    de array de inet). Devolve None para string vazia."""
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
    """{column_name: TargetMeta(udt, nullable)} para a tabela alvo."""
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


def _unquote(ident: str) -> str:
    if ident.startswith('"') and ident.endswith('"'):
        return ident[1:-1]
    return ident
