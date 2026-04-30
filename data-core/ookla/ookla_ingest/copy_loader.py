from __future__ import annotations

import ipaddress
import json
import logging
import os
import random
import threading
import time
from contextlib import nullcontext
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Callable, NamedTuple

import pyarrow as pa
import pyarrow.parquet as pq
from psycopg import Connection, sql
from psycopg.errors import DeadlockDetected, SerializationFailure

from . import telemetry
from .schema import EntityMap, column_for_target
from .settings import settings

log = logging.getLogger(__name__)

_BATCH_ROWS = 50_000
_MAX_DEADLOCK_RETRIES = 5

# COPY BINARY: serializa direto via dumpers binarios do psycopg, sem o custo
# de quoting/escaping do TEXT mode. 3-10x mais rapido em tabelas largas
# (qoe_latency tem 138 cols). set_types() mapeia cada coluna ao seu binary
# dumper; tipos nao-padrao como _inet exigem coercao especifica antes.
def _use_binary() -> bool:
    return settings.OOKLA_COPY_FORMAT == "binary"


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
    insert_lock: threading.Lock | None = None,
) -> int:
    """Carrega parquet → tabela alvo via staging UNLOGGED + UPSERT.

    Estratégia:
      1. CREATE UNLOGGED TABLE _stg_... (LIKE target INCLUDING DEFAULTS).
      2. COPY parquet → staging (sem lock, paralelo entre workers).
      3. Sob `insert_lock` (recomendado: per (entity, data_date)):
         INSERT INTO target SELECT FROM staging [ON CONFLICT ...] + commit.
         A lock so' precisa cobrir INSERT+commit (nao o COPY) — eh' o INSERT
         que toma chunk lock no hypertable; a staging por worker e' isolada.
      4. DROP staging (fora da lock, em tx separada).

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

    # Retry-on-deadlock: com a lock per (entity, data_date) deadlocks de chunk
    # nao deveriam ocorrer entre workers, mas mantemos como rede de seguranca
    # contra serialization anomalies do TimescaleDB ou contencao em CAGGs.
    last_err: BaseException | None = None
    for attempt in range(_MAX_DEADLOCK_RETRIES):
        # BytesIO precisa voltar pro inicio em retry; ParquetFile lê o footer
        # e também faz seeks no source.
        if hasattr(source, "seek"):
            source.seek(0)
        try:
            return _load_file_attempt(
                conn,
                entity_map=entity_map,
                source=source,
                label=label,
                insert_lock=insert_lock,
            )
        except (DeadlockDetected, SerializationFailure) as e:
            last_err = e
            try:
                conn.rollback()
            except Exception:
                pass
            telemetry.deadlock_retries_total.add(
                1, {"entity": entity_map.table, "attempt": attempt + 1}
            )
            sleep_for = min(0.5 * (2 ** attempt) + random.random(), 10.0)
            log.warning(
                "%s: deadlock/serialization, retry %d/%d em %.1fs",
                label,
                attempt + 1,
                _MAX_DEADLOCK_RETRIES,
                sleep_for,
            )
            time.sleep(sleep_for)
    assert last_err is not None
    raise last_err


def _load_file_attempt(
    conn: Connection,
    *,
    entity_map: EntityMap,
    source: Any,
    label: str,
    insert_lock: threading.Lock | None = None,
) -> int:
    pf = pq.ParquetFile(source)
    pq_schema = pf.schema_arrow
    pq_cols = pq_schema.names

    target_table = entity_map.table
    target_meta = _fetch_target_meta(conn, _unquote(target_table))

    keep_src: list[str] = []
    keep_target: list[str] = []
    keep_meta: list[TargetMeta] = []
    keep_pa_types: list[pa.DataType] = []
    dropped: list[str] = []

    for src_name in pq_cols:
        target_name = column_for_target(src_name, entity_map.case)
        normalized = _unquote(target_name)
        meta = target_meta.get(normalized)
        if meta is not None:
            keep_src.append(src_name)
            keep_target.append(target_name)
            keep_meta.append(meta)
            keep_pa_types.append(pq_schema.field(src_name).type)
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

    conflict_target = _conflict_target_for(
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
    rows_affected = 0

    use_binary = _use_binary()

    # Pre-constroi coercer por coluna: None = pass-through. Para o caso
    # mais comum (qoe_latency tem ~120 colunas numericas/bool em 138 totais)
    # eliminamos 6 isinstance() por celula vs. o _coerce monolitico antigo.
    coercers: list[Callable[[Any], Any] | None] = [
        _build_coercer(pq_t, meta, use_binary)
        for pq_t, meta in zip(keep_pa_types, keep_meta)
    ]
    not_null: list[bool] = [not meta.nullable for meta in keep_meta]
    ncols = len(keep_src)

    # Timing breakdown: cada estagio mede walltime separadamente. O log final
    # imprime ms por estagio + rows/s, dando visibilidade direta de onde o
    # tempo esta sendo gasto (staging COPY costuma ser segundos; o INSERT no
    # hypertable pode dominar com 10x+ por checagem de unique index + chunk
    # routing por linha).
    t_create = t_copy = t_insert = t_drop = 0.0
    t_lock_wait = 0.0
    copy_py_overhead = 0.0
    rows_per_sec_copy = 0.0
    rows_per_sec_insert = 0.0

    with conn.cursor() as cur:
        _t0 = time.monotonic()
        cur.execute(sql.SQL("DROP TABLE IF EXISTS {stg}").format(stg=stg_ident))
        cur.execute(
            sql.SQL(
                "CREATE UNLOGGED TABLE {stg} (LIKE {tgt} INCLUDING DEFAULTS)"
            ).format(stg=stg_ident, tgt=target_sql)
        )
        t_create = time.monotonic() - _t0

        format_clause = (
            sql.SQL(" WITH (FORMAT BINARY)") if use_binary else sql.SQL("")
        )
        copy_sql = sql.SQL("COPY {stg} ({cols}) FROM STDIN{fmt}").format(
            stg=stg_ident, cols=col_idents, fmt=format_clause
        )
        _t0 = time.monotonic()
        with cur.copy(copy_sql) as copy:
            if use_binary:
                # Diz ao psycopg quais binary dumpers usar por coluna —
                # numerico, timestamptz, _inet etc. ganham serializacao em C.
                # information_schema usa udt_name '_inet' para inet[];
                # registry do psycopg espera 'inet[]'. Mesmo padrao p/ outros
                # arrays (_text -> text[], _int4 -> int4[], ...).
                copy.set_types([_udt_for_psycopg(m.udt) for m in keep_meta])

            for batch in pf.iter_batches(batch_size=_BATCH_ROWS, columns=keep_src):
                py_columns = [batch.column(name).to_pylist() for name in keep_src]
                n = batch.num_rows
                total_in += n
                _py0 = time.monotonic()
                for r in range(n):
                    row: list[Any] = []
                    drop_row = False
                    for c in range(ncols):
                        v = py_columns[c][r]
                        coercer = coercers[c]
                        if coercer is not None:
                            v = coercer(v)
                        if v is None and not_null[c]:
                            drop_row = True
                            break
                        row.append(v)
                    if drop_row:
                        skipped_null += 1
                        continue
                    copy.write_row(row)
                    total_staged += 1
                copy_py_overhead += time.monotonic() - _py0
        t_copy = time.monotonic() - _t0
        if t_copy > 0:
            rows_per_sec_copy = total_staged / t_copy

        # INSERT staging → target — sob a lock per (entity, data_date).
        #
        # Por que a lock so' aqui (e nao no CREATE/COPY): o INSERT toma chunk
        # lock no hypertable; dois workers no MESMO chunk colidem em deadlock.
        # CREATE/COPY operam em UNLOGGED tables com nomes unicos por worker
        # (pid+tid+hash) — zero contencao. Soltar a lock fora do INSERT
        # encurta o critical path: 4 workers podem fazer COPY em paralelo
        # mesmo dentro do mesmo (entity, data_date), serializando apenas o
        # INSERT.
        #
        # commit() PRECISA ficar dentro da lock — soltar antes do commit
        # libera outros workers que iniciam INSERT no mesmo chunk com tx
        # ainda em aberto desta = volta o cenario de deadlock.
        _wt0 = time.monotonic()
        lock_cm = insert_lock if insert_lock is not None else nullcontext()
        with lock_cm:
            t_lock_wait = time.monotonic() - _wt0
            _t0 = time.monotonic()
            # Modo default 'do_nothing': re-loads sao idempotentes sem custo
            # de UPDATE (qoe_latency tem 138 cols, DO UPDATE SET col=EXCLUDED
            # em todas e' caro a' toa). 'do_update' so' faz sentido pra
            # preencher colunas novas em re-load apos schema bump.
            if conflict_target is not None:
                if settings.OOKLA_UPSERT_MODE == "do_update":
                    key_set = {_unquote(k) for k in entity_map.key}
                    update_cols = [c for c in keep_target if _unquote(c) not in key_set]
                    set_clause = sql.SQL(", ").join(
                        sql.SQL("{c} = EXCLUDED.{c}").format(c=sql.SQL(c))
                        for c in update_cols
                    )
                    conflict_clause = sql.SQL(
                        "ON CONFLICT {target} DO UPDATE SET {sets}"
                    ).format(target=sql.SQL(conflict_target), sets=set_clause)
                else:
                    conflict_clause = sql.SQL(
                        "ON CONFLICT {target} DO NOTHING"
                    ).format(target=sql.SQL(conflict_target))
                cur.execute(
                    sql.SQL(
                        "INSERT INTO {tgt} ({cols}) SELECT {cols} FROM {stg} {conflict}"
                    ).format(
                        tgt=target_sql,
                        cols=col_idents,
                        stg=stg_ident,
                        conflict=conflict_clause,
                    )
                )
            else:
                cur.execute(
                    sql.SQL(
                        "INSERT INTO {tgt} ({cols}) SELECT {cols} FROM {stg}"
                    ).format(tgt=target_sql, cols=col_idents, stg=stg_ident)
                )
            rows_affected = cur.rowcount or 0
            conn.commit()
        t_insert = time.monotonic() - _t0
        if t_insert > 0 and total_staged > 0:
            rows_per_sec_insert = total_staged / t_insert

        # DROP fora da lock, em tx propria (commit acima ja' fechou a tx do
        # INSERT). Se chegamos aqui o INSERT foi sucesso; staging ainda
        # existe ate' o DROP. Em caso de excecao no INSERT, o rollback do
        # retry-loop limpa via DROP IF EXISTS no proximo attempt.
        _t0 = time.monotonic()
        cur.execute(sql.SQL("DROP TABLE IF EXISTS {stg}").format(stg=stg_ident))
        conn.commit()
        t_drop = time.monotonic() - _t0

    if skipped_null:
        log.warning(
            "%s: %d linha(s) descartadas por NULL em coluna NOT NULL",
            label,
            skipped_null,
        )
    # rows_affected:
    #   - DO NOTHING: so' linhas inseridas (novas).
    #   - DO UPDATE:  inseridas + atualizadas (indistinguiveis sem custo extra).
    #   - INSERT puro: inseridas.
    if conflict_target:
        mode = "UPSERT" if settings.OOKLA_UPSERT_MODE == "do_update" else "INSERT-IGNORE"
    else:
        mode = "INSERT puro"
    log.info(
        "%s: parquet=%d staging=%d afetadas=%d em %s (%s)",
        label,
        total_in,
        total_staged,
        rows_affected,
        target_table,
        mode,
    )
    log.info(
        "%s: timing[ms] create=%.0f copy=%.0f (py=%.0f, %.0f rows/s) "
        "lock_wait=%.0f insert=%.0f (%.0f rows/s) drop=%.0f total=%.0f",
        label,
        t_create * 1000,
        t_copy * 1000,
        copy_py_overhead * 1000,
        rows_per_sec_copy,
        t_lock_wait * 1000,
        t_insert * 1000,
        rows_per_sec_insert,
        t_drop * 1000,
        (t_create + t_copy + t_lock_wait + t_insert + t_drop) * 1000,
    )
    return int(rows_affected)


# ---------------------------------------------------------------------------
# Coerção valor parquet -> valor aceito pelo COPY
# ---------------------------------------------------------------------------


_TEXT_UDTS = frozenset({"text", "varchar", "bpchar"})


def _udt_for_psycopg(udt: str) -> str:
    """Converte udt_name do information_schema para o nome usado pelo
    type registry do psycopg.

    Postgres usa prefixo '_' p/ tipos array em pg_type/udt_name (ex.: _inet,
    _text, _int4). O registry do psycopg, porem, e' indexado por nome SQL
    canonico (ex.: 'inet[]', 'text[]'). Sem essa traducao, set_types levanta
    KeyError em qualquer coluna array.
    """
    if udt.startswith("_") and len(udt) > 1:
        return udt[1:] + "[]"
    return udt


def _build_coercer(
    pq_type: pa.DataType, meta: TargetMeta, use_binary: bool
) -> Callable[[Any], Any] | None:
    """Devolve coercer pra uma coluna ou None (= pass-through).

    Decisao baseada no tipo do parquet (que determina o tipo Python que
    `to_pylist()` produzira) cruzado com o UDT do alvo. Para colunas
    triviais (numericas, bool, decimal -> int/float/Decimal), retorna None
    e o hot loop pula a chamada de funcao por celula.

    Ordem das coercoes preserva a do _coerce monolitico antigo:
      1. list -> json.dumps  (para parquet list<X>)
      2. naive datetime -> utc-aware
      3. string + target _inet/inet -> conversao
      4. string vazia + target nao-text -> NULL
    """
    udt = meta.udt

    is_list = (
        pa.types.is_list(pq_type)
        or pa.types.is_large_list(pq_type)
        or pa.types.is_fixed_size_list(pq_type)
    )
    if is_list:
        def coerce_list(v: Any) -> Any:
            if v is None:
                return None
            return json.dumps(v, default=_json_default, ensure_ascii=False)
        return coerce_list

    if pa.types.is_timestamp(pq_type) and pq_type.tz is None:
        def coerce_naive_ts(v: Any) -> Any:
            if v is None:
                return None
            return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v
        return coerce_naive_ts

    is_string = pa.types.is_string(pq_type) or pa.types.is_large_string(pq_type)
    if is_string:
        if udt == "_inet":
            if use_binary:
                def coerce_inet_array_bin(v: Any) -> Any:
                    return _str_to_inet_list(v) if v is not None else None
                return coerce_inet_array_bin

            def coerce_inet_array_txt(v: Any) -> Any:
                return _str_to_pg_inet_array(v) if v is not None else None
            return coerce_inet_array_txt

        if udt == "inet":
            if use_binary:
                def coerce_inet_bin(v: Any) -> Any:
                    return _str_to_inet(v) if v is not None else None
                return coerce_inet_bin

            def coerce_inet_txt(v: Any) -> Any:
                if v is None:
                    return None
                return v or None
            return coerce_inet_txt

        if udt not in _TEXT_UDTS:
            # String em alvo nao-textual: vazio vira NULL pra evitar erro de
            # cast no COPY (ex: "" em coluna numeric).
            def coerce_empty_to_null(v: Any) -> Any:
                if v is None:
                    return None
                return None if v == "" else v
            return coerce_empty_to_null

        # String em alvo textual: pass-through.
        return None

    # Demais tipos parquet (int*, float*, decimal*, bool, binary, ...): pass-through.
    return None


def _str_to_pg_inet_array(value: str) -> str | None:
    """TEXT mode: '{ip1,ip2}' literal pra Postgres parsear na coluna inet[]."""
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


def _str_to_inet(value: str) -> Any | None:
    """BINARY mode: str -> IPv4Address/IPv6Address (com fallback /32 ou /128)."""
    s = value.strip()
    if not s:
        return None
    try:
        return ipaddress.ip_address(s)
    except ValueError:
        try:
            return ipaddress.ip_interface(s)
        except ValueError:
            return None


def _str_to_inet_list(value: str) -> list | None:
    """BINARY mode: '[ip1, ip2]' -> list[IPv4Address|IPv6Address|Interface]."""
    s = value.strip()
    if not s:
        return None
    if s.startswith("[") and s.endswith("]"):
        s = s[1:-1]
    parts = [p.strip().strip('"').strip("'") for p in s.split(",")]
    parts = [p for p in parts if p]
    if not parts:
        return None
    out: list = []
    for p in parts:
        ip = _str_to_inet(p)
        if ip is not None:
            out.append(ip)
    return out or None


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


def _conflict_target_for(
    conn: Connection, table_name: str, columns: tuple[str, ...]
) -> str | None:
    """Devolve o ON CONFLICT target SQL fragment para o unique index do alvo
    cujas colunas batem com `columns`, OU None se não houver match.

    Inclui o WHERE predicate quando o índice é parcial — necessário pra
    Postgres aceitar como conflict_target em INSERT ... ON CONFLICT DO UPDATE.

    Ex.: '(guid_result, ts_result) WHERE (guid_result IS NOT NULL)'
    """
    if not columns:
        return None
    want = set(columns)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT array_agg(a.attname ORDER BY a.attnum),
                   pg_get_expr(i.indpred, i.indrelid)
              FROM pg_index i
              JOIN pg_class c ON c.oid = i.indrelid
              JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
             WHERE c.relname = %s AND i.indisunique
             GROUP BY i.indexrelid, i.indpred, i.indrelid
            """,
            (table_name,),
        )
        for cols, pred in cur.fetchall():
            if set(cols) == want:
                target = "(" + ", ".join(f'"{c}"' for c in cols) + ")"
                if pred:
                    target += f" WHERE {pred}"
                return target
    return None


def _unquote(ident: str) -> str:
    if ident.startswith('"') and ident.endswith('"'):
        return ident[1:-1]
    return ident
