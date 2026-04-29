from __future__ import annotations

import logging
import sys

import click

from .catalog import print_status, run_catalog
from .loader import run_load
from .path_parser import TARGET_ENTITIES
from .sniff import sniff_entity


def _setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
    )


@click.group()
def cli() -> None:
    """Ingestão Ookla — catálogo (Fase 1) + carga dia-a-dia (Fase 2)."""
    _setup_logging()


@cli.command()
def catalog() -> None:
    """Fase 1 — descobre arquivos disponíveis e popula `ookla_catalog`."""
    run_catalog()


@cli.command()
@click.option("--max-days", type=int, default=None, help="Limita N dias (debug).")
@click.option(
    "--retry-failed",
    is_flag=True,
    help="Inclui arquivos com status='failed' (até OOKLA_MAX_ATTEMPTS).",
)
@click.option(
    "--include-latency",
    is_flag=True,
    default=False,
    help="Habilita carga de QoELatency (default: desligado, dado o volume).",
)
@click.option(
    "--latency-days",
    type=int,
    default=1,
    show_default=True,
    help="Quando --include-latency, carrega só os N primeiros dias de latency.",
)
def load(
    max_days: int | None,
    retry_failed: bool,
    include_latency: bool,
    latency_days: int,
) -> None:
    """Fase 2 — baixa, sobe S3 e carrega Postgres dia-a-dia.

    Fluxo por arquivo: download local -> upload s3 -> COPY postgres
    (se entidade alvo) -> delete local.
    """
    run_load(
        max_days=max_days,
        retry_failed=retry_failed,
        include_latency=include_latency,
        latency_days=latency_days,
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
