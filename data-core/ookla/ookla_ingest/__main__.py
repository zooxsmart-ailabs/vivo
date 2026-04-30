from __future__ import annotations

from typing import Any

import click

from .catalog import print_status, run_catalog
from .loader import run_load
from .path_parser import TARGET_ENTITIES
from .sniff import sniff_entity
from .telemetry import setup_telemetry


@click.group()
def cli() -> None:
    """Ingestão Ookla — catálogo (Fase 1) + carga dia-a-dia (Fase 2)."""
    # Configura logging (JSON ou plain) e, se OTEL_ENABLED, traces+metrics.
    setup_telemetry()


@cli.command()
def catalog() -> None:
    """Fase 1 — descobre arquivos disponíveis e popula `ookla_catalog`."""
    run_catalog()


_LOAD_OPTIONS: list[Any] = [
    click.option("--max-days", type=int, default=None, help="Limita N dias por fase (debug)."),
    click.option(
        "--retry-failed",
        is_flag=True,
        help="Inclui arquivos com status='failed' (até OOKLA_MAX_ATTEMPTS).",
    ),
    click.option(
        "--include-latency",
        is_flag=True,
        default=False,
        help="Habilita carga de QoELatency (default: desligado, dado o volume).",
    ),
    click.option(
        "--latency-days",
        type=int,
        default=1,
        show_default=True,
        help="Quando --include-latency, carrega só os N primeiros dias de latency.",
    ),
    click.option(
        "--target-only",
        is_flag=True,
        default=False,
        help="Roda só a Fase 1 (entidades target). Pula upload S3 das demais.",
    ),
    click.option(
        "--non-target-only",
        is_flag=True,
        default=False,
        help="Roda só a Fase 2 (não-target → S3). Pula a Fase 1 inteira.",
    ),
    click.option(
        "--upsert-mode",
        type=click.Choice(["do_nothing", "do_update"]),
        default=None,
        help=(
            "Sobrepõe OOKLA_UPSERT_MODE. 'do_nothing' (default) para re-loads "
            "idempotentes baratos; 'do_update' para preencher colunas novas após "
            "schema bump (custoso em tabelas largas)."
        ),
    ),
    click.option(
        "--skip-s3/--no-skip-s3",
        default=None,
        help=(
            "Pula upload S3 (target: so' DB; non-target: pula a fase inteira). "
            "Sobrescreve OOKLA_SKIP_S3. Util pra acelerar backfill quando o S3 "
            "ja' foi populado ou nao e' requisito."
        ),
    ),
]


def _apply_load_options(fn: Any) -> Any:
    for option in reversed(_LOAD_OPTIONS):
        fn = option(fn)
    return fn


def _do_load(
    *,
    max_days: int | None,
    retry_failed: bool,
    include_latency: bool,
    latency_days: int,
    target_only: bool,
    non_target_only: bool,
    upsert_mode: str | None,
    skip_s3: bool | None,
) -> None:
    if upsert_mode is not None:
        from .settings import settings as _s

        _s.OOKLA_UPSERT_MODE = upsert_mode  # type: ignore[assignment]
    run_load(
        max_days=max_days,
        retry_failed=retry_failed,
        include_latency=include_latency,
        latency_days=latency_days,
        target_only=target_only,
        non_target_only=non_target_only,
        skip_s3=skip_s3,
    )


@cli.command()
@_apply_load_options
@click.option(
    "--refresh-catalog",
    is_flag=True,
    default=False,
    help=(
        "Roda Fase 1 (catalog) imediatamente antes do load. Reduz arquivos "
        "expirados quando o catalogo esta defasado vs. janela rolante da API."
    ),
)
def load(
    max_days: int | None,
    retry_failed: bool,
    include_latency: bool,
    latency_days: int,
    target_only: bool,
    non_target_only: bool,
    upsert_mode: str | None,
    skip_s3: bool | None,
    refresh_catalog: bool,
) -> None:
    """Fase 2 do pipeline — em 2 sub-fases.

    Sub-fase 1 (target): entidades 5 + opcional QoELatency. Pipeline completo
    (download → S3 → COPY Postgres → delete) com workers paralelos.

    Sub-fase 2 (não-target): entidades fora do alvo. Apenas upload S3 + delete.
    Pulada com --target-only.

    Cada arquivo é processado de ponta-a-ponta por um worker; até
    OOKLA_PARALLEL_DOWNLOADS arquivos em paralelo por dia.
    """
    if refresh_catalog:
        run_catalog()
    _do_load(
        max_days=max_days,
        retry_failed=retry_failed,
        include_latency=include_latency,
        latency_days=latency_days,
        target_only=target_only,
        non_target_only=non_target_only,
        upsert_mode=upsert_mode,
        skip_s3=skip_s3,
    )


@cli.command()
@_apply_load_options
def ingest(
    max_days: int | None,
    retry_failed: bool,
    include_latency: bool,
    latency_days: int,
    target_only: bool,
    non_target_only: bool,
    upsert_mode: str | None,
    skip_s3: bool | None,
) -> None:
    """One-shot: catalog + load no mesmo run.

    Equivalente a `catalog && load --refresh-catalog`. Recomendado pra
    rotinas agendadas — minimiza a janela entre descobrir o arquivo na API
    e baixa-lo, reduzindo OoklaFileExpired.
    """
    run_catalog()
    _do_load(
        max_days=max_days,
        retry_failed=retry_failed,
        include_latency=include_latency,
        latency_days=latency_days,
        target_only=target_only,
        non_target_only=non_target_only,
        upsert_mode=upsert_mode,
        skip_s3=skip_s3,
    )


@cli.command()
@click.option(
    "--entity",
    type=click.Choice(sorted(TARGET_ENTITIES)),
    required=True,
    help="Entidade Ookla a inspecionar.",
)
@click.option("--sample-rows", type=int, default=5)
def sniff(entity: str, sample_rows: int) -> None:
    """Baixa 1 arquivo, imprime header + amostra (não toca o DB)."""
    sniff_entity(entity, sample_rows=sample_rows)


@cli.command()
def status() -> None:
    """Resumo do estado de catálogo/carga e últimas execuções."""
    print_status()


if __name__ == "__main__":
    cli()
