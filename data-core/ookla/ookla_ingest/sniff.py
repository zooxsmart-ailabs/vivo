from __future__ import annotations

import logging
from pathlib import Path

import pyarrow.parquet as pq

from .api_client import OoklaApiClient
from .db import connect
from .downloader import download
from .path_parser import TARGET_ENTITIES, parse
from .schema import ENTITIES

log = logging.getLogger(__name__)

ROOT_PREFIXES = ("Performance", "ConsumerQoE")


def sniff_entity(
    entity: str,
    *,
    sample_rows: int = 5,
    use_catalog: bool = True,
) -> Path:
    """Baixa 1 arquivo da entidade e imprime schema parquet + amostra.

    Por padrão usa o catálogo (`ookla_catalog`) para escolher o menor arquivo
    da entidade — mais rápido que walk completo e útil pra entidades com
    arquivos grandes (QoE).
    """
    if entity not in TARGET_ENTITIES:
        raise ValueError(
            f"entidade nao suportada: {entity}. Use uma de {sorted(TARGET_ENTITIES)}"
        )

    target = _pick_target(entity, use_catalog=use_catalog)
    if target is None:
        raise RuntimeError(f"nenhum arquivo encontrado para {entity}")

    log.info("sniff: baixando %s", target)
    with OoklaApiClient() as api:
        local = download(api, target)

    _print_report(entity, local, sample_rows=sample_rows)
    return local


def _pick_target(entity: str, *, use_catalog: bool) -> str | None:
    if use_catalog:
        with connect() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT remote_path FROM ookla_catalog "
                "WHERE entity = %s::ookla_entity "
                "ORDER BY file_size NULLS LAST LIMIT 1",
                (entity,),
            )
            row = cur.fetchone()
            if row:
                return row[0]
    # Fallback: walk até achar o primeiro
    with OoklaApiClient() as api:
        for entry in api.walk(ROOT_PREFIXES):
            parsed = parse(entry.remote_path)
            if parsed and parsed.entity == entity:
                return entry.remote_path
    return None


def _print_report(entity: str, path: Path, *, sample_rows: int) -> None:
    pf = pq.ParquetFile(path)
    print(f"\n=== sniff: {entity} | {path.name} ===")
    print(f"size: {path.stat().st_size:,} bytes")
    print(f"rows: {pf.metadata.num_rows:,}  row_groups: {pf.metadata.num_row_groups}")
    print(f"colunas: {len(pf.schema_arrow.names)}\n")

    print("schema parquet:")
    for i, field in enumerate(pf.schema_arrow, 1):
        print(f"  {i:3d}. {field.name:50s} {field.type}")

    table_cols = _target_table_columns(entity)
    if table_cols is not None:
        parquet_cols = set(pf.schema_arrow.names)
        only_pq = sorted(parquet_cols - table_cols)
        only_db = sorted(table_cols - parquet_cols)
        common = parquet_cols & table_cols
        print(
            f"\ncomparativo vs tabela alvo: comuns={len(common)}  "
            f"so-no-parquet={len(only_pq)}  so-na-tabela={len(only_db)}"
        )
        if only_pq:
            print("  só no parquet (precisa adicionar à tabela):")
            for c in only_pq:
                print(f"    + {c}")
        if only_db:
            print("  só na tabela (presentes em CSV legado, não em parquet):")
            for c in only_db:
                print(f"    - {c}")

    if sample_rows > 0:
        print(f"\namostra (primeiras {sample_rows} linhas, primeiras 6 colunas):")
        batch = next(pf.iter_batches(batch_size=sample_rows))
        cols = batch.schema.names[:6]
        for r_idx in range(min(sample_rows, batch.num_rows)):
            vals = [
                _short(batch.column(c)[r_idx].as_py()) for c in cols
            ]
            print("  " + " | ".join(vals))


def _target_table_columns(entity: str) -> set[str] | None:
    """Devolve o conjunto de colunas (em snake_case) da tabela alvo.

    Retorna None se a tabela ainda não existe.
    """
    em = ENTITIES.get(entity)
    if em is None:
        return None
    table = em.table.strip('"')
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s)", (table,))
        reg = cur.fetchone()
        if not reg or reg[0] is None:
            return None
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = current_schema() AND table_name = %s",
            (table,),
        )
        cols = {r[0] for r in cur.fetchall()}
    if em.case == "snake":
        return cols
    # camelCase → snake_case para comparar com nomes do parquet
    import re as _re

    boundary = _re.compile(r"(?<!^)(?=[A-Z])")
    return {boundary.sub("_", c).lower() for c in cols}


def _short(v: object) -> str:
    s = str(v)
    return s if len(s) <= 30 else s[:27] + "..."
